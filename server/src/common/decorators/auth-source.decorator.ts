import { SetMetadata } from '@nestjs/common';

export const AUTH_SOURCE_KEY = 'authSource';

/** 鉴权来源：admin = B 端管理员，user = C 端用户 */
export type AuthSource = 'admin' | 'user';

/**
 * 标记控制器/接口的鉴权类型
 * 默认 admin（因为 B 端接口数量更多）
 * @example @AuthSource('user') @Controller('cart')
 */
export const Auth = (source: AuthSource = 'admin') => SetMetadata(AUTH_SOURCE_KEY, source);
