import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';

import { CacheKey, CacheTTL } from '@common/constants/cache-key';
import { RedisService } from '@shared/redis/redis.service';

import { OrderEntity } from '@modules/order/entities/order.entity';
import { OrderItemEntity } from '@modules/order/entities/order-item.entity';
import { GoodsEntity } from '@modules/goods/entities/goods.entity';
import { GoodsSpecEntity } from '@modules/goods/entities/goods-spec.entity';
import { CategoryEntity } from '@modules/category/entities/category.entity';

/** 订单状态：0 待付款 1 待发货 2 待收货 3 已完成 4 已取消 */
const PAID_STATUSES = [1, 2, 3];

export interface DashboardOverview {
  todayOrderCount: number;
  todayOrderAmount: string;
  pendingShipCount: number;
  onSaleGoodsCount: number;
  lowStockCount: number;
  totalUserCount: number;
  todayNewUserCount: number;
}

export interface TrendPoint {
  date: string;
  orderCount: number;
  amount: string;
}

export interface CategoryShare {
  categoryId: number;
  categoryName: string;
  amount: string;
  ratio: number;
}

export interface TopGoods {
  goodsId: number;
  goodsName: string;
  totalQty: number;
  totalAmount: string;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly redis: RedisService,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly itemRepo: Repository<OrderItemEntity>,
    @InjectRepository(GoodsEntity)
    private readonly goodsRepo: Repository<GoodsEntity>,
    @InjectRepository(GoodsSpecEntity)
    private readonly skuRepo: Repository<GoodsSpecEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
  ) {}

  // ==================== 对外接口 ====================

  async overview(): Promise<DashboardOverview> {
    const cached = await this.redis.getJson<DashboardOverview>(
      CacheKey.dashboardOverview,
    );
    if (cached) return cached;
    const data = await this.buildOverview();
    await this.redis.setJson(
      CacheKey.dashboardOverview,
      data,
      CacheTTL.DASHBOARD,
    );
    return data;
  }

  async trend(days = 30): Promise<TrendPoint[]> {
    const safeDays = Math.min(90, Math.max(7, days));
    const cached = await this.redis.getJson<TrendPoint[]>(
      CacheKey.dashboardTrend(safeDays),
    );
    if (cached) return cached;
    const data = await this.buildTrend(safeDays);
    await this.redis.setJson(
      CacheKey.dashboardTrend(safeDays),
      data,
      CacheTTL.DASHBOARD,
    );
    return data;
  }

  async categoryShare(): Promise<CategoryShare[]> {
    const cached = await this.redis.getJson<CategoryShare[]>(
      CacheKey.dashboardCategory,
    );
    if (cached) return cached;
    const data = await this.buildCategoryShare();
    await this.redis.setJson(
      CacheKey.dashboardCategory,
      data,
      CacheTTL.DASHBOARD,
    );
    return data;
  }

  async top10(): Promise<TopGoods[]> {
    const cached = await this.redis.getJson<TopGoods[]>(CacheKey.dashboardTop10);
    if (cached) return cached;
    const data = await this.buildTop10();
    await this.redis.setJson(
      CacheKey.dashboardTop10,
      data,
      CacheTTL.DASHBOARD,
    );
    return data;
  }

  /** 供定时任务调用：刷新所有统计 */
  async refresh(): Promise<void> {
    try {
      const [overview, trend, category, top] = await Promise.all([
        this.buildOverview(),
        this.buildTrend(30),
        this.buildCategoryShare(),
        this.buildTop10(),
      ]);
      await Promise.all([
        this.redis.setJson(
          CacheKey.dashboardOverview,
          overview,
          CacheTTL.DASHBOARD,
        ),
        this.redis.setJson(
          CacheKey.dashboardTrend(30),
          trend,
          CacheTTL.DASHBOARD,
        ),
        this.redis.setJson(
          CacheKey.dashboardCategory,
          category,
          CacheTTL.DASHBOARD,
        ),
        this.redis.setJson(CacheKey.dashboardTop10, top, CacheTTL.DASHBOARD),
      ]);
    } catch (e) {
      this.logger.error('Dashboard refresh failed: ' + (e as Error).message);
    }
  }

  // ==================== 内部构造 ====================

  private async buildOverview(): Promise<DashboardOverview> {
    const { start: todayStart, end: todayEnd } = this.dayRange(0);

    const todayOrderRaw = await this.orderRepo
      .createQueryBuilder('o')
      .select('COUNT(o.id)', 'cnt')
      .addSelect('COALESCE(SUM(o.pay_amount),0)', 'amount')
      .where('o.created_at >= :s AND o.created_at < :e', {
        s: todayStart,
        e: todayEnd,
      })
      .andWhere('o.status IN (:...st)', { st: PAID_STATUSES })
      .andWhere('o.deleted_at IS NULL')
      .getRawOne<{ cnt: string; amount: string }>();

    const pendingShipCount = await this.orderRepo.count({
      where: { status: 1, deletedAt: IsNull() },
    });

    const onSaleGoodsCount = await this.goodsRepo.count({
      where: { status: 1, deletedAt: IsNull() },
    });

    const lowStockCount = await this.skuRepo
      .createQueryBuilder('s')
      .where('s.stock <= s.stock_warning')
      .andWhere('s.deleted_at IS NULL')
      .getCount();

    const totalUserCount = await this.queryUserCount();
    const todayNewUserCount = await this.queryUserCount(todayStart, todayEnd);

    return {
      todayOrderCount: Number(todayOrderRaw?.cnt ?? 0),
      todayOrderAmount: this.toMoney(todayOrderRaw?.amount ?? '0'),
      pendingShipCount,
      onSaleGoodsCount,
      lowStockCount,
      totalUserCount,
      todayNewUserCount,
    };
  }

  private async buildTrend(days: number): Promise<TrendPoint[]> {
    const { start: from } = this.dayRange(-(days - 1));
    const { end: to } = this.dayRange(0);

    const rows = await this.orderRepo
      .createQueryBuilder('o')
      .select("DATE_FORMAT(o.created_at, '%Y-%m-%d')", 'date')
      .addSelect('COUNT(o.id)', 'cnt')
      .addSelect('COALESCE(SUM(o.pay_amount),0)', 'amount')
      .where('o.created_at >= :f AND o.created_at < :t', { f: from, t: to })
      .andWhere('o.status IN (:...st)', { st: PAID_STATUSES })
      .andWhere('o.deleted_at IS NULL')
      .groupBy('date')
      .getRawMany<{ date: string; cnt: string; amount: string }>();

    const map = new Map(rows.map((r) => [r.date, r]));
    const out: TrendPoint[] = [];
    for (let i = 0; i < days; i++) {
      const d = this.fmtDate(this.shiftDay(from, i));
      const r = map.get(d);
      out.push({
        date: d,
        orderCount: r ? Number(r.cnt) : 0,
        amount: this.toMoney(r?.amount ?? '0'),
      });
    }
    return out;
  }

  private async buildCategoryShare(): Promise<CategoryShare[]> {
    const { start: from } = this.dayRange(-29);
    const { end: to } = this.dayRange(0);

    const rows = await this.itemRepo
      .createQueryBuilder('it')
      .innerJoin(OrderEntity, 'o', 'o.id = it.order_id')
      .innerJoin(GoodsEntity, 'g', 'g.id = it.goods_id')
      .select('g.category_id', 'categoryId')
      .addSelect('COALESCE(SUM(it.subtotal),0)', 'amount')
      .where('o.created_at >= :f AND o.created_at < :t', { f: from, t: to })
      .andWhere('o.status IN (:...st)', { st: PAID_STATUSES })
      .andWhere('o.deleted_at IS NULL')
      .andWhere('it.deleted_at IS NULL')
      .groupBy('g.category_id')
      .getRawMany<{ categoryId: number; amount: string }>();

    if (!rows.length) return [];
    const total = rows.reduce((s, r) => s + Number(r.amount), 0);
    const cats = await this.categoryRepo.find();
    const cmap = new Map(cats.map((c) => [c.id, c.name]));

    return rows
      .map((r) => ({
        categoryId: Number(r.categoryId),
        categoryName: cmap.get(Number(r.categoryId)) ?? `分类#${r.categoryId}`,
        amount: this.toMoney(r.amount),
        ratio: total > 0 ? Math.round((Number(r.amount) / total) * 10000) / 100 : 0,
      }))
      .sort((a, b) => Number(b.amount) - Number(a.amount));
  }

  private async buildTop10(): Promise<TopGoods[]> {
    const { start: from } = this.dayRange(-29);
    const { end: to } = this.dayRange(0);

    const rows = await this.itemRepo
      .createQueryBuilder('it')
      .innerJoin(OrderEntity, 'o', 'o.id = it.order_id')
      .select('it.goods_id', 'goodsId')
      .addSelect('MAX(it.goods_name)', 'goodsName')
      .addSelect('SUM(it.quantity)', 'qty')
      .addSelect('COALESCE(SUM(it.subtotal),0)', 'amount')
      .where('o.created_at >= :f AND o.created_at < :t', { f: from, t: to })
      .andWhere('o.status IN (:...st)', { st: PAID_STATUSES })
      .andWhere('o.deleted_at IS NULL')
      .andWhere('it.deleted_at IS NULL')
      .groupBy('it.goods_id')
      .orderBy('qty', 'DESC')
      .limit(10)
      .getRawMany<{
        goodsId: number;
        goodsName: string;
        qty: string;
        amount: string;
      }>();

    return rows.map((r) => ({
      goodsId: Number(r.goodsId),
      goodsName: r.goodsName,
      totalQty: Number(r.qty),
      totalAmount: this.toMoney(r.amount),
    }));
  }

  private async queryUserCount(from?: Date, to?: Date): Promise<number> {
    // 用户表查询通过原生 SQL，避免对 user 模块产生硬依赖
    const params: any[] = [];
    let where = 'deleted_at IS NULL';
    if (from && to) {
      where += ' AND created_at >= ? AND created_at < ?';
      params.push(from, to);
    }
    try {
      const rows = await this.orderRepo.manager.query<{ cnt: number }[]>(
        `SELECT COUNT(*) AS cnt FROM users WHERE ${where}`,
        params,
      );
      return Number(rows?.[0]?.cnt ?? 0);
    } catch {
      return 0;
    }
  }

  // ==================== 工具 ====================

  private dayRange(offsetDay: number): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() + offsetDay);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  private shiftDay(base: Date, offset: number): Date {
    const d = new Date(base);
    d.setDate(d.getDate() + offset);
    return d;
  }

  private fmtDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private toMoney(s: string | number): string {
    return Number(s ?? 0).toFixed(2);
  }
}
