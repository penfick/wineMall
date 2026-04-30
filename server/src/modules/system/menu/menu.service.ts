import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';

import { ErrorCode } from '@common/constants/error-code';
import { BusinessException } from '@common/exceptions/business.exception';
import { RedisService } from '@shared/redis/redis.service';
import { CacheKey } from '@common/constants/cache-key';

import { MenuEntity } from '@modules/system/entities/menu.entity';
import { RoleMenuEntity } from '@modules/system/entities/role-menu.entity';

import { CreateMenuDto, MenuQueryDto, UpdateMenuDto } from './dto/menu.dto';

interface MenuTreeNode extends MenuEntity {
  children?: MenuTreeNode[];
}

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuEntity) private readonly menuRepo: Repository<MenuEntity>,
    @InjectRepository(RoleMenuEntity)
    private readonly roleMenuRepo: Repository<RoleMenuEntity>,
    private readonly redis: RedisService,
  ) {}

  /** 列表（树） */
  async tree(query: MenuQueryDto): Promise<MenuTreeNode[]> {
    const where: any = {};
    if (query.name) where.name = Like(`%${query.name}%`);
    if (query.status !== undefined) where.status = query.status;
    const list = await this.menuRepo.find({
      where,
      order: { sort: 'ASC', id: 'ASC' },
    });
    // 当走筛选时，仍以全树形式返回（先取全集再标记，避免树结构断裂）
    if (!query.name && query.status === undefined) {
      return this.buildTree(list);
    }
    // 有筛选时只返回扁平列表，前端自己处理
    return list as MenuTreeNode[];
  }

  /** 详情 */
  async detail(id: number) {
    const menu = await this.menuRepo.findOne({ where: { id } });
    if (!menu) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
    return menu;
  }

  /** 创建 */
  async create(dto: CreateMenuDto) {
    if (dto.parentId !== 0) {
      const parent = await this.menuRepo.findOne({ where: { id: dto.parentId } });
      if (!parent) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, '父菜单不存在');
      // 目录(1) 下只能挂目录/菜单；菜单(2) 下只能挂按钮(3)；按钮(3) 不能再挂
      if (parent.type === 3) {
        throw new BusinessException(ErrorCode.OPERATION_NOT_ALLOWED, '按钮下不能添加子菜单');
      }
      if (parent.type === 2 && dto.type !== 3) {
        throw new BusinessException(
          ErrorCode.OPERATION_NOT_ALLOWED,
          '菜单下只能添加按钮',
        );
      }
    } else {
      // 根节点必须是目录
      if (dto.type !== 1) {
        throw new BusinessException(ErrorCode.OPERATION_NOT_ALLOWED, '根节点必须是目录');
      }
    }

    if (dto.permission) {
      const exist = await this.menuRepo.findOne({ where: { permission: dto.permission } });
      if (exist) throw new BusinessException(ErrorCode.DATA_CONFLICT, '权限标识已存在');
    }

    const saved = await this.menuRepo.save(
      this.menuRepo.create({
        parentId: dto.parentId,
        name: dto.name,
        type: dto.type,
        path: dto.path || '',
        component: dto.component || '',
        permission: dto.permission || '',
        icon: dto.icon || '',
        sort: dto.sort ?? 0,
        status: dto.status ?? 1,
      }),
    );
    await this.invalidateAllAdminCache();
    return saved;
  }

  /** 更新 */
  async update(id: number, dto: UpdateMenuDto) {
    const menu = await this.menuRepo.findOne({ where: { id } });
    if (!menu) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);

    // 不能把自己挂到自己或自己的子节点下
    if (dto.parentId !== undefined && dto.parentId !== menu.parentId) {
      if (dto.parentId === id) {
        throw new BusinessException(ErrorCode.OPERATION_NOT_ALLOWED, '不能将菜单设为自己的子节点');
      }
      if (dto.parentId !== 0) {
        const parent = await this.menuRepo.findOne({ where: { id: dto.parentId } });
        if (!parent) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, '父菜单不存在');
        const descendants = await this.collectDescendantIds(id);
        if (descendants.has(dto.parentId)) {
          throw new BusinessException(
            ErrorCode.OPERATION_NOT_ALLOWED,
            '不能将菜单移动到自己的子树下',
          );
        }
      }
    }

    if (dto.permission && dto.permission !== menu.permission) {
      const exist = await this.menuRepo.findOne({ where: { permission: dto.permission } });
      if (exist && exist.id !== id) {
        throw new BusinessException(ErrorCode.DATA_CONFLICT, '权限标识已存在');
      }
    }

    Object.assign(menu, {
      ...(dto.parentId !== undefined && { parentId: dto.parentId }),
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.path !== undefined && { path: dto.path }),
      ...(dto.component !== undefined && { component: dto.component }),
      ...(dto.permission !== undefined && { permission: dto.permission }),
      ...(dto.icon !== undefined && { icon: dto.icon }),
      ...(dto.sort !== undefined && { sort: dto.sort }),
      ...(dto.status !== undefined && { status: dto.status }),
    });
    const saved = await this.menuRepo.save(menu);
    await this.invalidateAllAdminCache();
    return saved;
  }

  /** 删除 */
  async remove(id: number) {
    const menu = await this.menuRepo.findOne({ where: { id } });
    if (!menu) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);

    const childCount = await this.menuRepo.count({ where: { parentId: id } });
    if (childCount > 0) throw new BusinessException(ErrorCode.MENU_HAS_CHILDREN);

    // 同步清理 role_menus
    await this.roleMenuRepo.delete({ menuId: id });
    await this.menuRepo.delete(id);
    await this.invalidateAllAdminCache();
    return { ok: true };
  }

  // ==================== 工具 ====================

  private buildTree(list: MenuEntity[]): MenuTreeNode[] {
    const map = new Map<number, MenuTreeNode>();
    const items: MenuTreeNode[] = list.map((m) => ({ ...m, children: [] }));
    items.forEach((it) => map.set(it.id, it));

    const roots: MenuTreeNode[] = [];
    items.forEach((it) => {
      if (it.parentId === 0 || !map.has(it.parentId)) {
        roots.push(it);
      } else {
        map.get(it.parentId)!.children!.push(it);
      }
    });

    const cleanup = (arr: MenuTreeNode[]) => {
      arr.sort((a, b) => a.sort - b.sort || a.id - b.id);
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

  private async collectDescendantIds(rootId: number): Promise<Set<number>> {
    const all = await this.menuRepo.find();
    const childMap = new Map<number, number[]>();
    all.forEach((m) => {
      if (!childMap.has(m.parentId)) childMap.set(m.parentId, []);
      childMap.get(m.parentId)!.push(m.id);
    });
    const set = new Set<number>();
    const dfs = (pid: number) => {
      const children = childMap.get(pid) || [];
      for (const cid of children) {
        set.add(cid);
        dfs(cid);
      }
    };
    dfs(rootId);
    return set;
  }

  /** 菜单/权限有变更时，清空所有管理员的菜单/ability 缓存（强制下次访问重算） */
  private async invalidateAllAdminCache() {
    const menuKeys = await this.redis.scanKeys('admin:menu:*');
    const abilityKeys = await this.redis.scanKeys('admin:ability:*');
    const all = [...menuKeys, ...abilityKeys];
    if (all.length) await this.redis.del(...all);
    // 也清掉某些可能依赖菜单的缓存（dict/region 不依赖，跳过）
    void CacheKey;
  }
}
