import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';

import { ErrorCode } from '@common/constants/error-code';
import { BusinessException } from '@common/exceptions/business.exception';
import { CacheKey, CacheTTL } from '@common/constants/cache-key';
import { RedisService } from '@shared/redis/redis.service';

import { SysConfigEntity } from '@modules/system/entities/sys-config.entity';

import {
  BatchUpdateConfigDto,
  ConfigQueryDto,
  CreateConfigDto,
  UpdateConfigDto,
} from './dto/config.dto';

/** 公开 KEY 白名单：C 端可拉到这些（不含敏感）*/
const PUBLIC_CONFIG_KEYS = new Set<string>([
  'site_name',
  'site_logo',
  'service_phone',
  'about_us',
  'order_timeout_minutes',
  'upload_max_size_mb',
]);

@Injectable()
export class SysConfigService {
  constructor(
    @InjectRepository(SysConfigEntity) private readonly repo: Repository<SysConfigEntity>,
    private readonly redis: RedisService,
  ) {}

  /**
   * 按 group 聚合返回（前端系统配置页用）
   * sys_config 表里没有 group 字段，按 configKey 前缀（: 或 _ 分隔的第一段）分组
   */
  async getGroups(): Promise<Array<{
    groupCode: string;
    groupName: string;
    items: Array<{
      id: number;
      groupCode: string;
      groupName: string;
      key: string;
      label: string;
      value: string;
      type: string;
      sort: number;
    }>;
  }>> {
    const all = await this.repo.find({ order: { id: 'ASC' } });
    const groupMap = new Map<string, any[]>();
    for (const c of all) {
      const groupCode = (c.configKey.split(/[:_]/)[0] || 'default').toLowerCase();
      const arr = groupMap.get(groupCode) ?? [];
      arr.push({
        id: c.id,
        groupCode,
        groupName: groupCode,
        key: c.configKey,
        label: c.description || c.configKey,
        value: c.configValue,
        type: 'input',
        sort: 0,
      });
      groupMap.set(groupCode, arr);
    }
    return Array.from(groupMap.entries()).map(([groupCode, items]) => ({
      groupCode,
      groupName: groupCode,
      items,
    }));
  }

  /** 按 groupCode 保存一组键值（前端 PUT /admin/system/config/:groupCode 调用） */
  async saveGroup(groupCode: string, values: Record<string, string>): Promise<{ ok: true; updated: number }> {
    const items = Object.entries(values).map(([k, v]) => ({ configKey: k, configValue: String(v ?? '') }));
    if (items.length === 0) return { ok: true, updated: 0 };
    return (await this.batchUpdate({ items })) as any;
  }

  async page(query: ConfigQueryDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 50;
    const where: any = {};
    if (query.keyword) where.configKey = Like(`%${query.keyword}%`);
    const [list, total] = await this.repo.findAndCount({
      where,
      order: { id: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total, page, pageSize };
  }

  async create(dto: CreateConfigDto) {
    const exist = await this.repo.findOne({ where: { configKey: dto.configKey } });
    if (exist) throw new BusinessException(ErrorCode.DATA_CONFLICT, 'configKey 已存在');
    const saved = await this.repo.save(
      this.repo.create({
        configKey: dto.configKey,
        configValue: dto.configValue,
        description: dto.description || '',
      }),
    );
    await this.invalidateCache(dto.configKey);
    return saved;
  }

  async update(id: number, dto: UpdateConfigDto) {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
    await this.repo.update(id, {
      ...(dto.configValue !== undefined && { configValue: dto.configValue }),
      ...(dto.description !== undefined && { description: dto.description }),
    });
    await this.invalidateCache(c.configKey);
    return { ok: true };
  }

  async batchUpdate(dto: BatchUpdateConfigDto) {
    if (!dto.items?.length) return { ok: true, updated: 0 };
    const keys = dto.items.map((i) => i.configKey);
    const existing = await this.repo.find({ where: { configKey: In(keys) } });
    const existMap = new Map(existing.map((c) => [c.configKey, c]));

    let updated = 0;
    for (const item of dto.items) {
      const cur = existMap.get(item.configKey);
      if (cur) {
        await this.repo.update(cur.id, { configValue: item.configValue });
        updated++;
      } else {
        // 不存在时新建，描述置空
        await this.repo.insert({
          configKey: item.configKey,
          configValue: item.configValue,
          description: '',
        });
        updated++;
      }
      await this.invalidateCache(item.configKey);
    }
    return { ok: true, updated };
  }

  async remove(id: number) {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
    await this.repo.delete(id);
    await this.invalidateCache(c.configKey);
    return { ok: true };
  }

  /** 取单个 value（带缓存） */
  async getValue(key: string): Promise<string | null> {
    const cached = await this.redis.get(CacheKey.config(key));
    if (cached !== null) return cached;
    const c = await this.repo.findOne({ where: { configKey: key } });
    if (!c) return null;
    await this.redis.set(CacheKey.config(key), c.configValue, CacheTTL.CONFIG);
    return c.configValue;
  }

  /** C 端：取所有公开配置 */
  async getPublicConfigs(): Promise<Record<string, string>> {
    const keys = [...PUBLIC_CONFIG_KEYS];
    const list = await this.repo.find({ where: { configKey: In(keys) } });
    const result: Record<string, string> = {};
    list.forEach((c) => (result[c.configKey] = c.configValue));
    return result;
  }

  private async invalidateCache(key: string) {
    await this.redis.del(CacheKey.config(key));
  }
}
