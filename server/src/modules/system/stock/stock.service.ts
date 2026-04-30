import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';

import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/constants/error-code';
import { CacheKey } from '@common/constants/cache-key';
import { CurrentUserPayload } from '@common/decorators/current-user.decorator';

import { RedisService } from '@shared/redis/redis.service';

import { GoodsEntity } from '@modules/goods/entities/goods.entity';
import { GoodsSpecEntity } from '@modules/goods/entities/goods-spec.entity';

import { StockLogEntity, StockAction } from './entities/stock-log.entity';
import {
  StockAdjustDto,
  StockLogQueryDto,
  StockWarningDto,
} from './dto/stock.dto';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(StockLogEntity)
    private readonly logRepo: Repository<StockLogEntity>,
    @InjectRepository(GoodsSpecEntity)
    private readonly skuRepo: Repository<GoodsSpecEntity>,
    @InjectRepository(GoodsEntity)
    private readonly goodsRepo: Repository<GoodsEntity>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly redis: RedisService,
  ) {}

  /** 库存调整（入库/出库），事务内完成 SKU 更新 + 流水写入 */
  async adjust(dto: StockAdjustDto, operator: CurrentUserPayload) {
    if (dto.change <= 0) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, 'change 必须 > 0');
    }
    return this.ds.transaction(async (m) => {
      const sku = await m.getRepository(GoodsSpecEntity).findOne({
        where: { id: dto.skuId, deletedAt: IsNull() },
        lock: { mode: 'pessimistic_write' },
      });
      if (!sku) throw new BusinessException(ErrorCode.SKU_NOT_FOUND);

      const change =
        dto.action === StockAction.IN ? dto.change : -dto.change;
      const next = sku.stock + change;
      if (next < 0) {
        throw new BusinessException(
          ErrorCode.STOCK_NOT_ENOUGH,
          `库存不足，当前 ${sku.stock}`,
        );
      }
      sku.stock = next;
      await m.getRepository(GoodsSpecEntity).save(sku);

      await m.getRepository(StockLogEntity).save(
        m.getRepository(StockLogEntity).create({
          goodsId: sku.goodsId,
          skuId: sku.id,
          action: dto.action,
          change,
          stockAfter: next,
          orderNo: '',
          operatorId: operator.id,
          operatorName: operator.username ?? '',
          remark: dto.remark ?? '',
        }),
      );

      // 清商品缓存
      await this.redis.del(CacheKey.goodsDetail(sku.goodsId));
      await this.redis.del(CacheKey.goodsSku(sku.goodsId));
      await this.redis.deleteByPattern('cache:goods:list:*');

      return { skuId: sku.id, stock: next };
    });
  }

  /** 修改单个 SKU 的库存预警阈值 */
  async setWarning(dto: StockWarningDto) {
    const sku = await this.skuRepo.findOne({
      where: { id: dto.skuId, deletedAt: IsNull() },
    });
    if (!sku) throw new BusinessException(ErrorCode.SKU_NOT_FOUND);
    sku.stockWarning = dto.stockWarning;
    await this.skuRepo.save(sku);
    await this.redis.del(CacheKey.goodsDetail(sku.goodsId));
    await this.redis.del(CacheKey.goodsSku(sku.goodsId));
    return { skuId: sku.id, stockWarning: dto.stockWarning };
  }

  /** 库存预警 SKU 列表（stock <= stock_warning 且 status=1）*/
  async warningList(limit = 50) {
    const skus = await this.skuRepo
      .createQueryBuilder('s')
      .innerJoin(GoodsEntity, 'g', 'g.id = s.goods_id AND g.deleted_at IS NULL')
      .where('s.deleted_at IS NULL')
      .andWhere('s.stock <= s.stock_warning')
      .andWhere('g.status = 1')
      .orderBy('s.stock', 'ASC')
      .limit(limit)
      .select([
        's.id AS id',
        's.goods_id AS goodsId',
        's.sku_no AS skuNo',
        's.spec_name AS specName',
        's.stock AS stock',
        's.stock_warning AS stockWarning',
        'g.name AS goodsName',
      ])
      .getRawMany();
    return skus;
  }

  /** 库存流水分页 */
  async logPage(query: StockLogQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const qb = this.logRepo
      .createQueryBuilder('l')
      .leftJoin(GoodsEntity, 'g', 'g.id = l.goods_id')
      .leftJoin(GoodsSpecEntity, 's', 's.id = l.sku_id')
      .select([
        'l.id AS id',
        'l.goods_id AS goodsId',
        'l.sku_id AS skuId',
        'l.action AS action',
        'l.change AS `change`',
        'l.stock_after AS stockAfter',
        'l.order_no AS orderNo',
        'l.operator_id AS operatorId',
        'l.operator_name AS operatorName',
        'l.remark AS remark',
        'l.created_at AS createdAt',
        'g.name AS goodsName',
        's.attr_text AS skuAttrText',
        's.sku_no AS skuNo',
      ]);

    if (query.goodsId !== undefined) qb.andWhere('l.goods_id = :gid', { gid: query.goodsId });
    if (query.skuId !== undefined) qb.andWhere('l.sku_id = :sid', { sid: query.skuId });
    if (query.action !== undefined) qb.andWhere('l.action = :act', { act: query.action });
    if (query.orderNo) qb.andWhere('l.order_no = :ono', { ono: query.orderNo });
    if (query.keyword) {
      qb.andWhere('(g.name LIKE :kw OR s.sku_no LIKE :kw)', { kw: `%${query.keyword}%` });
    }
    // type=in/out/adjust/order/cancel → 映射回 action 数字
    if (query.type) {
      const map: Record<string, number> = {
        in: StockAction.IN,
        out: StockAction.OUT,
        adjust: StockAction.IN, // adjust 等价 in/out 任一，默认按 in；下方再用 OR 处理
        order: StockAction.ORDER_DEDUCT,
        cancel: StockAction.ORDER_REVERT,
      };
      if (query.type === 'adjust') {
        qb.andWhere('l.action IN (:...acts)', {
          acts: [StockAction.IN, StockAction.OUT],
        });
      } else if (map[query.type] !== undefined) {
        qb.andWhere('l.action = :tact', { tact: map[query.type] });
      }
    }
    if (query.startDate) qb.andWhere('l.created_at >= :sd', { sd: `${query.startDate} 00:00:00` });
    if (query.endDate) qb.andWhere('l.created_at <= :ed', { ed: `${query.endDate} 23:59:59` });

    qb.orderBy('l.id', 'DESC')
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    const [rows, total] = await Promise.all([
      qb.getRawMany<{
        id: number;
        goodsId: number;
        skuId: number;
        action: number;
        change: number;
        stockAfter: number;
        orderNo: string;
        operatorId: number;
        operatorName: string;
        remark: string;
        createdAt: Date;
        goodsName: string | null;
        skuAttrText: string | null;
        skuNo: string | null;
      }>(),
      qb.getCount(),
    ]);

    const ACTION_TO_TYPE: Record<number, 'in' | 'out' | 'order' | 'cancel' | 'adjust'> = {
      [StockAction.IN]: 'in',
      [StockAction.OUT]: 'out',
      [StockAction.ORDER_DEDUCT]: 'order',
      [StockAction.ORDER_REVERT]: 'cancel',
      [StockAction.ORDER_SHIP]: 'order',
    };

    const list = rows.map((r) => {
      const change = Number(r.change);
      const stockAfter = Number(r.stockAfter);
      const skuAttr = r.skuAttrText && r.skuAttrText !== '__default__' ? r.skuAttrText : '';
      return {
        id: r.id,
        goodsId: r.goodsId,
        goodsName: r.goodsName ?? `商品#${r.goodsId}`,
        skuId: r.skuId,
        skuText: skuAttr || (r.skuNo ?? ''),
        type: ACTION_TO_TYPE[r.action] ?? 'adjust',
        changeQty: change,
        beforeStock: stockAfter - change,
        afterStock: stockAfter,
        remark: r.remark,
        operator: r.operatorName,
        createdAt: r.createdAt,
      };
    });

    return { list, total, page, pageSize };
  }

  /**
   * 内部 API：订单扣减 / 回滚 / 出库（由 Order 模块在事务内调用）
   * 注意：调用方需自行包在事务里，并传入 EntityManager
   *
   * @param items [{skuId, quantity}] 必须 quantity > 0
   * @param action StockAction.ORDER_DEDUCT | ORDER_REVERT | ORDER_SHIP
   * @param ctx 操作上下文（订单号 + 操作人）
   */
  async applyInTx(
    m: import('typeorm').EntityManager,
    items: Array<{ skuId: number; quantity: number; goodsId?: number }>,
    action: number,
    ctx: { orderNo: string; operatorId?: number; operatorName?: string; remark?: string },
  ): Promise<Array<{ skuId: number; goodsId: number; stockAfter: number }>> {
    if (!items.length) return [];
    const out: Array<{ skuId: number; goodsId: number; stockAfter: number }> = [];
    for (const it of items) {
      if (it.quantity <= 0) continue;
      const sku = await m.getRepository(GoodsSpecEntity).findOne({
        where: { id: it.skuId, deletedAt: IsNull() },
        lock: { mode: 'pessimistic_write' },
      });
      if (!sku) {
        throw new BusinessException(
          ErrorCode.SKU_NOT_FOUND,
          `SKU ${it.skuId} 不存在`,
        );
      }
      const isDeduct =
        action === StockAction.ORDER_DEDUCT || action === StockAction.OUT;
      const change = isDeduct ? -it.quantity : it.quantity;
      const next = sku.stock + change;
      if (next < 0) {
        throw new BusinessException(
          ErrorCode.STOCK_NOT_ENOUGH,
          `${sku.attrText || 'SKU'} 库存不足，剩 ${sku.stock}`,
        );
      }
      sku.stock = next;
      await m.getRepository(GoodsSpecEntity).save(sku);

      await m.getRepository(StockLogEntity).save(
        m.getRepository(StockLogEntity).create({
          goodsId: sku.goodsId,
          skuId: sku.id,
          action,
          change,
          stockAfter: next,
          orderNo: ctx.orderNo ?? '',
          operatorId: ctx.operatorId ?? 0,
          operatorName: ctx.operatorName ?? '',
          remark: ctx.remark ?? '',
        }),
      );
      out.push({ skuId: sku.id, goodsId: sku.goodsId, stockAfter: next });
    }
    return out;
  }

  /** 事务后清缓存（订单服务在 commit 后调用） */
  async invalidateAfterTx(goodsIds: number[]) {
    const uniq = Array.from(new Set(goodsIds));
    await Promise.all(
      uniq.flatMap((gid) => [
        this.redis.del(CacheKey.goodsDetail(gid)),
        this.redis.del(CacheKey.goodsSku(gid)),
      ]),
    );
    await this.redis.deleteByPattern('cache:goods:list:*');
  }
}
