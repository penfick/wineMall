import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';

import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/constants/error-code';
import { CacheKey, CacheTTL } from '@common/constants/cache-key';

import { RedisService } from '@shared/redis/redis.service';

import { BannerEntity } from '../entities/banner.entity';
import {
  BannerQueryDto,
  BannerSortDto,
  CreateBannerDto,
  UpdateBannerDto,
} from './dto/banner.dto';

interface BannerView {
  id: number;
  title: string;
  imageUrl: string;
  /** 前端兼容别名（同 imageUrl，仅 listPublic 输出）*/
  image?: string;
  linkType: number;
  linkValue: string;
  /** 前端兼容别名（同 linkType，仅 listPublic 输出）*/
  jumpType?: number;
  /** 前端兼容别名（同 linkValue，仅 listPublic 输出）*/
  jumpTarget?: string;
  sort: number;
  status: number;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class BannerService {
  constructor(
    @InjectRepository(BannerEntity)
    private readonly repo: Repository<BannerEntity>,
    private readonly redis: RedisService,
  ) {}

  // ==================== B 端 ====================

  async pageAdmin(query: BannerQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: any = {};
    if (query.keyword) where.title = Like(`%${query.keyword}%`);
    if (query.status !== undefined) where.status = query.status;

    const [list, total] = await this.repo.findAndCount({
      where,
      order: { sort: 'DESC', id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total, page, pageSize };
  }

  async detail(id: number): Promise<BannerView> {
    const b = await this.repo.findOne({ where: { id } });
    if (!b) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
    return b;
  }

  async create(dto: CreateBannerDto): Promise<BannerView> {
    this.assertLinkValue(dto.linkType ?? 0, dto.linkValue);
    const ent = this.repo.create({
      title: dto.title ?? '',
      imageUrl: dto.imageUrl,
      linkType: dto.linkType ?? 0,
      linkValue: dto.linkValue ?? '',
      sort: dto.sort ?? 0,
      status: dto.status ?? 1,
    });
    const saved = await this.repo.save(ent);
    await this.invalidate();
    return saved;
  }

  async update(id: number, dto: UpdateBannerDto): Promise<BannerView> {
    const b = await this.repo.findOne({ where: { id } });
    if (!b) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
    const linkType = dto.linkType ?? b.linkType;
    const linkValue = dto.linkValue ?? b.linkValue;
    this.assertLinkValue(linkType, linkValue);
    Object.assign(b, {
      title: dto.title ?? b.title,
      imageUrl: dto.imageUrl ?? b.imageUrl,
      linkType,
      linkValue,
      sort: dto.sort ?? b.sort,
      status: dto.status ?? b.status,
    });
    const saved = await this.repo.save(b);
    await this.invalidate();
    return saved;
  }

  async toggleStatus(id: number, status: number): Promise<void> {
    if (![0, 1].includes(status)) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, 'status 仅支持 0/1');
    }
    const b = await this.repo.findOne({ where: { id } });
    if (!b) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
    b.status = status;
    await this.repo.save(b);
    await this.invalidate();
  }

  async remove(id: number): Promise<void> {
    const b = await this.repo.findOne({ where: { id } });
    if (!b) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
    await this.repo.delete(id);
    await this.invalidate();
  }

  async batchSort(dto: BannerSortDto): Promise<void> {
    if (!dto.items?.length) return;
    await Promise.all(
      dto.items.map((it) => this.repo.update(it.id, { sort: it.sort })),
    );
    await this.invalidate();
  }

  // ==================== C 端 ====================

  async listPublic(): Promise<BannerView[]> {
    const cached = await this.redis.getJson<BannerView[]>(CacheKey.banner);
    if (cached) return cached;
    const list = await this.repo.find({
      where: { status: 1 },
      order: { sort: 'DESC', id: 'DESC' },
      take: 10,
    });
    const view: BannerView[] = list.map((b) => ({
      id: b.id,
      title: b.title,
      imageUrl: b.imageUrl,
      image: b.imageUrl,
      linkType: b.linkType,
      linkValue: b.linkValue,
      jumpType: b.linkType,
      jumpTarget: b.linkValue,
      sort: b.sort,
      status: b.status,
    }));
    await this.redis.setJson(CacheKey.banner, view, CacheTTL.BANNER);
    return view;
  }

  // ==================== 内部 ====================

  private assertLinkValue(linkType: number, linkValue?: string) {
    if (linkType === 0) return; // 无跳转，linkValue 任意
    if (!linkValue) {
      throw new BusinessException(
        ErrorCode.PARAM_INVALID,
        '跳转目标不能为空',
      );
    }
    if (linkType === 1 || linkType === 2) {
      if (!/^\d+$/.test(linkValue)) {
        throw new BusinessException(
          ErrorCode.PARAM_INVALID,
          '商品/品类跳转目标必须是数字 ID',
        );
      }
    }
    if (linkType === 3) {
      if (!/^https?:\/\//i.test(linkValue)) {
        throw new BusinessException(
          ErrorCode.PARAM_INVALID,
          '外链必须以 http(s):// 开头',
        );
      }
    }
  }

  private async invalidate() {
    await this.redis.del(CacheKey.banner);
  }
}
