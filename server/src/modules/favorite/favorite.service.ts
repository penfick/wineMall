import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';

import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/constants/error-code';

import { GoodsEntity } from '@modules/goods/entities/goods.entity';
import { GoodsImageEntity } from '@modules/goods/entities/goods-image.entity';
import { GoodsSpecEntity } from '@modules/goods/entities/goods-spec.entity';

import { FavoriteEntity } from './entities/favorite.entity';
import { FavoriteAddDto, FavoriteListDto } from './dto/favorite.dto';

interface FavoriteView {
  id: number;
  goodsId: number;
  name: string;
  cover: string;
  minPrice: string;
  status: number;
  available: boolean;
  createdAt: Date;
}

@Injectable()
export class FavoriteService {
  constructor(
    @InjectRepository(FavoriteEntity)
    private readonly favRepo: Repository<FavoriteEntity>,
    @InjectRepository(GoodsEntity)
    private readonly goodsRepo: Repository<GoodsEntity>,
    @InjectRepository(GoodsImageEntity)
    private readonly imgRepo: Repository<GoodsImageEntity>,
    @InjectRepository(GoodsSpecEntity)
    private readonly skuRepo: Repository<GoodsSpecEntity>,
  ) {}

  async add(userId: number, dto: FavoriteAddDto): Promise<{ id: number }> {
    const goods = await this.goodsRepo.findOne({
      where: { id: dto.goodsId, deletedAt: IsNull() },
    });
    if (!goods) throw new BusinessException(ErrorCode.GOODS_NOT_FOUND);

    const exist = await this.favRepo.findOne({
      where: { userId, goodsId: dto.goodsId },
    });
    if (exist) return { id: exist.id };

    const created = await this.favRepo.save(
      this.favRepo.create({ userId, goodsId: dto.goodsId }),
    );
    return { id: created.id };
  }

  async remove(userId: number, goodsId: number): Promise<void> {
    await this.favRepo.delete({ userId, goodsId });
  }

  async batchRemove(userId: number, ids: number[]): Promise<{ removed: number }> {
    if (!ids?.length) return { removed: 0 };
    const r = await this.favRepo.delete({ userId, id: In(ids) });
    return { removed: r.affected ?? 0 };
  }

  async check(userId: number, goodsId: number): Promise<{ favorited: boolean }> {
    const c = await this.favRepo.count({ where: { userId, goodsId } });
    return { favorited: c > 0 };
  }

  /** 批量查询收藏状态（详情页可一次性传多个 SKU 关联商品 ID） */
  async checkMany(userId: number, goodsIds: number[]): Promise<Record<number, boolean>> {
    const ids = (goodsIds || []).filter((n) => Number.isInteger(n) && n > 0);
    if (!ids.length) return {};
    const rows = await this.favRepo.find({
      where: { userId, goodsId: In(ids) },
      select: ['goodsId'],
    });
    const set = new Set(rows.map((r) => r.goodsId));
    return Object.fromEntries(ids.map((id) => [id, set.has(id)]));
  }

  async page(
    userId: number,
    query: FavoriteListDto,
  ): Promise<{ list: FavoriteView[]; total: number; page: number; pageSize: number }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [favs, total] = await this.favRepo.findAndCount({
      where: { userId },
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    if (!favs.length) return { list: [], total, page, pageSize };

    const goodsIds = favs.map((f) => f.goodsId);
    const [goodsList, covers, prices] = await Promise.all([
      this.goodsRepo.find({ where: { id: In(goodsIds), deletedAt: IsNull() } }),
      this.imgRepo
        .createQueryBuilder('i')
        .select(['MIN(i.id) AS id', 'i.goods_id AS goodsId'])
        .addSelect('i.image_url', 'imageUrl')
        .where('i.goods_id IN (:...gids)', { gids: goodsIds })
        .groupBy('i.goods_id')
        .getRawMany<{ goodsId: number; imageUrl: string }>(),
      this.skuRepo
        .createQueryBuilder('s')
        .select('s.goods_id', 'goodsId')
        .addSelect('MIN(s.price)', 'minPrice')
        .where('s.goods_id IN (:...gids)', { gids: goodsIds })
        .andWhere('s.deleted_at IS NULL')
        .groupBy('s.goods_id')
        .getRawMany<{ goodsId: number; minPrice: string }>(),
    ]);

    const goodsMap = new Map(goodsList.map((g) => [g.id, g]));
    const coverMap = new Map(covers.map((c) => [Number(c.goodsId), c.imageUrl]));
    const priceMap = new Map(prices.map((p) => [Number(p.goodsId), p.minPrice]));

    const list: FavoriteView[] = favs.map((f) => {
      const g = goodsMap.get(f.goodsId);
      const status = g?.status ?? -1;
      return {
        id: f.id,
        goodsId: f.goodsId,
        name: g?.name ?? '该商品已下架或删除',
        cover: coverMap.get(f.goodsId) ?? '',
        minPrice: priceMap.get(f.goodsId) ?? '0.00',
        status,
        available: !!g && g.status === 1,
        createdAt: f.createdAt,
      };
    });

    return { list, total, page, pageSize };
  }
}
