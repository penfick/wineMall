import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Like, Repository } from 'typeorm';

import { ErrorCode } from '@common/constants/error-code';
import { BusinessException } from '@common/exceptions/business.exception';
import { CacheKey, CacheTTL } from '@common/constants/cache-key';
import { RedisService } from '@shared/redis/redis.service';

import { DictTypeEntity } from '@modules/system/entities/dict-type.entity';
import { DictItemEntity } from '@modules/system/entities/dict-item.entity';

import {
  CreateDictItemDto,
  CreateDictTypeDto,
  DictTypeQueryDto,
  UpdateDictItemDto,
  UpdateDictTypeDto,
} from './dto/dict.dto';

interface DictItemView {
  label: string;
  value: string;
  sort: number;
  status: number;
}

@Injectable()
export class DictService {
  constructor(
    @InjectRepository(DictTypeEntity) private readonly typeRepo: Repository<DictTypeEntity>,
    @InjectRepository(DictItemEntity) private readonly itemRepo: Repository<DictItemEntity>,
    private readonly redis: RedisService,
    private readonly ds: DataSource,
  ) {}

  // ==================== 类型 ====================

  async pageType(query: DictTypeQueryDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const where: any = {};
    if (query.keyword) where.code = Like(`%${query.keyword}%`);
    if (query.status !== undefined) where.status = query.status;

    const [list, total] = await this.typeRepo.findAndCount({
      where,
      order: { id: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total, page, pageSize };
  }

  async detailType(id: number) {
    const t = await this.typeRepo.findOne({ where: { id } });
    if (!t) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
    return t;
  }

  async createType(dto: CreateDictTypeDto) {
    const exist = await this.typeRepo.findOne({ where: { code: dto.code } });
    if (exist) throw new BusinessException(ErrorCode.DATA_CONFLICT, '字典编码已存在');
    return this.typeRepo.save(
      this.typeRepo.create({
        code: dto.code,
        name: dto.name,
        description: dto.description || '',
        status: dto.status ?? 1,
      }),
    );
  }

  async updateType(id: number, dto: UpdateDictTypeDto) {
    const t = await this.typeRepo.findOne({ where: { id } });
    if (!t) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
    await this.typeRepo.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.status !== undefined && { status: dto.status }),
    });
    await this.invalidateCache(t.code);
    return { ok: true };
  }

  async removeType(id: number) {
    const t = await this.typeRepo.findOne({ where: { id } });
    if (!t) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
    await this.ds.transaction(async (mgr) => {
      await mgr.getRepository(DictItemEntity).delete({ dictTypeId: id });
      await mgr.getRepository(DictTypeEntity).delete(id);
    });
    await this.invalidateCache(t.code);
    return { ok: true };
  }

  // ==================== 项 ====================

  async listItems(dictTypeId: number) {
    return this.itemRepo.find({
      where: { dictTypeId },
      order: { sort: 'ASC', id: 'ASC' },
    });
  }

  async listItemsByCode(code: string) {
    const t = await this.typeRepo.findOne({ where: { code } });
    if (!t) return [];
    return this.itemRepo.find({
      where: { dictTypeId: t.id },
      order: { sort: 'ASC', id: 'ASC' },
    });
  }

  async listAllTypes() {
    return this.typeRepo.find({ order: { id: 'ASC' } });
  }

  async createItem(dto: CreateDictItemDto) {
    const t = await this.typeRepo.findOne({ where: { id: dto.dictTypeId } });
    if (!t) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, '字典类型不存在');
    const exist = await this.itemRepo.findOne({
      where: { dictTypeId: dto.dictTypeId, value: dto.value },
    });
    if (exist) throw new BusinessException(ErrorCode.DATA_CONFLICT, '同一字典下 value 不能重复');

    const saved = await this.itemRepo.save(
      this.itemRepo.create({
        dictTypeId: dto.dictTypeId,
        label: dto.label,
        value: dto.value,
        sort: dto.sort ?? 0,
        status: dto.status ?? 1,
      }),
    );
    await this.invalidateCache(t.code);
    return saved;
  }

  async updateItem(id: number, dto: UpdateDictItemDto) {
    const it = await this.itemRepo.findOne({ where: { id } });
    if (!it) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
    const t = await this.typeRepo.findOne({ where: { id: it.dictTypeId } });

    if (dto.value && dto.value !== it.value) {
      const dup = await this.itemRepo.findOne({
        where: { dictTypeId: it.dictTypeId, value: dto.value },
      });
      if (dup && dup.id !== id) {
        throw new BusinessException(ErrorCode.DATA_CONFLICT, '同一字典下 value 不能重复');
      }
    }

    await this.itemRepo.update(id, {
      ...(dto.label !== undefined && { label: dto.label }),
      ...(dto.value !== undefined && { value: dto.value }),
      ...(dto.sort !== undefined && { sort: dto.sort }),
      ...(dto.status !== undefined && { status: dto.status }),
    });
    if (t) await this.invalidateCache(t.code);
    return { ok: true };
  }

  async removeItem(id: number) {
    const it = await this.itemRepo.findOne({ where: { id } });
    if (!it) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
    const t = await this.typeRepo.findOne({ where: { id: it.dictTypeId } });
    await this.itemRepo.delete(id);
    if (t) await this.invalidateCache(t.code);
    return { ok: true };
  }

  // ==================== 公开查询（C/B 通用） ====================

  /** 按 code 取字典项（带缓存） */
  async getByCode(code: string): Promise<DictItemView[]> {
    const cached = await this.redis.getJson<DictItemView[]>(CacheKey.dict(code));
    if (cached) return cached;

    const t = await this.typeRepo.findOne({ where: { code, status: 1 } });
    if (!t) return [];
    const items = await this.itemRepo.find({
      where: { dictTypeId: t.id, status: 1 },
      order: { sort: 'ASC', id: 'ASC' },
    });
    const view = items.map((i) => ({
      label: i.label,
      value: i.value,
      sort: i.sort,
      status: i.status,
    }));
    await this.redis.setJson(CacheKey.dict(code), view, CacheTTL.DICT);
    return view;
  }

  /** 批量取（前端启动时一次拉取常用字典） */
  async getBatch(codes: string[]): Promise<Record<string, DictItemView[]>> {
    const result: Record<string, DictItemView[]> = {};
    for (const c of codes) {
      result[c] = await this.getByCode(c);
    }
    return result;
  }

  // ==================== 工具 ====================

  private async invalidateCache(code: string) {
    await this.redis.del(CacheKey.dict(code));
  }
}
