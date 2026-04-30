import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';

import { ErrorCode } from '@common/constants/error-code';
import { BusinessException } from '@common/exceptions/business.exception';
import { CacheKey, CacheTTL } from '@common/constants/cache-key';
import { RedisService } from '@shared/redis/redis.service';

import { GoodsEntity } from '@modules/goods/entities/goods.entity';

import { CategoryEntity } from './entities/category.entity';
import {
  BatchSortDto,
  CategoryQueryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/category.dto';

const MAX_LEVEL = 3;

interface CategoryTreeNode {
  id: number;
  parentId: number;
  name: string;
  icon: string;
  sort: number;
  status: number;
  level: number;
  children?: CategoryTreeNode[];
}

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly repo: Repository<CategoryEntity>,
    @InjectRepository(GoodsEntity)
    private readonly goodsRepo: Repository<GoodsEntity>,
    private readonly redis: RedisService,
  ) {}

  // ==================== 查询 ====================

  /** B 端：列表（支持父节点过滤、关键词、状态） */
  async list(query: CategoryQueryDto) {
    const where: any = {};
    if (query.parentId !== undefined) where.parentId = query.parentId;
    if (query.status !== undefined) where.status = query.status;
    if (query.keyword) where.name = Like(`%${query.keyword}%`);

    return this.repo.find({
      where,
      order: { sort: 'ASC', id: 'ASC' },
    });
  }

  /** B 端：全树（含禁用） */
  async treeAdmin(): Promise<CategoryTreeNode[]> {
    const all = await this.repo.find({ order: { sort: 'ASC', id: 'ASC' } });
    return this.buildTree(all);
  }

  /** C 端：仅启用，带缓存 */
  async treePublic(): Promise<CategoryTreeNode[]> {
    const cached = await this.redis.getJson<CategoryTreeNode[]>(CacheKey.categoryTree);
    if (cached) return cached;

    const all = await this.repo.find({
      where: { status: 1 },
      order: { sort: 'ASC', id: 'ASC' },
    });
    const tree = this.buildTree(all);
    await this.redis.setJson(CacheKey.categoryTree, tree, CacheTTL.CATEGORY_TREE);
    return tree;
  }

  async detail(id: number) {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, '分类不存在');
    return c;
  }

  // ==================== 写入 ====================

  async create(dto: CreateCategoryDto) {
    await this.assertParentValid(dto.parentId);
    await this.assertNameUnique(dto.parentId, dto.name);

    const saved = await this.repo.save(
      this.repo.create({
        parentId: dto.parentId,
        name: dto.name,
        icon: dto.icon || '',
        sort: dto.sort ?? 0,
        status: dto.status ?? 1,
      }),
    );
    await this.invalidateCache();
    return saved;
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, '分类不存在');

    // 改变 parent：禁止把自己挂到自身或自身后代下，且层级不能超
    if (dto.parentId !== undefined && dto.parentId !== c.parentId) {
      if (dto.parentId === id) {
        throw new BusinessException(ErrorCode.PARAM_INVALID, '不能将自身设为父节点');
      }
      const descendants = await this.collectDescendantIds(id);
      if (descendants.has(dto.parentId)) {
        throw new BusinessException(ErrorCode.PARAM_INVALID, '不能挂到自己的子节点下');
      }
      await this.assertParentValid(dto.parentId, id);
    }

    if (dto.name !== undefined && dto.name !== c.name) {
      const targetParent = dto.parentId ?? c.parentId;
      await this.assertNameUnique(targetParent, dto.name, id);
    }

    await this.repo.update(id, {
      ...(dto.parentId !== undefined && { parentId: dto.parentId }),
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.icon !== undefined && { icon: dto.icon }),
      ...(dto.sort !== undefined && { sort: dto.sort }),
      ...(dto.status !== undefined && { status: dto.status }),
    });
    await this.invalidateCache();
    return { ok: true };
  }

  async remove(id: number) {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, '分类不存在');

    const childCount = await this.repo.count({ where: { parentId: id } });
    if (childCount > 0) {
      throw new BusinessException(ErrorCode.CATEGORY_HAS_CHILDREN);
    }
    const goodsCount = await this.goodsRepo.count({ where: { categoryId: id } });
    if (goodsCount > 0) {
      throw new BusinessException(ErrorCode.CATEGORY_HAS_GOODS);
    }

    await this.repo.delete(id);
    await this.invalidateCache();
    return { ok: true };
  }

  /** 拖拽排序：批量更新 sort */
  async batchSort(dto: BatchSortDto) {
    const ids = dto.items.map((i) => i.id);
    const found = await this.repo.find({ where: { id: In(ids) } });
    if (found.length !== ids.length) {
      throw new BusinessException(ErrorCode.DATA_NOT_FOUND, '存在无效分类 id');
    }
    for (const it of dto.items) {
      await this.repo.update(it.id, { sort: it.sort });
    }
    await this.invalidateCache();
    return { ok: true };
  }

  /** 启用/禁用 */
  async toggleStatus(id: number, status: number) {
    if (status !== 0 && status !== 1) {
      throw new BusinessException(ErrorCode.PARAM_INVALID);
    }
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, '分类不存在');
    await this.repo.update(id, { status });
    await this.invalidateCache();
    return { ok: true };
  }

  // ==================== 工具 ====================

  /** 计算层级（root=0），并校验父节点存在、未禁用、不超过最大层级 */
  private async assertParentValid(parentId: number, selfId?: number): Promise<number> {
    if (parentId === 0) return 1; // 根分类，新节点层级=1
    const parent = await this.repo.findOne({ where: { id: parentId } });
    if (!parent) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, '父分类不存在');
    if (selfId && parent.id === selfId) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, '不能将自身设为父节点');
    }
    const parentLevel = await this.calcLevel(parent.id);
    if (parentLevel >= MAX_LEVEL) {
      throw new BusinessException(
        ErrorCode.OPERATION_NOT_ALLOWED,
        `分类层级最多 ${MAX_LEVEL} 级`,
      );
    }
    return parentLevel + 1;
  }

  private async assertNameUnique(parentId: number, name: string, excludeId?: number) {
    const exist = await this.repo.findOne({ where: { parentId, name } });
    if (exist && exist.id !== excludeId) {
      throw new BusinessException(ErrorCode.DATA_CONFLICT, '同级下分类名称重复');
    }
  }

  /** 沿 parent 向上数层级 */
  private async calcLevel(id: number): Promise<number> {
    let level = 0;
    let cur = await this.repo.findOne({ where: { id } });
    while (cur) {
      level++;
      if (cur.parentId === 0) break;
      cur = await this.repo.findOne({ where: { id: cur.parentId } });
    }
    return level;
  }

  /** 收集所有后代 id（不含自身） */
  private async collectDescendantIds(rootId: number): Promise<Set<number>> {
    const all = await this.repo.find({ select: ['id', 'parentId'] });
    const childMap = new Map<number, number[]>();
    all.forEach((c) => {
      if (!childMap.has(c.parentId)) childMap.set(c.parentId, []);
      childMap.get(c.parentId)!.push(c.id);
    });
    const result = new Set<number>();
    const dfs = (pid: number) => {
      const children = childMap.get(pid) || [];
      children.forEach((cid) => {
        result.add(cid);
        dfs(cid);
      });
    };
    dfs(rootId);
    return result;
  }

  private buildTree(all: CategoryEntity[]): CategoryTreeNode[] {
    const map = new Map<number, CategoryTreeNode>();
    all.forEach((c) => {
      map.set(c.id, {
        id: c.id,
        parentId: c.parentId,
        name: c.name,
        icon: c.icon,
        sort: c.sort,
        status: c.status,
        level: 0,
        children: [],
      });
    });

    const roots: CategoryTreeNode[] = [];
    map.forEach((node) => {
      if (node.parentId === 0 || !map.has(node.parentId)) {
        node.level = 1;
        roots.push(node);
      } else {
        const parent = map.get(node.parentId)!;
        node.level = (parent.level || 1) + 1;
        parent.children!.push(node);
      }
    });

    const cleanup = (arr: CategoryTreeNode[]) => {
      arr.forEach((n) => {
        if (n.children && n.children.length === 0) {
          delete n.children;
        } else if (n.children) {
          cleanup(n.children);
        }
      });
    };
    cleanup(roots);
    return roots;
  }

  async invalidateCache() {
    await this.redis.del(CacheKey.categoryTree);
  }
}
