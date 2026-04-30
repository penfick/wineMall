/**
 * 业务错误码 — 与 server/src/common/constants/error-code.ts 严格对齐
 * 第 1 位为模块大类：1=通用 2=认证 3=用户 4=商品 5=订单 6=支付 7=系统配置 8=文件
 */
export const BizErrorCode = {
  // 通用
  SUCCESS: 0,
  UNKNOWN: 10000,
  PARAM_INVALID: 10001,
  REQUEST_TIMEOUT: 10002,
  TOO_MANY_REQUESTS: 10003,
  IDEMPOTENT_REPEAT: 10004,
  DATA_NOT_FOUND: 10005,
  DATA_CONFLICT: 10006,
  OPERATION_NOT_ALLOWED: 10007,

  // 认证 / 授权
  TOKEN_MISSING: 20001,
  TOKEN_INVALID: 20002,
  TOKEN_EXPIRED: 20003,
  ACCOUNT_DISABLED: 20004,
  ACCOUNT_NOT_FOUND: 20005,
  PASSWORD_WRONG: 20006,
  CAPTCHA_WRONG: 20007,
  PASSWORD_INIT_REQUIRED: 20008,
  PERMISSION_DENIED: 20009,
  LOGIN_TOO_MANY: 20010,
} as const;

export type BizErrorCodeType = (typeof BizErrorCode)[keyof typeof BizErrorCode];

/** 触发跳登录的错误码集合 */
export const UNAUTHORIZED_CODES: number[] = [
  BizErrorCode.TOKEN_MISSING,
  BizErrorCode.TOKEN_INVALID,
  BizErrorCode.TOKEN_EXPIRED,
];
