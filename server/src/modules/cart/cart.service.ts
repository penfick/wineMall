import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';

import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/constants/error-code';
import { CacheKey } from '@common/constants/cache-key';

import { RedisService } from '@shared/redis/redis.service';

import { GoodsEntity } from '@modules/goods/entities/goods.entity';
import { GoodsSpecEntity } from '@modules/goods/entities/goods-spec.entity';
import { GoodsImageEntity } from '@modules/goods/entities/goods-image.entity';

import {
  CartAddDto,
  CartBatchSelectDto,
  CartRemoveBatchDto,
  CartSelectDto,
  CartUpdateQtyDto,
} from './dto/cart.dto';

interface CartItemValue {
  qty: number;
  selected: number;
  addedAt: number;
}

export interface CartItemView {
  skuId: number;
  goodsId: number;
  goodsName: string;
  imageUrl: string;
  specName: string;
  price: string;
  qty: number;
  selected: number;
  stock: number;
  /** 0=正常 1=已下架 2=已删除 3=库存不足 */
  invalidReason: 0 | 1 | 2 | 3;
  available: boolean;
  subtotal: string;
  addedAt: number;
}

@Injectable()
export class CartService {
  constructor(
    private readonly redis: RedisService,
    @InjectRepository(GoodsSpecEntity)
    private readonly skuRepo: Repository<GoodsSpecEntity>,
    @InjectRepository(GoodsEntity)
    private readonly goodsRepo: Repository<GoodsEntity>,
    @InjectRepository(GoodsImageEntity)
    private readonly imgRepo: Repository<GoodsImageEntity>,
  ) {}

  private key(userId: number) {
    return CacheKey.cart(userId);
  }

  private parse(raw: string | null | undefined): CartItemValue | null {
    if (!raw) return null;
    try {
      const v = JSON.parse(raw) as Partial<CartItemValue>;
      return {
        qty: Math.max(1, Math.min(999, Number(v.qty) || 1)),
        selected: v.selected === 0 ? 0 : 1,
        addedAt: Number(v.addedAt) || Date.now(),
      };
    } catch {
      return null;
    }
  }

  private async markDirty(userId: number) {
    await this.redis.sadd(CacheKey.cartDirty, String(userId));
  }

  /** 加入购物车（同 SKU 累加，超 999 拦截） */
  async add(userId: number, dto: CartAddDto) {
    const sku = await this.skuRepo.findOne({
      where: { id: dto.skuId, deletedAt: IsNull() },
    });
    if (!sku) throw new BusinessException(ErrorCode.SKU_NOT_FOUND);
    const goods = await this.goodsRepo.findOne({
      where: { id: sku.goodsId, deletedAt: IsNull() },
    });
    if (!goods) throw new BusinessException(ErrorCode.GOODS_NOT_FOUND);
    if (goods.status !== 1) {
      throw new BusinessException(ErrorCode.GOODS_OFF_SHELF);
    }

    const key = this.key(userId);
    const existing = this.parse(await this.redis.hget(key, String(dto.skuId)));
    const nextQty = Math.min(999, (existing?.qty ?? 0) + dto.quantity);
    if (nextQty > sku.stock) {
      throw new BusinessException(
        ErrorCode.STOCK_NOT_ENOUGH,
        `库存仅剩 ${sku.stock}`,
      );
    }
    const value: CartItemValue = {
      qty: nextQty,
      selected: existing?.selected ?? 1,
      addedAt: existing?.addedAt ?? Date.now(),
    };
    await this.redis.hset(key, String(dto.skuId), JSON.stringify(value));
    await this.markDirty(userId);
    return { skuId: dto.skuId, qty: nextQty };
  }

  /** 修改数量（绝对值）*/
  async updateQty(userId: number, dto: CartUpdateQtyDto) {
    const key = this.key(userId);
    const raw = this.parse(await this.redis.hget(key, String(dto.skuId)));
    if (!raw) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);

    const sku = await this.skuRepo.findOne({
      where: { id: dto.skuId, deletedAt: IsNull() },
    });
    if (!sku) throw new BusinessException(ErrorCode.SKU_NOT_FOUND);
    if (dto.quantity > sku.stock) {
      throw new BusinessException(
        ErrorCode.STOCK_NOT_ENOUGH,
        `库存仅剩 ${sku.stock}`,
      );
    }
    raw.qty = dto.quantity;
    await this.redis.hset(key, String(dto.skuId), JSON.stringify(raw));
    await this.markDirty(userId);
    return { skuId: dto.skuId, qty: dto.quantity };
  }

  /** 选中 / 取消选中 */
  async setSelected(userId: number, dto: CartSelectDto) {
    const key = this.key(userId);
    const raw = this.parse(await this.redis.hget(key, String(dto.skuId)));
    if (!raw) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
    raw.selected = dto.selected;
    await this.redis.hset(key, String(dto.skuId), JSON.stringify(raw));
    await this.markDirty(userId);
    return { skuId: dto.skuId, selected: dto.selected };
  }

  /** 批量选中 / 取消（空数组表示全部）*/
  async batchSelect(userId: number, dto: CartBatchSelectDto) {
    const key = this.key(userId);
    const all = await this.redis.hgetall(key);
    const fields = dto.skuIds.length
      ? dto.skuIds.map(String).filter((f) => f in all)
      : Object.keys(all);
    const writes: Array<Promise<void>> = [];
    for (const f of fields) {
      const v = this.parse(all[f]);
      if (!v) continue;
      v.selected = dto.selected;
      writes.push(this.redis.hset(key, f, JSON.stringify(v)));
    }
    await Promise.all(writes);
    await this.markDirty(userId);
    return { affected: fields.length, selected: dto.selected };
  }

  /** 全选 / 全不选（语法糖） */
  async selectAll(userId: number, selected: number) {
    return this.batchSelect(userId, { skuIds: [], selected });
  }

  async remove(userId: number, skuId: number) {
    const removed = await this.redis.hdel(this.key(userId), String(skuId));
    await this.markDirty(userId);
    return { removed };
  }

  async batchRemove(userId: number, dto: CartRemoveBatchDto) {
    if (!dto.skuIds.length) return { removed: 0 };
    const removed = await this.redis.hdel(
      this.key(userId),
      ...dto.skuIds.map(String),
    );
    await this.markDirty(userId);
    return { removed };
  }

  async clear(userId: number) {
    await this.redis.del(this.key(userId));
    await this.markDirty(userId);
    return { ok: true };
  }

  /** 列表 + 失效校验 */
  async list(userId: number): Promise<{
    list: CartItemView[];
    total: number;
    selectedCount: number;
    selectedAmount: string;
    hasInvalid: boolean;
  }> {
    const map = await this.redis.hgetall(this.key(userId));
    const entries: Array<{ skuId: number; v: CartItemValue }> = [];
    for (const [field, raw] of Object.entries(map)) {
      const v = this.parse(raw);
      const skuId = Number(field);
      if (!v || !Number.isInteger(skuId) || skuId <= 0) continue;
      entries.push({ skuId, v });
    }
    if (!entries.length) {
      return {
        list: [],
        total: 0,
        selectedCount: 0,
        selectedAmount: '0.00',
        hasInvalid: false,
      };
    }

    entries.sort((a, b) => b.v.addedAt - a.v.addedAt);
    const skuIds = entries.map((e) => e.skuId);

    const skus = await this.skuRepo.find({
      where: { id: In(skuIds), deletedAt: IsNull() },
    });
    const skuMap = new Map(skus.map((s) => [s.id, s]));
    const goodsIds = Array.from(new Set(skus.map((s) => s.goodsId)));

    const [goodsList, covers] = await Promise.all([
      goodsIds.length
        ? this.goodsRepo.find({
            where: { id: In(goodsIds), deletedAt: IsNull() },
          })
        : Promise.resolve([]),
      goodsIds.length ? this.fetchCovers(goodsIds) : Promise.resolve(new Map()),
    ]);
    const goodsMap = new Map(goodsList.map((g) => [g.id, g]));

    const list: CartItemView[] = [];
    let hasInvalid = false;
    let selectedCount = 0;
    let selectedAmountCents = 0;

    for (const { skuId, v } of entries) {
      const sku = skuMap.get(skuId);
      const goods = sku ? goodsMap.get(sku.goodsId) : undefined;
      let invalidReason: CartItemView['invalidReason'] = 0;
      if (!sku) invalidReason = 2;
      else if (!goods) invalidReason = 2;
      else if (goods.status !== 1) invalidReason = 1;
      else if (sku.stock < v.qty) invalidReason = 3;

      const available = invalidReason === 0;
      if (!available) hasInvalid = true;

      const price = sku?.price ?? '0.00';
      const subtotalCents = Math.round(parseFloat(price) * 100) * v.qty;

      if (available && v.selected === 1) {
        selectedCount += v.qty;
        selectedAmountCents += subtotalCents;
      }

      list.push({
        skuId,
        goodsId: sku?.goodsId ?? 0,
        goodsName: goods?.name ?? '该商品已下架或删除',
        imageUrl: covers.get(sku?.goodsId ?? 0) ?? '',
        specName: sku?.attrText ?? '',
        price,
        qty: v.qty,
        selected: v.selected,
        stock: sku?.stock ?? 0,
        invalidReason,
        available,
        subtotal: (subtotalCents / 100).toFixed(2),
        addedAt: v.addedAt,
      });
    }

    return {
      list,
      total: list.length,
      selectedCount,
      selectedAmount: (selectedAmountCents / 100).toFixed(2),
      hasInvalid,
    };
  }

  /** 内部：批量取首图（按 goodsId MIN(id)） */
  private async fetchCovers(goodsIds: number[]): Promise<Map<number, string>> {
    const rows = await this.imgRepo
      .createQueryBuilder('i')
      .select('i.goods_id', 'goodsId')
      .addSelect('MIN(i.id)', 'imgId')
      .where('i.goods_id IN (:...ids)', { ids: goodsIds })
      .groupBy('i.goods_id')
      .getRawMany<{ goodsId: number; imgId: number }>();
    if (!rows.length) return new Map();
    const ids = rows.map((r) => Number(r.imgId));
    const imgs = await this.imgRepo.find({ where: { id: In(ids) } });
    const imgMap = new Map(imgs.map((i) => [i.id, i.imageUrl]));
    const out = new Map<number, string>();
    for (const r of rows) {
      const url = imgMap.get(Number(r.imgId));
      if (url) out.set(Number(r.goodsId), url);
    }
    return out;
  }

  /** 仅返回总件数（用于 TabBar 角标） */
  async count(userId: number): Promise<{ count: number }> {
    const map = await this.redis.hgetall(this.key(userId));
    let count = 0;
    for (const raw of Object.values(map)) {
      const v = this.parse(raw);
      if (v) count += v.qty;
    }
    return { count };
  }

  /**
   * 内部 API：下单后清掉指定 SKU（在订单事务成功后调用）
   * 注意：不在订单事务内调用，避免 Redis 失败拖垮 MySQL
   */
  async removeAfterOrder(userId: number, skuIds: number[]) {
    if (!skuIds.length) return;
    await this.redis.hdel(this.key(userId), ...skuIds.map(String));
    await this.markDirty(userId);
  }

  /**
   * 内部 API：获取已选中的购物车项（用于订单预览/创建）
   */
  async getSelectedItems(userId: number): Promise<CartItemView[]> {
    const { list } = await this.list(userId);
    return list.filter((i) => i.selected === 1 && i.available);
  }
}
