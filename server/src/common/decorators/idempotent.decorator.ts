import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_KEY = 'idempotent';

/**
 * 声明接口需要幂等校验
 * 客户端需在 header 携带 X-Idempotent-Key（UUID）
 * @param ttl 幂等有效期（秒），默认 30
 */
export const Idempotent = (ttl: number = 30) => SetMetadata(IDEMPOTENT_KEY, { ttl });
