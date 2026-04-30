import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, Repository } from 'typeorm';

import { CacheKey, CacheTTL } from '@common/constants/cache-key';
import { RedisService } from '@shared/redis/redis.service';
import { MinioService } from '@shared/minio/minio.service';

import { OrderService } from '@modules/order/order.service';
import { DashboardService } from '@modules/dashboard/dashboard.service';
import { CartEntity } from '@modules/cart/entities/cart.entity';
import { OperationLogEntity } from '@modules/system/entities/operation-log.entity';

interface CartRedisItem {
  qty: number;
  selected: number;
  addedAt: number;
}

/** 所有定时任务统一前缀的锁 key（多实例只跑一次） */
const TASK_LOCK_PREFIX = 'task';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly minio: MinioService,
    private readonly orderSvc: OrderService,
    private readonly dashboardSvc: DashboardService,
    private readonly ds: DataSource,
    @InjectRepository(CartEntity)
    private readonly cartRepo: Repository<CartEntity>,
    @InjectRepository(OperationLogEntity)
    private readonly opLogRepo: Repository<OperationLogEntity>,
  ) {}

  /** 1) 订单超时取消（每分钟） */
  @Cron(CronExpression.EVERY_MINUTE, { name: 'order-timeout-cancel' })
  async orderTimeoutCancel() {
    await this.withLock('order-timeout', 50, async () => {
      const ids = await this.orderSvc.findTimeoutPendingPayIds(200);
      if (!ids.length) return;
      this.logger.log(`订单超时取消：${ids.length} 单`);
      let ok = 0;
      let fail = 0;
      for (const id of ids) {
        try {
          await this.orderSvc.cancelBySystem(id);
          ok++;
        } catch (e) {
          fail++;
          this.logger.warn(
            `订单 #${id} 自动取消失败：${(e as Error).message}`,
          );
        }
      }
      this.logger.log(`订单超时取消完成：成功 ${ok} / 失败 ${fail}`);
    });
  }

  /** 2) 购物车 Redis → MySQL 同步（每小时） */
  @Cron(CronExpression.EVERY_HOUR, { name: 'cart-sync' })
  async cartSync() {
    await this.withLock('cart-sync', 600, async () => {
      const dirtyUsers = await this.redis.smembers(CacheKey.cartDirty);
      if (!dirtyUsers.length) return;
      this.logger.log(`购物车同步：${dirtyUsers.length} 个用户`);

      let synced = 0;
      for (const userIdStr of dirtyUsers) {
        const userId = Number(userIdStr);
        if (!Number.isInteger(userId) || userId <= 0) {
          await this.redis.srem(CacheKey.cartDirty, userIdStr);
          continue;
        }
        try {
          await this.syncOneUserCart(userId);
          await this.redis.srem(CacheKey.cartDirty, userIdStr);
          synced++;
        } catch (e) {
          this.logger.warn(
            `用户 ${userId} 购物车同步失败：${(e as Error).message}`,
          );
        }
      }
      this.logger.log(`购物车同步完成：${synced} 个用户`);
    });
  }

  /** 3) 仪表盘统计预热（每 10 分钟） */
  @Cron('*/10 * * * *', { name: 'dashboard-preheat' })
  async dashboardPreheat() {
    await this.withLock('dashboard-preheat', 60, async () => {
      await this.dashboardSvc.refresh();
      this.logger.log('仪表盘预热完成');
    });
  }

  /** 4) 操作日志清理（每天 03:13） */
  @Cron('13 3 * * *', { name: 'op-log-cleanup' })
  async cleanupOperationLogs() {
    await this.withLock('op-log-cleanup', 600, async () => {
      const before = new Date();
      before.setDate(before.getDate() - 90);
      const res = await this.opLogRepo.delete({ createdAt: LessThan(before) });
      this.logger.log(`操作日志清理：删除 ${res.affected ?? 0} 条`);
    });
  }

  /** 5) 临时上传文件清理（每天 04:17） */
  @Cron('17 4 * * *', { name: 'temp-upload-cleanup' })
  async cleanupTempUploads() {
    await this.withLock('temp-upload-cleanup', 600, async () => {
      const keys = await this.redis.scanKeys('upload:temp:*');
      if (!keys.length) return;
      let removed = 0;
      for (const key of keys) {
        const ts = await this.redis.get(key);
        if (!ts) continue;
        // 仅清理超过 24h 仍未被业务认领的临时对象
        if (Date.now() - Number(ts) < 24 * 60 * 60 * 1000) continue;
        const objectName = key.substring('upload:temp:'.length);
        try {
          await this.minio.remove(objectName);
        } catch {
          /* 对象可能已不存在，忽略 */
        }
        await this.redis.del(key);
        removed++;
      }
      this.logger.log(`临时上传文件清理：${removed} 个`);
    });
  }

  // ==================== 工具 ====================

  private async withLock(name: string, ttl: number, fn: () => Promise<void>) {
    const lockKey = CacheKey.lock(`${TASK_LOCK_PREFIX}:${name}`);
    const token = await this.redis.tryLock(lockKey, ttl);
    if (!token) {
      this.logger.debug(`任务 ${name} 已被其他实例持有，跳过`);
      return;
    }
    try {
      await fn();
    } catch (e) {
      this.logger.error(`任务 ${name} 异常：${(e as Error).message}`);
    } finally {
      await this.redis.unlock(lockKey, token);
    }
  }

  /**
   * 同步单个用户的购物车：Redis Hash 全量覆盖 MySQL（删除→插入，避免脏数据）
   * 用 cart 表是「容灾备份」用途：Redis 丢失时仍能恢复
   */
  private async syncOneUserCart(userId: number) {
    const map = await this.redis.hgetall(CacheKey.cart(userId));
    const items: Array<{ skuId: number; v: CartRedisItem }> = [];
    for (const [field, raw] of Object.entries(map)) {
      const skuId = Number(field);
      if (!Number.isInteger(skuId) || skuId <= 0) continue;
      try {
        const v = JSON.parse(raw) as Partial<CartRedisItem>;
        items.push({
          skuId,
          v: {
            qty: Math.max(1, Math.min(999, Number(v.qty) || 1)),
            selected: v.selected === 0 ? 0 : 1,
            addedAt: Number(v.addedAt) || Date.now(),
          },
        });
      } catch {
        continue;
      }
    }

    await this.ds.transaction(async (m) => {
      const repo = m.getRepository(CartEntity);
      // 容灾备份策略：单个用户购物车量小，全量覆盖（删除 + 插入）
      await repo.delete({ userId });
      if (!items.length) return;
      const rows = items.map((it) =>
        repo.create({
          userId,
          skuId: it.skuId,
          quantity: it.v.qty,
          selected: it.v.selected,
        }),
      );
      await repo.save(rows);
    });
  }
}
