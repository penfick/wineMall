import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  /** 来源 */
  source: 'admin' | 'user';
  /** 主键 */
  id: number;
  /** 用户名（仅 admin） */
  username?: string;
  /** openid（仅 user） */
  openid?: string;
  /** 是否为超管（仅 admin） */
  isSuper?: boolean;
  /** Token 字符串本身（用于注销时删除）*/
  token: string;
}

/**
 * 注入当前登录主体
 * @example async list(@CurrentUser() user: CurrentUserPayload) {}
 */
export const CurrentUser = createParamDecorator(
  (key: keyof CurrentUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: CurrentUserPayload = request.user;
    return key ? user?.[key] : user;
  },
);
