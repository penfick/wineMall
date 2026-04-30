import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import * as crypto from 'crypto';

import { RedisService } from '@shared/redis/redis.service';
import { CacheKey, CacheTTL } from '@common/constants/cache-key';
import { ErrorCode } from '@common/constants/error-code';
import {
  BusinessException,
  UnauthorizedException,
} from '@common/exceptions/business.exception';
import type { CurrentUserPayload } from '@common/decorators/current-user.decorator';

import { AdminEntity } from '@modules/system/entities/admin.entity';
import { AdminRoleEntity } from '@modules/system/entities/admin-role.entity';
import { RoleEntity } from '@modules/system/entities/role.entity';
import { RoleMenuEntity } from '@modules/system/entities/role-menu.entity';
import { MenuEntity } from '@modules/system/entities/menu.entity';
import { LoginLogEntity } from '@modules/system/entities/login-log.entity';
import { UserEntity } from '@modules/user/entities/user.entity';

import { AdminLoginDto } from './dto/admin-login.dto';
import { WechatLoginDto } from './dto/wechat-login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const SUPER_ROLE_NAME = '超级管理员';
const MAX_LOGIN_FAIL = 5;
const LOGIN_LOCK_SECONDS = 30 * 60; // 30 分钟

interface MenuTreeItem {
  id: number;
  parentId: number;
  name: string;
  type: number;
  path: string;
  component: string;
  icon: string;
  sort: number;
  permission: string;
  children?: MenuTreeItem[];
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly ds: DataSource,
    @InjectRepository(AdminEntity) private readonly adminRepo: Repository<AdminEntity>,
    @InjectRepository(AdminRoleEntity)
    private readonly adminRoleRepo: Repository<AdminRoleEntity>,
    @InjectRepository(RoleEntity) private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(RoleMenuEntity)
    private readonly roleMenuRepo: Repository<RoleMenuEntity>,
    @InjectRepository(MenuEntity) private readonly menuRepo: Repository<MenuEntity>,
    @InjectRepository(LoginLogEntity)
    private readonly loginLogRepo: Repository<LoginLogEntity>,
    @InjectRepository(UserEntity) private readonly userRepo: Repository<UserEntity>,
  ) {}

  // ============================================================
  // B 端：管理员登录
  // ============================================================
  async adminLogin(dto: AdminLoginDto, ip: string, userAgent: string) {
    const failKey = CacheKey.loginFail('admin', `${dto.username}:${ip}`);
    const fails = parseInt((await this.redis.get(failKey)) || '0', 10);
    if (fails >= MAX_LOGIN_FAIL) {
      throw new BusinessException(ErrorCode.LOGIN_TOO_MANY);
    }

    // password 字段 select:false，必须显式 addSelect
    const admin = await this.adminRepo
      .createQueryBuilder('a')
      .addSelect('a.password')
      .where('a.username = :username', { username: dto.username })
      .andWhere('a.deleted_at IS NULL')
      .getOne();

    if (!admin) {
      await this.recordFail(failKey, dto.username, ip, userAgent, '账号不存在');
      throw new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND);
    }
    if (admin.status !== 1) {
      await this.recordFail(failKey, dto.username, ip, userAgent, '账号已禁用');
      throw new BusinessException(ErrorCode.ACCOUNT_DISABLED);
    }

    const ok = await bcrypt.compare(dto.password, admin.password);
    if (!ok) {
      await this.recordFail(failKey, dto.username, ip, userAgent, '密码错误');
      throw new BusinessException(ErrorCode.PASSWORD_WRONG);
    }

    // 登录成功：清失败计数
    await this.redis.del(failKey);

    const isSuper = await this.isSuperAdmin(admin.id);
    const token = uuid().replace(/-/g, '');
    const payload = { id: admin.id, username: admin.username, isSuper };
    await this.redis.setJson(CacheKey.adminToken(token), payload, CacheTTL.ADMIN_TOKEN);

    // 写 ability 缓存（超管不写，PermissionGuard 直接放行）
    if (!isSuper) {
      await this.refreshAdminAbility(admin.id);
    }

    // 写登录日志
    await this.loginLogRepo.insert({
      username: admin.username,
      ip,
      userAgent,
      result: 1,
      failReason: '',
    });

    return {
      token,
      tokenType: 'Bearer',
      expiresIn: CacheTTL.ADMIN_TOKEN,
      adminInfo: {
        id: admin.id,
        username: admin.username,
        nickname: admin.nickname,
        avatar: admin.avatar,
        isSuper,
        mustChangePwd: admin.mustChangePwd === 1,
      },
    };
  }

  private async recordFail(
    failKey: string,
    username: string,
    ip: string,
    userAgent: string,
    reason: string,
  ) {
    const cur = await this.redis.incr(failKey);
    if (cur === 1) await this.redis.expire(failKey, LOGIN_LOCK_SECONDS);

    await this.loginLogRepo
      .insert({ username, ip, userAgent, result: 0, failReason: reason })
      .catch((err) => this.logger.warn('写登录日志失败：' + err.message));
  }

  // ============================================================
  // C 端：微信 mock 登录
  // ============================================================
  async wechatLogin(dto: WechatLoginDto, ip: string, userAgent: string) {
    // mock：用 code 派生稳定 openid，方便联调（同一 code 同一账号）
    const openid = 'mock_' + crypto.createHash('sha1').update(dto.code).digest('hex').slice(0, 16);

    let user = await this.userRepo.findOne({
      where: { openid, deletedAt: IsNull() },
    });

    if (!user) {
      user = await this.userRepo.save(
        this.userRepo.create({
          openid,
          nickname: dto.nickname || '微信用户',
          avatar: dto.avatar || '',
          phone: null,
          status: 1,
        }),
      );
      this.logger.log(`新用户注册（mock）：openid=${openid} userId=${user.id}`);
    } else {
      if (user.status !== 1) {
        throw new BusinessException(ErrorCode.ACCOUNT_DISABLED);
      }
      // 二次登录时如果传了昵称头像，做一次更新
      const patch: Partial<UserEntity> = {};
      if (dto.nickname && dto.nickname !== user.nickname) patch.nickname = dto.nickname;
      if (dto.avatar && dto.avatar !== user.avatar) patch.avatar = dto.avatar;
      if (Object.keys(patch).length) {
        await this.userRepo.update(user.id, patch);
        Object.assign(user, patch);
      }
    }

    const token = uuid().replace(/-/g, '');
    const payload = { id: user.id, openid: user.openid };
    await this.redis.setJson(CacheKey.userToken(token), payload, CacheTTL.USER_TOKEN);

    void ip;
    void userAgent; // 用户登录暂不写日志，预留

    return {
      token,
      tokenType: 'Bearer',
      expiresIn: CacheTTL.USER_TOKEN,
      userInfo: {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        phone: user.phone,
      },
    };
  }

  // ============================================================
  // 注销
  // ============================================================
  async logout(user: CurrentUserPayload) {
    const key =
      user.source === 'admin' ? CacheKey.adminToken(user.token) : CacheKey.userToken(user.token);
    await this.redis.del(key);
    if (user.source === 'admin') {
      await this.redis.del(CacheKey.adminAbility(user.id), CacheKey.adminMenu(user.id));
    }
    return { ok: true };
  }

  // ============================================================
  // B 端：当前管理员资料
  // ============================================================
  async getAdminProfile(adminId: number) {
    const admin = await this.adminRepo.findOne({ where: { id: adminId } });
    if (!admin) throw new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND);

    const isSuper = await this.isSuperAdmin(adminId);
    const roleNames = await this.getAdminRoleNames(adminId);

    return {
      id: admin.id,
      username: admin.username,
      nickname: admin.nickname,
      avatar: admin.avatar,
      status: admin.status,
      isSuper,
      mustChangePwd: admin.mustChangePwd === 1,
      roles: roleNames,
      createdAt: admin.createdAt,
    };
  }

  // ============================================================
  // C 端：当前用户资料
  // ============================================================
  async getUserProfile(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId, deletedAt: IsNull() } });
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND);
    return {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      phone: user.phone,
      status: user.status,
      createdAt: user.createdAt,
    };
  }

  // ============================================================
  // 修改密码（B 端管理员）
  // ============================================================
  async changeAdminPassword(adminId: number, dto: ChangePasswordDto) {
    if (dto.oldPassword === dto.newPassword) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, '新密码不能与旧密码相同');
    }
    const admin = await this.adminRepo
      .createQueryBuilder('a')
      .addSelect('a.password')
      .where('a.id = :id', { id: adminId })
      .getOne();
    if (!admin) throw new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND);

    const ok = await bcrypt.compare(dto.oldPassword, admin.password);
    if (!ok) throw new BusinessException(ErrorCode.PASSWORD_WRONG);

    const hash = await bcrypt.hash(dto.newPassword, 10);
    await this.adminRepo.update(adminId, { password: hash, mustChangePwd: 0 });

    // 改密后强制下线（清除该 admin 的所有 token）
    await this.kickAdmin(adminId);

    return { ok: true };
  }

  /** 更新管理员资料（昵称/头像） */
  async updateAdminProfile(
    adminId: number,
    patch: { nickname?: string; avatar?: string },
  ) {
    const dirty: Partial<AdminEntity> = {};
    if (patch.nickname !== undefined) dirty.nickname = patch.nickname;
    if (patch.avatar !== undefined) dirty.avatar = patch.avatar;
    if (Object.keys(dirty).length === 0) return { ok: true };
    await this.adminRepo.update(adminId, dirty);
    return { ok: true };
  }

  /** 更新用户资料 */
  async updateUserProfile(
    userId: number,
    patch: { nickname?: string; avatar?: string; phone?: string },
  ) {
    const dirty: Partial<UserEntity> = {};
    if (patch.nickname !== undefined) dirty.nickname = patch.nickname;
    if (patch.avatar !== undefined) dirty.avatar = patch.avatar;
    if (patch.phone !== undefined) dirty.phone = patch.phone;
    if (Object.keys(dirty).length === 0) return { ok: true };
    await this.userRepo.update(userId, dirty);
    return { ok: true };
  }

  /** 强制下线某个 admin（清掉它的所有 Token + ability + menu 缓存）*/
  async kickAdmin(adminId: number) {
    // 扫所有 admin:token:* 找匹配的（量级在万以内可接受；后续可改为 user→tokens 反向索引）
    const keys = await this.redis.scanKeys('admin:token:*');
    let removed = 0;
    for (const k of keys) {
      const raw = await this.redis.get(k);
      if (!raw) continue;
      try {
        const p = JSON.parse(raw) as { id: number };
        if (p.id === adminId) {
          await this.redis.del(k);
          removed++;
        }
      } catch {
        /* skip */
      }
    }
    await this.redis.del(CacheKey.adminAbility(adminId), CacheKey.adminMenu(adminId));
    this.logger.log(`kickAdmin adminId=${adminId} 清除 ${removed} 个 token`);
    return removed;
  }

  // ============================================================
  // 我的菜单（仅 B 端）
  // ============================================================
  async getMyMenu(adminId: number, isSuper: boolean): Promise<MenuTreeItem[]> {
    const cacheKey = CacheKey.adminMenu(adminId);
    const cached = await this.redis.getJson<MenuTreeItem[]>(cacheKey);
    if (cached) return cached;

    let menus: MenuEntity[];
    if (isSuper) {
      menus = await this.menuRepo.find({
        where: { status: 1 },
        order: { sort: 'ASC', id: 'ASC' },
      });
    } else {
      const roleIds = await this.getAdminRoleIds(adminId);
      if (roleIds.length === 0) return [];
      const roleMenus = await this.roleMenuRepo.find({ where: { roleId: In(roleIds) } });
      const menuIds = [...new Set(roleMenus.map((rm) => rm.menuId))];
      if (menuIds.length === 0) return [];
      menus = await this.menuRepo.find({
        where: { id: In(menuIds), status: 1 },
        order: { sort: 'ASC', id: 'ASC' },
      });
    }

    // 只返回目录(1) + 菜单(2)，按钮(3) 走 ability
    const visible = menus.filter((m) => m.type !== 3);
    const tree = this.buildTree(visible);

    await this.redis.setJson(cacheKey, tree, CacheTTL.MENU);
    return tree;
  }

  /** 我的权限码（按钮列表） */
  async getMyAbility(adminId: number, isSuper: boolean): Promise<string[]> {
    if (isSuper) return ['*']; // 约定 * 表示全部
    const raw = await this.redis.get(CacheKey.adminAbility(adminId));
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        /* fallthrough refresh */
      }
    }
    return this.refreshAdminAbility(adminId);
  }

  /** 重算并写入 ability 缓存 */
  async refreshAdminAbility(adminId: number): Promise<string[]> {
    const roleIds = await this.getAdminRoleIds(adminId);
    if (roleIds.length === 0) {
      await this.redis.setJson(CacheKey.adminAbility(adminId), [], CacheTTL.ABILITY);
      return [];
    }
    const roleMenus = await this.roleMenuRepo.find({ where: { roleId: In(roleIds) } });
    const menuIds = [...new Set(roleMenus.map((rm) => rm.menuId))];
    if (menuIds.length === 0) {
      await this.redis.setJson(CacheKey.adminAbility(adminId), [], CacheTTL.ABILITY);
      return [];
    }
    const menus = await this.menuRepo.find({ where: { id: In(menuIds), status: 1 } });
    const perms = [...new Set(menus.map((m) => m.permission).filter((p) => !!p))];
    await this.redis.setJson(CacheKey.adminAbility(adminId), perms, CacheTTL.ABILITY);
    return perms;
  }

  // ============================================================
  // 内部工具
  // ============================================================
  private async getAdminRoleIds(adminId: number): Promise<number[]> {
    const rows = await this.adminRoleRepo.find({ where: { adminId } });
    return rows.map((r) => r.roleId);
  }

  private async getAdminRoleNames(adminId: number): Promise<string[]> {
    const ids = await this.getAdminRoleIds(adminId);
    if (ids.length === 0) return [];
    const roles = await this.roleRepo.find({ where: { id: In(ids) } });
    return roles.map((r) => r.name);
  }

  private async isSuperAdmin(adminId: number): Promise<boolean> {
    const ids = await this.getAdminRoleIds(adminId);
    if (ids.length === 0) return false;
    const roles = await this.roleRepo.find({ where: { id: In(ids) } });
    return roles.some((r) => r.name === SUPER_ROLE_NAME);
  }

  private buildTree(menus: MenuEntity[]): MenuTreeItem[] {
    const map = new Map<number, MenuTreeItem>();
    const items: MenuTreeItem[] = menus.map((m) => ({
      id: m.id,
      parentId: m.parentId,
      name: m.name,
      type: m.type,
      path: m.path,
      component: m.component,
      icon: m.icon,
      sort: m.sort,
      permission: m.permission,
      children: [],
    }));
    items.forEach((it) => map.set(it.id, it));

    const roots: MenuTreeItem[] = [];
    items.forEach((it) => {
      if (it.parentId === 0 || !map.has(it.parentId)) {
        roots.push(it);
      } else {
        map.get(it.parentId)!.children!.push(it);
      }
    });

    // 清理空 children 并排序
    const sortRec = (arr: MenuTreeItem[]) => {
      arr.sort((a, b) => a.sort - b.sort || a.id - b.id);
      arr.forEach((n) => {
        if (n.children && n.children.length === 0) {
          delete n.children;
        } else if (n.children) {
          sortRec(n.children);
        }
      });
    };
    sortRec(roots);
    return roots;
  }
}
