import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Like, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { ErrorCode } from '@common/constants/error-code';
import { BusinessException } from '@common/exceptions/business.exception';

import { AdminEntity } from '@modules/system/entities/admin.entity';
import { AdminRoleEntity } from '@modules/system/entities/admin-role.entity';
import { RoleEntity } from '@modules/system/entities/role.entity';
import { AuthService } from '@modules/auth/auth.service';

import {
  AdminQueryDto,
  CreateAdminDto,
  ResetPasswordDto,
  UpdateAdminDto,
} from './dto/admin.dto';

const SUPER_ROLE_NAME = '超级管理员';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(AdminEntity) private readonly adminRepo: Repository<AdminEntity>,
    @InjectRepository(AdminRoleEntity)
    private readonly adminRoleRepo: Repository<AdminRoleEntity>,
    @InjectRepository(RoleEntity) private readonly roleRepo: Repository<RoleEntity>,
    private readonly auth: AuthService,
    private readonly ds: DataSource,
  ) {}

  /** 分页列表 */
  async page(query: AdminQueryDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const where: any = { deletedAt: IsNull() };
    if (query.username) where.username = Like(`%${query.username}%`);
    if (query.nickname) where.nickname = Like(`%${query.nickname}%`);
    if (query.status !== undefined) where.status = query.status;

    const [list, total] = await this.adminRepo.findAndCount({
      where,
      order: { id: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // 拼角色名
    const adminIds = list.map((a) => a.id);
    const arRows =
      adminIds.length > 0
        ? await this.adminRoleRepo.find({ where: { adminId: In(adminIds) } })
        : [];
    const roleIds = [...new Set(arRows.map((r) => r.roleId))];
    const roles =
      roleIds.length > 0 ? await this.roleRepo.find({ where: { id: In(roleIds) } }) : [];
    const roleMap = new Map(roles.map((r) => [r.id, r.name]));

    const data = list.map((a) => {
      const myRoleIds = arRows.filter((r) => r.adminId === a.id).map((r) => r.roleId);
      return {
        id: a.id,
        username: a.username,
        nickname: a.nickname,
        avatar: a.avatar,
        status: a.status,
        mustChangePwd: a.mustChangePwd === 1,
        roles: myRoleIds.map((rid) => ({ id: rid, name: roleMap.get(rid) || '' })),
        createdAt: a.createdAt,
      };
    });

    return { list: data, total, page, pageSize };
  }

  /** 详情 */
  async detail(id: number) {
    const admin = await this.adminRepo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!admin) throw new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND);
    const ars = await this.adminRoleRepo.find({ where: { adminId: id } });
    const roleIds = ars.map((r) => r.roleId);
    return {
      id: admin.id,
      username: admin.username,
      nickname: admin.nickname,
      avatar: admin.avatar,
      status: admin.status,
      mustChangePwd: admin.mustChangePwd === 1,
      roleIds,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };
  }

  /** 创建 */
  async create(dto: CreateAdminDto) {
    const exist = await this.adminRepo.findOne({
      where: { username: dto.username, deletedAt: IsNull() },
    });
    if (exist) throw new BusinessException(ErrorCode.DATA_CONFLICT, '用户名已存在');

    await this.assertRolesExistAndNotSuper(dto.roleIds, '不能直接分配超级管理员角色');

    const hash = await bcrypt.hash(dto.password, 10);

    return this.ds.transaction(async (mgr) => {
      const saved = await mgr.getRepository(AdminEntity).save(
        mgr.getRepository(AdminEntity).create({
          username: dto.username,
          password: hash,
          nickname: dto.nickname || dto.username,
          avatar: dto.avatar || '',
          status: dto.status ?? 1,
          mustChangePwd: 0,
        }),
      );
      if (dto.roleIds.length) {
        await mgr.getRepository(AdminRoleEntity).insert(
          dto.roleIds.map((roleId) => ({ adminId: saved.id, roleId })),
        );
      }
      return { id: saved.id };
    });
  }

  /** 更新 */
  async update(id: number, dto: UpdateAdminDto, operatorId: number) {
    const admin = await this.adminRepo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!admin) throw new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND);

    const isSuper = await this.isSuperAdmin(id);

    // 不能禁用自己
    if (id === operatorId && dto.status === 0) {
      throw new BusinessException(ErrorCode.CANNOT_DISABLE_SELF);
    }
    // 超管不可被禁用 / 改角色
    if (isSuper) {
      if (dto.status === 0) {
        throw new BusinessException(ErrorCode.SUPER_ADMIN_PROTECTED, '超级管理员不可禁用');
      }
      if (dto.roleIds) {
        throw new BusinessException(ErrorCode.SUPER_ADMIN_PROTECTED, '超级管理员角色不可修改');
      }
    }

    if (dto.roleIds) {
      await this.assertRolesExistAndNotSuper(dto.roleIds, '不能直接分配超级管理员角色');
    }

    await this.ds.transaction(async (mgr) => {
      const patch: Partial<AdminEntity> = {};
      if (dto.nickname !== undefined) patch.nickname = dto.nickname;
      if (dto.avatar !== undefined) patch.avatar = dto.avatar;
      if (dto.status !== undefined) patch.status = dto.status;
      if (Object.keys(patch).length) {
        await mgr.getRepository(AdminEntity).update(id, patch);
      }
      if (dto.roleIds) {
        await mgr.getRepository(AdminRoleEntity).delete({ adminId: id });
        if (dto.roleIds.length) {
          await mgr.getRepository(AdminRoleEntity).insert(
            dto.roleIds.map((roleId) => ({ adminId: id, roleId })),
          );
        }
      }
    });

    // 角色变更或被禁用：踢下线
    if (dto.roleIds || dto.status === 0) {
      await this.auth.kickAdmin(id);
    }
    return { ok: true };
  }

  /** 重置密码（管理员重置他人密码，强制首次改密） */
  async resetPassword(id: number, dto: ResetPasswordDto) {
    const admin = await this.adminRepo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!admin) throw new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND);

    const hash = await bcrypt.hash(dto.newPassword, 10);
    await this.adminRepo.update(id, { password: hash, mustChangePwd: 1 });
    await this.auth.kickAdmin(id);
    return { ok: true };
  }

  /** 启用/禁用 */
  async toggleStatus(id: number, status: number, operatorId: number) {
    if (![0, 1].includes(status)) {
      throw new BusinessException(ErrorCode.PARAM_INVALID);
    }
    if (id === operatorId && status === 0) {
      throw new BusinessException(ErrorCode.CANNOT_DISABLE_SELF);
    }
    const admin = await this.adminRepo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!admin) throw new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND);

    if (status === 0 && (await this.isSuperAdmin(id))) {
      throw new BusinessException(ErrorCode.SUPER_ADMIN_PROTECTED, '超级管理员不可禁用');
    }

    await this.adminRepo.update(id, { status });
    if (status === 0) await this.auth.kickAdmin(id);
    return { ok: true };
  }

  /** 强制下线 */
  async kick(id: number, operatorId: number) {
    if (id === operatorId) {
      throw new BusinessException(ErrorCode.OPERATION_NOT_ALLOWED, '不能将自己踢下线');
    }
    const admin = await this.adminRepo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!admin) throw new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND);
    const removed = await this.auth.kickAdmin(id);
    return { removed };
  }

  /** 删除（软删） */
  async remove(id: number, operatorId: number) {
    if (id === operatorId) throw new BusinessException(ErrorCode.CANNOT_DELETE_SELF);
    const admin = await this.adminRepo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!admin) throw new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND);
    if (await this.isSuperAdmin(id)) {
      throw new BusinessException(ErrorCode.SUPER_ADMIN_PROTECTED, '超级管理员不可删除');
    }

    await this.ds.transaction(async (mgr) => {
      await mgr.getRepository(AdminRoleEntity).delete({ adminId: id });
      await mgr.getRepository(AdminEntity).softDelete(id);
    });
    await this.auth.kickAdmin(id);
    return { ok: true };
  }

  // ==================== 工具 ====================

  private async assertRolesExistAndNotSuper(roleIds: number[], errMsg: string) {
    if (roleIds.length === 0) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, '必须分配至少 1 个角色');
    }
    const roles = await this.roleRepo.find({ where: { id: In(roleIds) } });
    if (roles.length !== roleIds.length) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, '存在无效的角色 ID');
    }
    if (roles.some((r) => r.name === SUPER_ROLE_NAME)) {
      throw new BusinessException(ErrorCode.SUPER_ADMIN_PROTECTED, errMsg);
    }
  }

  private async isSuperAdmin(adminId: number): Promise<boolean> {
    const ars = await this.adminRoleRepo.find({ where: { adminId } });
    if (ars.length === 0) return false;
    const roleIds = ars.map((r) => r.roleId);
    const roles = await this.roleRepo.find({ where: { id: In(roleIds) } });
    return roles.some((r) => r.name === SUPER_ROLE_NAME);
  }
}
