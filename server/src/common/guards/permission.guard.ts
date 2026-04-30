import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RedisService } from '@shared/redis/redis.service';
import { CacheKey } from '../constants/cache-key';
import { ForbiddenException } from '../exceptions/business.exception';
import { PERMISSION_KEY } from '../decorators/check-permission.decorator';
import type { CurrentUserPayload } from '../decorators/current-user.decorator';

/**
 * 按钮级权限校验守卫
 * - 仅校验 admin 来源用户
 * - 超管直接放行
 * - 其他用户从 Redis admin:ability:{adminId} 取权限集合（在登录/角色变更时由 AuthService 写入）
 *   命中任意一个 @CheckPermission(...) 列出的权限即放行
 *
 * 注：这里使用「权限标识字符串集合」实现，能覆盖 v1 全部场景；
 *     等到需要资源级条件（如「只能编辑自己创建的商品」）再升级为 CASL Ability。
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSION_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const user = (req as any).user as CurrentUserPayload | undefined;
    if (!user || user.source !== 'admin') {
      throw new ForbiddenException();
    }
    if (user.isSuper) return true;

    const abilityRaw = await this.redis.get(CacheKey.adminAbility(user.id));
    if (!abilityRaw) {
      throw new ForbiddenException('权限信息已过期，请重新登录');
    }
    let owned: string[];
    try {
      owned = JSON.parse(abilityRaw);
    } catch {
      throw new ForbiddenException();
    }
    const ok = required.some((p) => owned.includes(p));
    if (!ok) throw new ForbiddenException();
    return true;
  }
}
