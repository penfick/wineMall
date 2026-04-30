import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { DataSource, In, IsNull, Repository } from 'typeorm';

import { ErrorCode } from '@common/constants/error-code';
import { BusinessException } from '@common/exceptions/business.exception';
import { CacheKey, CacheTTL } from '@common/constants/cache-key';
import { RedisService } from '@shared/redis/redis.service';
import { IdGeneratorService } from '@shared/id/id-generator.service';

import { CategoryEntity } from '@modules/category/entities/category.entity';

import { GoodsEntity } from './entities/goods.entity';
import { GoodsSpecEntity } from './entities/goods-spec.entity';
import { GoodsImageEntity } from './entities/goods-image.entity';
import { GoodsAttributeEntity } from './entities/goods-attribute.entity';

import {
  BatchStatusDto,
  CreateGoodsDto,
  GoodsQueryDto,
  GoodsSpecDto,
  PublicGoodsListDto,
  UpdateGoodsDto,
} from './dto/goods.dto';

interface GoodsCardView {
  id: number;
  goodsNo: string;
  name: string;
  subTitle: string;
  categoryId: number;
  cover: string;
  price: string;
  marketPrice: string;
  sales: number;
  stock: number;
  status: number;
}

@Injectable()
export class GoodsService {
  constructor(
    @InjectRepository(GoodsEntity) private readonly repo: Repository<GoodsEntity>,
    @InjectRepository(GoodsSpecEntity) private readonly skuRepo: Repository<GoodsSpecEntity>,
    @InjectRepository(GoodsImageEntity) private readonly imgRepo: Repository<GoodsImageEntity>,
    @InjectRepository(GoodsAttributeEntity)
    private readonly attrRepo: Repository<GoodsAttributeEntity>,
    @InjectRepository(CategoryEntity) private readonly catRepo: Repository<CategoryEntity>,
    private readonly redis: RedisService,
    private readonly id: IdGeneratorService,
    private readonly ds: DataSource,
  ) {}

  // ==================== B 端 ====================

  async pageAdmin(query: GoodsQueryDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;

    const qb = this.repo
      .createQueryBuilder('g')
      .where('g.deletedAt IS NULL')
      .orderBy('g.sort', 'DESC')
      .addOrderBy('g.createdAt', 'DESC');

    if (query.keyword) {
      qb.andWhere('(g.name LIKE :kw OR g.goodsNo LIKE :kw)', { kw: `%${query.keyword}%` });
    }
    if (query.categoryId !== undefined) {
      qb.andWhere('g.categoryId = :cid', { cid: query.categoryId });
    }
    if (query.status !== undefined) {
      qb.andWhere('g.status = :st', { st: query.status });
    }

    const wantWarning =
      query.warning === 1 || query.lowStock === true || query.lowStock === 'true';
    if (wantWarning) {
      qb.andWhere('g.stock <= g.stockWarning');
    }

    const [list, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    if (list.length === 0) return { list: [], total, page, pageSize };

    const cats = await this.catRepo.find({
      where: { id: In(list.map((g) => g.categoryId)) },
    });
    const catMap = new Map(cats.map((c) => [c.id, c.name]));

    const data = list.map((g) => ({
      id: g.id,
      goodsNo: g.goodsNo,
      name: g.name,
      subTitle: g.subTitle,
      categoryId: g.categoryId,
      categoryName: catMap.get(g.categoryId) || '',
      mainImage: g.mainImage,
      price: g.price,
      marketPrice: g.marketPrice,
      stock: g.stock,
      stockWarning: g.stockWarning,
      sales: g.sales,
      status: g.status,
      sort: g.sort,
      createdAt: g.createdAt,
    }));

    return { list: data, total, page, pageSize };
  }

  async detailAdmin(id: number) {
    const g = await this.repo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!g) throw new BusinessException(ErrorCode.GOODS_NOT_FOUND);

    const [skus, images, attributes] = await Promise.all([
      this.skuRepo.find({
        where: { goodsId: id, deletedAt: IsNull() },
        order: { id: 'ASC' },
      }),
      this.imgRepo.find({ where: { goodsId: id }, order: { sort: 'ASC', id: 'ASC' } }),
      this.attrRepo.find({ where: { goodsId: id } }),
    ]);

    return {
      id: g.id,
      goodsNo: g.goodsNo,
      name: g.name,
      subTitle: g.subTitle,
      categoryId: g.categoryId,
      mainImage: g.mainImage,
      images: images.map((i) => i.imageUrl),
      detail: g.detail || '',
      description: g.description,
      unit: g.unit,
      price: Number(g.price),
      marketPrice: Number(g.marketPrice),
      costPrice: Number(g.costPrice),
      stock: g.stock,
      stockWarning: g.stockWarning,
      status: g.status,
      sort: g.sort,
      sales: g.sales,
      freightTemplateId: g.freightTemplateId,
      // 默认 SKU：保留给前端用，但显示文案做美化（库存调整等场景识别用）
      specs: skus.map((s) => ({
        id: s.id,
        skuCode: s.skuCode,
        attrText: s.attrText === '__default__' ? '' : s.attrText,
        isDefault: s.attrText === '__default__',
        price: Number(s.price),
        marketPrice: Number(s.marketPrice),
        costPrice: Number(s.costPrice),
        image: s.image,
        stock: s.stock,
        stockWarning: s.stockWarning,
        status: s.status,
      })),
      attributes,
      createdAt: g.createdAt,
    };
  }

  async create(dto: CreateGoodsDto) {
    await this.assertCategory(dto.categoryId);
    if (dto.specs?.length) this.assertSpecs(dto.specs);

    const saved = await this.ds.transaction(async (mgr) => {
      const goodsRepo = mgr.getRepository(GoodsEntity);
      const skuRepo = mgr.getRepository(GoodsSpecEntity);
      const imgRepo = mgr.getRepository(GoodsImageEntity);
      const attrRepo = mgr.getRepository(GoodsAttributeEntity);

      const goodsNo = 'G' + this.id.nextId().slice(-12);
      const g = await goodsRepo.save(
        goodsRepo.create({
          goodsNo,
          categoryId: dto.categoryId,
          name: dto.name,
          subTitle: dto.subTitle ?? '',
          mainImage: dto.mainImage,
          unit: dto.unit ?? '件',
          price: String(dto.price),
          marketPrice: String(dto.marketPrice ?? 0),
          costPrice: String(dto.costPrice ?? 0),
          stock: dto.stock,
          stockWarning: dto.stockWarning ?? 10,
          detail: dto.detail ?? null,
          description: null,
          status: dto.status ?? 0,
          sort: dto.sort ?? 0,
          sortWeight: 0,
          freightTemplateId: dto.freightTemplateId ?? null,
          sales: 0,
        }),
      );

      // SKU：有规格按 specs 建；无规格自动建一条「默认 SKU」承接商品级 stock/price，
      // 让下游（库存/订单/购物车）始终面向 SKU 一条线
      if (dto.specs?.length) {
        for (const s of dto.specs) {
          await skuRepo.save(
            skuRepo.create({
              goodsId: g.id,
              skuNo: 'S' + this.id.nextId().slice(-12),
              attrText: s.attrText ?? '',
              skuCode: s.skuCode ?? '',
              price: String(s.price),
              marketPrice: String(s.marketPrice ?? 0),
              costPrice: String(s.costPrice ?? 0),
              image: s.image ?? '',
              stock: s.stock,
              stockWarning: s.stockWarning ?? 10,
              weight: s.weight ?? 0,
              status: s.status ?? 1,
            }),
          );
        }
      } else {
        await skuRepo.save(
          skuRepo.create({
            goodsId: g.id,
            skuNo: 'S' + this.id.nextId().slice(-12),
            attrText: '__default__',
            skuCode: '',
            price: g.price,
            marketPrice: g.marketPrice,
            costPrice: g.costPrice,
            image: '',
            stock: g.stock,
            stockWarning: g.stockWarning,
            weight: 0,
            status: 1,
          }),
        );
      }

      // 相册图（可选）
      if (dto.images?.length) {
        await imgRepo.save(
          dto.images.map((url, idx) =>
            imgRepo.create({
              goodsId: g.id,
              imageUrl: url,
              thumbnailUrl: '',
              sort: idx,
            }),
          ),
        );
      }

      // 属性（可选）
      if (dto.attributes?.length) {
        await attrRepo.save(
          dto.attributes.map((a) =>
            attrRepo.create({
              goodsId: g.id,
              attributeId: a.attributeId,
              attrValue: a.attrValue,
            }),
          ),
        );
      }

      return g;
    });

    await this.markUsedImages([dto.mainImage, ...(dto.images ?? [])]);
    await this.invalidateGoodsCache(saved.id);
    return { id: saved.id, goodsNo: saved.goodsNo };
  }

  async update(id: number, dto: UpdateGoodsDto) {
    const g = await this.repo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!g) throw new BusinessException(ErrorCode.GOODS_NOT_FOUND);

    if (dto.categoryId !== undefined && dto.categoryId !== g.categoryId) {
      await this.assertCategory(dto.categoryId);
    }
    if (dto.specs?.length) this.assertSpecs(dto.specs);

    await this.ds.transaction(async (mgr) => {
      const goodsRepo = mgr.getRepository(GoodsEntity);
      const skuRepo = mgr.getRepository(GoodsSpecEntity);
      const imgRepo = mgr.getRepository(GoodsImageEntity);
      const attrRepo = mgr.getRepository(GoodsAttributeEntity);

      const patch: Partial<GoodsEntity> = {};
      if (dto.categoryId !== undefined) patch.categoryId = dto.categoryId;
      if (dto.name !== undefined) patch.name = dto.name;
      if (dto.subTitle !== undefined) patch.subTitle = dto.subTitle;
      if (dto.mainImage !== undefined) patch.mainImage = dto.mainImage;
      if (dto.unit !== undefined) patch.unit = dto.unit;
      if (dto.price !== undefined) patch.price = String(dto.price);
      if (dto.marketPrice !== undefined) patch.marketPrice = String(dto.marketPrice);
      if (dto.costPrice !== undefined) patch.costPrice = String(dto.costPrice);
      if (dto.stock !== undefined) patch.stock = dto.stock;
      if (dto.stockWarning !== undefined) patch.stockWarning = dto.stockWarning;
      if (dto.detail !== undefined) patch.detail = dto.detail;
      if (dto.status !== undefined) patch.status = dto.status;
      if (dto.sort !== undefined) patch.sort = dto.sort;
      if (dto.freightTemplateId !== undefined) {
        patch.freightTemplateId = dto.freightTemplateId;
      }
      if (Object.keys(patch).length) await goodsRepo.update(id, patch);

      // 相册图：全量替换
      if (dto.images !== undefined) {
        await imgRepo.delete({ goodsId: id });
        if (dto.images.length) {
          await imgRepo.save(
            dto.images.map((url, idx) =>
              imgRepo.create({
                goodsId: id,
                imageUrl: url,
                thumbnailUrl: '',
                sort: idx,
              }),
            ),
          );
        }
      }

      // SKU：增量。无 specs 时确保有一条「默认 SKU」承接商品级 stock/price。
      const existing = await skuRepo.find({
        where: { goodsId: id, deletedAt: IsNull() },
      });

      if (dto.specs !== undefined && dto.specs.length > 0) {
        // 用户提交了规格 → 走原有增量逻辑；如有遗留的默认 SKU 一并清除
        const existIds = new Set(existing.map((s) => s.id));
        const incomingIds = new Set(
          dto.specs.filter((s) => s.id).map((s) => s.id as number),
        );
        const defaultIds = existing
          .filter((s) => s.attrText === '__default__')
          .map((s) => s.id);

        const toRemove = [
          ...[...existIds].filter((eid) => !incomingIds.has(eid)),
          ...defaultIds,
        ];
        if (toRemove.length) await skuRepo.softDelete([...new Set(toRemove)]);

        for (const s of dto.specs) {
          if (s.id && existIds.has(s.id)) {
            await skuRepo.update(s.id, {
              attrText: s.attrText ?? '',
              skuCode: s.skuCode ?? '',
              price: String(s.price),
              marketPrice: String(s.marketPrice ?? 0),
              costPrice: String(s.costPrice ?? 0),
              image: s.image ?? '',
              stock: s.stock,
              stockWarning: s.stockWarning ?? 10,
              weight: s.weight ?? 0,
              status: s.status ?? 1,
            });
          } else {
            await skuRepo.save(
              skuRepo.create({
                goodsId: id,
                skuNo: 'S' + this.id.nextId().slice(-12),
                attrText: s.attrText ?? '',
                skuCode: s.skuCode ?? '',
                price: String(s.price),
                marketPrice: String(s.marketPrice ?? 0),
                costPrice: String(s.costPrice ?? 0),
                image: s.image ?? '',
                stock: s.stock,
                stockWarning: s.stockWarning ?? 10,
                weight: s.weight ?? 0,
                status: s.status ?? 1,
              }),
            );
          }
        }
      } else {
        // 无规格场景：保留/创建唯一一条默认 SKU，同步商品级 stock/price
        const defaultSku =
          existing.find((s) => s.attrText === '__default__') ?? existing[0];
        const realSkus = existing.filter(
          (s) => s.attrText !== '__default__' && s.id !== defaultSku?.id,
        );

        // dto.specs === [] 表示主动清空规格 → 删除真实 SKU
        if (dto.specs !== undefined && realSkus.length) {
          await skuRepo.softDelete(realSkus.map((s) => s.id));
        }

        // 商品级 stock/price 有更新就同步到默认 SKU
        const finalGoods = await goodsRepo.findOne({ where: { id } });
        if (finalGoods) {
          if (defaultSku) {
            await skuRepo.update(defaultSku.id, {
              attrText: '__default__',
              price: finalGoods.price,
              marketPrice: finalGoods.marketPrice,
              costPrice: finalGoods.costPrice,
              stock: finalGoods.stock,
              stockWarning: finalGoods.stockWarning,
            });
          } else {
            await skuRepo.save(
              skuRepo.create({
                goodsId: id,
                skuNo: 'S' + this.id.nextId().slice(-12),
                attrText: '__default__',
                skuCode: '',
                price: finalGoods.price,
                marketPrice: finalGoods.marketPrice,
                costPrice: finalGoods.costPrice,
                image: '',
                stock: finalGoods.stock,
                stockWarning: finalGoods.stockWarning,
                weight: 0,
                status: 1,
              }),
            );
          }
        }
      }

      // 属性：全量替换
      if (dto.attributes !== undefined) {
        await attrRepo.delete({ goodsId: id });
        if (dto.attributes.length) {
          await attrRepo.save(
            dto.attributes.map((a) =>
              attrRepo.create({
                goodsId: id,
                attributeId: a.attributeId,
                attrValue: a.attrValue,
              }),
            ),
          );
        }
      }
    });

    if (dto.images !== undefined || dto.mainImage !== undefined) {
      await this.markUsedImages([
        ...(dto.mainImage ? [dto.mainImage] : []),
        ...(dto.images ?? []),
      ]);
    }
    await this.invalidateGoodsCache(id);
    return { ok: true };
  }

  async remove(id: number) {
    const g = await this.repo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!g) throw new BusinessException(ErrorCode.GOODS_NOT_FOUND);
    if (g.status === 1) {
      throw new BusinessException(
        ErrorCode.OPERATION_NOT_ALLOWED,
        '已上架商品需先下架再删除',
      );
    }

    await this.ds.transaction(async (mgr) => {
      await mgr.getRepository(GoodsEntity).softDelete(id);
      await mgr.getRepository(GoodsSpecEntity).softDelete({ goodsId: id });
    });
    await this.invalidateGoodsCache(id);
    return { ok: true };
  }

  /**
   * 一次性回填：给所有缺 SKU 的存量商品补一条「默认 SKU」。
   * 幂等——已有任意 SKU 的商品会跳过。
   */
  async backfillDefaultSku() {
    const allGoods = await this.repo.find({ where: { deletedAt: IsNull() } });
    let created = 0;
    let skipped = 0;

    for (const g of allGoods) {
      const skuCount = await this.skuRepo.count({
        where: { goodsId: g.id, deletedAt: IsNull() },
      });
      if (skuCount > 0) {
        skipped += 1;
        continue;
      }
      await this.skuRepo.save(
        this.skuRepo.create({
          goodsId: g.id,
          skuNo: 'S' + this.id.nextId().slice(-12),
          attrText: '__default__',
          skuCode: '',
          price: g.price,
          marketPrice: g.marketPrice,
          costPrice: g.costPrice,
          image: '',
          stock: g.stock,
          stockWarning: g.stockWarning,
          weight: 0,
          status: 1,
        }),
      );
      await this.invalidateGoodsCache(g.id);
      created += 1;
    }
    return { total: allGoods.length, created, skipped };
  }

  async batchSetStatus(dto: BatchStatusDto) {
    if (dto.status !== 0 && dto.status !== 1) {
      throw new BusinessException(ErrorCode.PARAM_INVALID);
    }
    const list = await this.repo.find({
      where: { id: In(dto.ids), deletedAt: IsNull() },
    });
    if (list.length === 0) {
      throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
    }
    await this.repo.update({ id: In(list.map((g) => g.id)) }, { status: dto.status });
    await Promise.all(list.map((g) => this.invalidateGoodsCache(g.id)));
    return { affected: list.length };
  }

  /** 库存预警列表 */
  async lowStockList(limit = 50) {
    const list = await this.repo
      .createQueryBuilder('g')
      .where('g.deletedAt IS NULL')
      .andWhere('g.stock <= g.stockWarning')
      .orderBy('g.stock', 'ASC')
      .limit(limit)
      .getMany();

    return list.map((g) => ({
      id: g.id,
      goodsNo: g.goodsNo,
      name: g.name,
      mainImage: g.mainImage,
      stock: g.stock,
      stockWarning: g.stockWarning,
    }));
  }

  // ==================== C 端 ====================

  async pagePublic(query: PublicGoodsListDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const sort = query.sort || 'default';

    const cacheKey = CacheKey.goodsList(this.hash({ ...query, page, pageSize, sort }));
    const cached = await this.redis.getJson<{ list: GoodsCardView[]; total: number }>(
      cacheKey,
    );
    if (cached) return { ...cached, page, pageSize };

    const qb = this.repo
      .createQueryBuilder('g')
      .where('g.deletedAt IS NULL')
      .andWhere('g.status = 1');
    if (query.keyword) {
      qb.andWhere('g.name LIKE :kw', { kw: `%${query.keyword}%` });
    }
    if (query.categoryId !== undefined) {
      const cats = await this.collectCategoryAndDescendants(query.categoryId);
      qb.andWhere('g.categoryId IN (:...cids)', { cids: cats });
    }

    switch (sort) {
      case 'sales':
        qb.orderBy('g.sales', 'DESC').addOrderBy('g.id', 'DESC');
        break;
      case 'new':
        qb.orderBy('g.createdAt', 'DESC');
        break;
      case 'price-asc':
        qb.orderBy('g.price', 'ASC');
        break;
      case 'price-desc':
        qb.orderBy('g.price', 'DESC');
        break;
      default:
        qb.orderBy('g.sort', 'DESC').addOrderBy('g.createdAt', 'DESC');
    }

    const total = await qb.getCount();
    const list = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    const stockMap = await this.sumSkuStock(list.map((g) => g.id));
    const cards = list.map((g) => this.toCard(g, stockMap));
    const result = { list: cards, total };
    await this.redis.setJson(cacheKey, result, CacheTTL.GOODS_LIST);
    return { ...result, page, pageSize };
  }

  async detailPublic(id: number) {
    const cached = await this.redis.getJson<any>(CacheKey.goodsDetail(id));
    if (cached) return cached;

    const g = await this.repo.findOne({
      where: { id, deletedAt: IsNull(), status: 1 },
    });
    if (!g) throw new BusinessException(ErrorCode.GOODS_NOT_FOUND);

    const [skus, images, attrs] = await Promise.all([
      this.skuRepo.find({
        where: { goodsId: id, deletedAt: IsNull() },
        order: { id: 'ASC' },
      }),
      this.imgRepo.find({ where: { goodsId: id }, order: { sort: 'ASC', id: 'ASC' } }),
      this.attrRepo.find({ where: { goodsId: id } }),
    ]);

    const view = {
      id: g.id,
      goodsNo: g.goodsNo,
      name: g.name,
      subTitle: g.subTitle,
      mainImage: g.mainImage,
      images: images.map((i) => i.imageUrl),
      detail: g.detail || '',
      unit: g.unit,
      categoryId: g.categoryId,
      price: Number(g.price),
      marketPrice: Number(g.marketPrice),
      stock: g.stock,
      sales: g.sales,
      // 默认 SKU 仅用于内部 stock/order 流转，对 C 端隐藏，等价于「无规格」
      specs: skus
        .filter((s) => s.attrText !== '__default__')
        .map((s) => ({
          id: s.id,
          skuCode: s.skuCode,
          attrText: s.attrText,
          price: Number(s.price),
          marketPrice: Number(s.marketPrice),
          image: s.image,
          stock: s.stock,
          status: s.status,
        })),
      attributes: attrs,
    };
    await this.redis.setJson(CacheKey.goodsDetail(id), view, CacheTTL.GOODS_DETAIL);
    return view;
  }

  async hot(limit = 6): Promise<GoodsCardView[]> {
    const list = await this.repo.find({
      where: { deletedAt: IsNull(), status: 1 },
      order: { sales: 'DESC', id: 'DESC' },
      take: limit,
    });
    const stockMap = await this.sumSkuStock(list.map((g) => g.id));
    return list.map((g) => this.toCard(g, stockMap));
  }

  // ==================== 工具 ====================

  /**
   * 批量计算商品的可售总库存。
   * - 有 active SKU：按 SKU.stock 求和
   * - 没有 SKU：返回 -1，调用方回退到 goods.stock 字段
   *   （区分「无 SKU」和「有 SKU 但全部 0」两种情况）
   */
  private async sumSkuStock(goodsIds: number[]): Promise<Map<number, number>> {
    const out = new Map<number, number>();
    if (!goodsIds.length) return out;
    const rows = await this.skuRepo
      .createQueryBuilder('s')
      .select('s.goods_id', 'goodsId')
      .addSelect('COALESCE(SUM(s.stock), 0)', 'total')
      .where('s.goods_id IN (:...ids)', { ids: goodsIds })
      .andWhere('s.deleted_at IS NULL')
      .andWhere('s.status = 1')
      .groupBy('s.goods_id')
      .getRawMany<{ goodsId: number; total: string | number }>();
    for (const r of rows) {
      out.set(Number(r.goodsId), Number(r.total) || 0);
    }
    // 没出现在结果里的 = 该商品没有 active SKU，标记为 -1 让 toCard 回退到 goods.stock
    for (const id of goodsIds) {
      if (!out.has(id)) out.set(id, -1);
    }
    return out;
  }

  /**
   * 一次性回填 goods 表的聚合字段（销量 / 库存）。
   * - sales：从 order_items 聚合（仅统计未取消的订单：status != 4）
   * - stock：从 active SKU 聚合
   * 之后清掉 C 端商品列表缓存。
   */
  async recomputeAggregates(): Promise<{ updated: number }> {
    // 1) 销量：order_items.quantity SUM，按 goods_id 分组，过滤掉取消订单（status=4）
    const salesRows = await this.ds.query<
      Array<{ goodsId: number; total: string | number }>
    >(
      `SELECT oi.goods_id AS goodsId, COALESCE(SUM(oi.quantity), 0) AS total
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id AND o.deleted_at IS NULL
       WHERE o.status <> 4
       GROUP BY oi.goods_id`,
    );
    const salesMap = new Map<number, number>();
    for (const r of salesRows) {
      salesMap.set(Number(r.goodsId), Number(r.total) || 0);
    }

    // 2) 库存：active SKU 求和（含未上架商品也回填，方便后台查看）
    const allGoods = await this.repo.find({
      where: { deletedAt: IsNull() },
      select: ['id'],
    });
    const allIds = allGoods.map((g) => g.id);
    const stockMap = await this.sumSkuStock(allIds);

    // 3) 逐条更新：无 SKU 的商品（stockMap 标记 -1）保留 goods.stock 不动，只刷 sales
    let updated = 0;
    for (const id of allIds) {
      const sales = salesMap.get(id) ?? 0;
      const skuSum = stockMap.get(id);
      if (skuSum === undefined || skuSum === -1) {
        await this.repo.update({ id }, { sales });
      } else {
        await this.repo.update({ id }, { sales, stock: skuSum });
      }
      updated++;
    }

    // 4) 清 C 端商品列表缓存
    await this.redis.deleteByPattern('cache:goods:list:*');

    return { updated };
  }

  private toCard(g: GoodsEntity, stockMap?: Map<number, number>): GoodsCardView {
    const skuSum = stockMap?.get(g.id);
    // skuSum === -1 表示该商品无 SKU，回退到 goods.stock
    const stock = skuSum === undefined || skuSum === -1 ? g.stock ?? 0 : skuSum;
    return {
      id: g.id,
      goodsNo: g.goodsNo,
      name: g.name,
      subTitle: g.subTitle,
      categoryId: g.categoryId,
      cover: g.mainImage,
      price: g.price,
      marketPrice: g.marketPrice,
      sales: g.sales,
      stock,
      status: g.status,
    };
  }

  private async assertCategory(categoryId: number) {
    const c = await this.catRepo.findOne({ where: { id: categoryId } });
    if (!c) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, '分类不存在');
    if (c.status !== 1) {
      throw new BusinessException(ErrorCode.OPERATION_NOT_ALLOWED, '分类已禁用');
    }
  }

  private assertSpecs(specs: GoodsSpecDto[]) {
    const names = new Set<string>();
    for (const s of specs) {
      if (s.price < 0) {
        throw new BusinessException(ErrorCode.PARAM_INVALID, '价格不能为负');
      }
      const key = (s.attrText || '').trim();
      if (key) {
        if (names.has(key)) {
          throw new BusinessException(ErrorCode.PARAM_INVALID, `SKU 规格重复：${key}`);
        }
        names.add(key);
      }
    }
  }

  private async collectCategoryAndDescendants(rootId: number): Promise<number[]> {
    const all = await this.catRepo.find({
      select: ['id', 'parentId'],
      where: { status: 1 },
    });
    const childMap = new Map<number, number[]>();
    all.forEach((c) => {
      if (!childMap.has(c.parentId)) childMap.set(c.parentId, []);
      childMap.get(c.parentId)!.push(c.id);
    });
    const result = [rootId];
    const dfs = (pid: number) => {
      const children = childMap.get(pid) || [];
      children.forEach((cid) => {
        result.push(cid);
        dfs(cid);
      });
    };
    dfs(rootId);
    return result;
  }

  private hash(obj: any): string {
    return createHash('md5').update(JSON.stringify(obj)).digest('hex').slice(0, 16);
  }

  private async markUsedImages(urls: string[]) {
    const objNames = urls
      .filter(Boolean)
      .map((u) => this.urlToObjectName(u))
      .filter(Boolean) as string[];
    if (!objNames.length) return;
    const keys = objNames.map((n) => CacheKey.uploadTemp(n));
    await this.redis.del(...keys);
  }

  private urlToObjectName(url: string): string | null {
    try {
      const u = new URL(url);
      const segs = u.pathname.replace(/^\/+/, '').split('/');
      if (segs.length < 2) return null;
      return segs.slice(1).join('/');
    } catch {
      return null;
    }
  }

  async invalidateGoodsCache(goodsId: number) {
    await Promise.all([
      this.redis.del(CacheKey.goodsDetail(goodsId)),
      this.redis.del(CacheKey.goodsSku(goodsId)),
      this.redis.deleteByPattern('cache:goods:list:*'),
    ]);
  }
}
