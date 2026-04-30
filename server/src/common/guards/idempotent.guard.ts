import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RedisService } from '@shared/redis/redis.service';
import { CacheKey, CacheTTL } from '../constants/cache-key';
import { BusinessException } from '../exceptions/business.exception';
import { ErrorCode } from '../constants/error-code';
import { IDEMPOTENT_KEY } from '../decorators/idempotent.decorator';

/**
 * 幂等守卫（仅对 @Idempotent() 标记的接口生效）
 * - 客户端在 header 携带 X-Idempotent-Key（UUID）
 * - 首次请求：在 Redis 占位（NX EX ttl），放行
 * - 重复请求：拒绝
 */
@Injectable()
export class IdempotentGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<{ ttl: number }>(IDEMPOTENT_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!meta) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const key = (req.headers['x-idempotent-key'] || req.headers['X-Idempotent-Key']) as string;
    if (!key) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, '缺少幂等标识');
    }
    const ttl = meta.ttl || CacheTTL.IDEMPOTENT;
    const lockKey = CacheKey.idempotent(`${req.url}:${key}`);
    const ok = await this.redis.raw.set(lockKey, '1', 'EX', ttl, 'NX');
    if (ok !== 'OK') {
      throw new BusinessException(ErrorCode.IDEMPOTENT_REPEAT);
    }
    return true;
  }
}
