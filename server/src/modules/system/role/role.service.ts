import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Like, Repository } from 'typeorm';

import { ErrorCode } from '@common/constants/error-code';
import { BusinessException } from '@common/exceptions/business.exception';
import { RedisService } from '@shared/redis/redis.service';

import { RoleEntity } from '@modules/system/entities/role.entity';
import { RoleMenuEntity } from '@modules/system/entities/role-menu.entity';
import { AdminRoleEntity } from '@modules/system/entities/admin-role.entity';
import { MenuEntity } from '@modules/system/entities/menu.entity';

import {
  AssignMenuDto,
  CreateRoleDto,
  RoleQueryDto,
  UpdateRoleDto,
} from './dto/role.dto';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(RoleEntity) private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(RoleMenuEntity)
    private readonly roleMenuRepo: Repository<RoleMenuEntity>,
    @InjectRepository(AdminRoleEntity)
    private readonly adminRoleRepo: Repository<AdminRoleEntity>,
    @InjectRepository(MenuEntity) private readonly menuRepo: Repository<MenuEntity>,
    private readonly redis: RedisService,
    private readonly ds: DataSource,
  ) {}

  /** 分页列表 */
  async page(query: RoleQueryDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const where: any = {};
    if (query.name) where.name = Like(`%${query.name}%`);

    const [list, total] = await this.roleRepo.findAndCount({
      where,
      order: { id: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total, page, pageSize };
  }

  /** 全部角色（用于下拉） */
  all() {
    return this.roleRepo.find({ order: { id: 'ASC' } });
  }

  /** 详情（含菜单 ID） */
  async detail(id: number) {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
    const rms = await this.roleMenuRepo.find({ where: { roleId: id } });
    return { ...role, menuIds: rms.map((r) => r.menuId) };
  }

  /** 创建 */
  async create(dto: CreateRoleDto) {
    const exist = await this.roleRepo.findOne({ where: { name: dto.name } });
    if (exist) throw new BusinessException(ErrorCode.DATA_CONFLICT, '角色名已存在');

    const menuIds = await this.validateMenuIds(dto.menuIds);

    return this.ds.transaction(async (mgr) => {
      const saved = await mgr.getRepository(RoleEntity).save(
        mgr.getRepository(RoleEntity).create({
          name: dto.name,
          description: dto.description || '',
          isSystem: 0,
        }),
      );
      if (menuIds.length) {
        await mgr.getRepository(RoleMenuEntity).insert(
          menuIds.map((menuId) => ({ roleId: saved.id, menuId })),
        );
      }
      return saved;
    });
  }

  /** 更新 */
  async update(id: number, dto: UpdateRoleDto) {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);

    // 系统内置角色：禁止改名/改菜单（描述允许）
    if (role.isSystem === 1) {
      if (dto.name && dto.name !== role.name) {
        throw new BusinessException(ErrorCode.OPERATION_NOT_ALLOWED, '内置角色名称不可修改');
      }
      if (role.name === '超级管理员' && dto.menuIds) {
        throw new BusinessException(
          ErrorCode.OPERATION_NOT_ALLOWED,
          '超级管理员菜单受保护，禁止修改',
        );
      }
    }

    if (dto.name && dto.name !== role.name) {
      const exist = await this.roleRepo.findOne({ where: { name: dto.name } });
      if (exist && exist.id !== id) {
        throw new BusinessException(ErrorCode.DATA_CONFLICT, '角色名已存在');
      }
    }

    let menuIds: number[] | undefined;
    if (dto.menuIds) {
      menuIds = await this.validateMenuIds(dto.menuIds);
    }

    await this.ds.transaction(async (mgr) => {
      await mgr.getRepository(RoleEntity).update(id, {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      });

      if (menuIds) {
        await mgr.getRepository(RoleMenuEntity).delete({ roleId: id });
        if (menuIds.length) {
          await mgr.getRepository(RoleMenuEntity).insert(
            menuIds.map((menuId) => ({ roleId: id, menuId })),
          );
        }
      }
    });

    if (menuIds) await this.invalidateAdminCacheByRole(id);
    return { ok: true };
  }

  /** 仅分配菜单 */
  async assignMenus(id: number, dto: AssignMenuDto) {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
    if (role.name === '超级管理员') {
      throw new BusinessException(
        ErrorCode.OPERATION_NOT_ALLOWED,
        '超级管理员菜单受保护，禁止修改',
      );
    }

    const menuIds = await this.validateMenuIds(dto.menuIds);

    await this.ds.transaction(async (mgr) => {
      await mgr.getRepository(RoleMenuEntity).delete({ roleId: id });
      if (menuIds.length) {
        await mgr.getRepository(RoleMenuEntity).insert(
          menuIds.map((menuId) => ({ roleId: id, menuId })),
        );
      }
    });

    await this.invalidateAdminCacheByRole(id);
    return { ok: true };
  }

  /** 删除 */
  async remove(id: number) {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
    if (role.isSystem === 1) {
      throw new BusinessException(ErrorCode.OPERATION_NOT_ALLOWED, '内置角色不可删除');
    }

    const used = await this.adminRoleRepo.count({ where: { roleId: id } });
    if (used > 0) throw new BusinessException(ErrorCode.ROLE_HAS_USER);

    await this.ds.transaction(async (mgr) => {
      await mgr.getRepository(RoleMenuEntity).delete({ roleId: id });
      await mgr.getRepository(RoleEntity).delete(id);
    });
    return { ok: true };
  }

  // ==================== 工具 ====================

  private async validateMenuIds(menuIds?: number[]): Promise<number[]> {
    if (!menuIds || menuIds.length === 0) return [];
    const found = await this.menuRepo.find({ where: { id: In(menuIds) } });
    if (found.length !== menuIds.length) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, '存在无效的菜单 ID');
    }
    return menuIds;
  }

  /** 角色菜单变更后，清掉所有持有该角色的管理员的 ability/menu 缓存 */
  private async invalidateAdminCacheByRole(roleId: number) {
    const adminRoles = await this.adminRoleRepo.find({ where: { roleId } });
    const adminIds = [...new Set(adminRoles.map((ar) => ar.adminId))];
    if (!adminIds.length) return;

    const keys: string[] = [];
    for (const aid of adminIds) {
      keys.push(`admin:ability:${aid}`);
      keys.push(`admin:menu:${aid}`);
    }
    await this.redis.del(...keys);
  }
}
