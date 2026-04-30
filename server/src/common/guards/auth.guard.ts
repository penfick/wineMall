import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { RedisService } from '@shared/redis/redis.service';
import { CacheKey, CacheTTL } from '../constants/cache-key';
import { ErrorCode } from '../constants/error-code';
import { UnauthorizedException } from '../exceptions/business.exception';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AUTH_SOURCE_KEY, AuthSource } from '../decorators/auth-source.decorator';
import type { CurrentUserPayload } from '../decorators/current-user.decorator';

/**
 * 全局鉴权守卫
 * - @Public() 标记的接口直接放行
 * - 其余接口必须携带 Authorization: Bearer <token>
 * - 根据 @Auth('admin'|'user') 决定查 admin:token 还是 user:token
 *   未声明则按路径前缀自动判断（/v1/admin/* → admin，否则 → user）
 * - 命中后实施滑动续期（重置 TTL）并把 payload 注入到 req.user
 *
 * 注意：本守卫只确认登录态有效，不查询数据库取详细信息。
 *       如需 username/role 等附加字段，AuthService 在登录时把简化 payload JSON 化存到 Redis。
 *       Token Key 设计：
 *           user:token:{uuid}  → JSON({ id, openid })
 *           admin:token:{uuid} → JSON({ id, username, isSuper })
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req);
    if (!token) {
      throw new UnauthorizedException(ErrorCode.TOKEN_MISSING);
    }

    const source = this.resolveAuthSource(ctx, req);
    const key = source === 'admin' ? CacheKey.adminToken(token) : CacheKey.userToken(token);
    const raw = await this.redis.get(key);
    if (!raw) {
      throw new UnauthorizedException(ErrorCode.TOKEN_EXPIRED);
    }
    let payload: Omit<CurrentUserPayload, 'source' | 'token'>;
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new UnauthorizedException(ErrorCode.TOKEN_INVALID);
    }

    // 滑动续期
    const ttl = source === 'admin' ? CacheTTL.ADMIN_TOKEN : CacheTTL.USER_TOKEN;
    await this.redis.expire(key, ttl);

    (req as any).user = { ...payload, source, token } as CurrentUserPayload;
    return true;
  }

  private extractToken(req: Request): string | null {
    const auth = req.headers.authorization || req.headers.Authorization;
    if (!auth) return null;
    const value = Array.isArray(auth) ? auth[0] : auth;
    const m = /^Bearer\s+(.+)$/i.exec(value);
    return m ? m[1].trim() : null;
  }

  private resolveAuthSource(ctx: ExecutionContext, req: Request): AuthSource {
    const declared = this.reflector.getAllAndOverride<AuthSource>(AUTH_SOURCE_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (declared) return declared;
    // 仅在路径前缀为 /<prefix>/admin/ 时判定为管理员，避免业务路径中含 admin 字样误判
    const prefix = this.config.get<string>('app.prefix') || 'v1';
    return new RegExp(`^/${prefix}/admin/`).test(req.url) ? 'admin' : 'user';
  }
}
