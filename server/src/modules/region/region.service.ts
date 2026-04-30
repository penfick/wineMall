import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { ErrorCode } from '@common/constants/error-code';
import { BusinessException } from '@common/exceptions/business.exception';
import { CacheKey, CacheTTL } from '@common/constants/cache-key';
import { RedisService } from '@shared/redis/redis.service';

import { RegionEntity } from './entities/region.entity';

interface RegionTreeNode {
  code: string;
  name: string;
  level: number;
  parentCode: string;
  children?: RegionTreeNode[];
}

@Injectable()
export class RegionService {
  constructor(
    @InjectRepository(RegionEntity) private readonly repo: Repository<RegionEntity>,
    private readonly redis: RedisService,
  ) {}

  /** 全量树（带缓存，24h） */
  async tree(): Promise<RegionTreeNode[]> {
    const cached = await this.redis.getJson<RegionTreeNode[]>(CacheKey.region);
    if (cached) return cached;

    const all = await this.repo.find({ order: { code: 'ASC' } });
    const map = new Map<string, RegionTreeNode>();
    const roots: RegionTreeNode[] = [];

    all.forEach((r) => {
      map.set(r.code, {
        code: r.code,
        name: r.name,
        level: r.level,
        parentCode: r.parentCode,
        children: [],
      });
    });
    map.forEach((node) => {
      if (node.parentCode === '0' || !map.has(node.parentCode)) {
        roots.push(node);
      } else {
        map.get(node.parentCode)!.children!.push(node);
      }
    });

    const cleanup = (arr: RegionTreeNode[]) => {
      arr.forEach((n) => {
        if (n.children && n.children.length === 0) {
          delete n.children;
        } else if (n.children) {
          cleanup(n.children);
        }
      });
    };
    cleanup(roots);

    await this.redis.setJson(CacheKey.region, roots, CacheTTL.REGION);
    return roots;
  }

  /** 按父 code 取子级（用于级联懒加载） */
  async children(parentCode: string) {
    return this.repo.find({
      where: { parentCode },
      order: { code: 'ASC' },
    });
  }

  /** 根据若干 code 取名字（订单收货地址快照用） */
  async pickNames(codes: string[]): Promise<Record<string, string>> {
    if (codes.length === 0) return {};
    const list = await this.repo.find({ where: { code: In(codes) } });
    const map: Record<string, string> = {};
    list.forEach((r) => (map[r.code] = r.name));
    return map;
  }

  /** 校验「省/市/区」三个 code 关系合法 */
  async validateChain(provinceCode: string, cityCode: string, districtCode: string) {
    const list = await this.repo.find({
      where: { code: In([provinceCode, cityCode, districtCode]) },
    });
    const map = new Map(list.map((r) => [r.code, r]));
    const province = map.get(provinceCode);
    const city = map.get(cityCode);
    const district = map.get(districtCode);
    if (!province || !city || !district) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, '区域编码不存在');
    }
    if (province.level !== 1 || city.level !== 2 || district.level !== 3) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, '区域层级不正确');
    }
    if (city.parentCode !== province.code || district.parentCode !== city.code) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, '区域归属不匹配');
    }
    return { province, city, district };
  }

  /** 清缓存 */
  async clearCache() {
    await this.redis.del(CacheKey.region);
  }
}
