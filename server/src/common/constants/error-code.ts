/**
 * 业务错误码（5 位数字）
 * 第 1 位：模块大类（1=系统/通用 2=认证 3=用户 4=商品 5=订单 6=支付 7=系统配置 8=文件 9=其他）
 * 后 4 位：具体错误
 */
export const ErrorCode = {
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

  // 用户
  USER_NOT_FOUND: 30001,
  PHONE_ALREADY_EXISTS: 30002,
  ADDRESS_LIMIT_EXCEEDED: 30003,

  // 商品
  GOODS_NOT_FOUND: 40001,
  GOODS_OFF_SHELF: 40002,
  SKU_NOT_FOUND: 40003,
  STOCK_NOT_ENOUGH: 40004,
  CATEGORY_HAS_CHILDREN: 40005,
  CATEGORY_HAS_GOODS: 40006,
  ATTR_HAS_REFERENCE: 40007,

  // 订单 / 购物车
  CART_EMPTY: 50001,
  CART_ITEM_INVALID: 50002,
  ORDER_NOT_FOUND: 50003,
  ORDER_STATUS_INVALID: 50004,
  ORDER_AMOUNT_INVALID: 50005,
  ORDER_ALREADY_PAID: 50006,
  ORDER_ALREADY_SHIPPED: 50007,
  ADDRESS_REQUIRED: 50008,
  FREIGHT_TEMPLATE_INVALID: 50009,

  // 支付（mock）
  PAY_FAILED: 60001,

  // 系统配置
  ROLE_HAS_USER: 70001,
  MENU_HAS_CHILDREN: 70002,
  DICT_HAS_REFERENCE: 70003,
  CANNOT_DISABLE_SELF: 70004,
  CANNOT_DELETE_SELF: 70005,
  SUPER_ADMIN_PROTECTED: 70006,

  // 文件
  FILE_TOO_LARGE: 80001,
  FILE_TYPE_INVALID: 80002,
  FILE_UPLOAD_FAILED: 80003,
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

/** 错误码 → 默认中文提示 */
export const ErrorMessage: Record<number, string> = {
  [ErrorCode.SUCCESS]: 'ok',
  [ErrorCode.UNKNOWN]: '系统繁忙，请稍后再试',
  [ErrorCode.PARAM_INVALID]: '参数错误',
  [ErrorCode.REQUEST_TIMEOUT]: '请求超时',
  [ErrorCode.TOO_MANY_REQUESTS]: '请求过于频繁，请稍后再试',
  [ErrorCode.IDEMPOTENT_REPEAT]: '请勿重复提交',
  [ErrorCode.DATA_NOT_FOUND]: '数据不存在',
  [ErrorCode.DATA_CONFLICT]: '数据冲突',
  [ErrorCode.OPERATION_NOT_ALLOWED]: '当前不允许该操作',

  [ErrorCode.TOKEN_MISSING]: '请先登录',
  [ErrorCode.TOKEN_INVALID]: '登录已失效，请重新登录',
  [ErrorCode.TOKEN_EXPIRED]: '登录已过期，请重新登录',
  [ErrorCode.ACCOUNT_DISABLED]: '账号已被禁用',
  [ErrorCode.ACCOUNT_NOT_FOUND]: '账号不存在',
  [ErrorCode.PASSWORD_WRONG]: '密码错误',
  [ErrorCode.CAPTCHA_WRONG]: '验证码错误',
  [ErrorCode.PASSWORD_INIT_REQUIRED]: '请先修改初始密码',
  [ErrorCode.PERMISSION_DENIED]: '没有权限执行该操作',
  [ErrorCode.LOGIN_TOO_MANY]: '登录尝试次数过多，请稍后再试',

  [ErrorCode.USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.PHONE_ALREADY_EXISTS]: '手机号已注册',
  [ErrorCode.ADDRESS_LIMIT_EXCEEDED]: '地址数量已达上限',

  [ErrorCode.GOODS_NOT_FOUND]: '商品不存在',
  [ErrorCode.GOODS_OFF_SHELF]: '商品已下架',
  [ErrorCode.SKU_NOT_FOUND]: '商品规格不存在',
  [ErrorCode.STOCK_NOT_ENOUGH]: '库存不足',
  [ErrorCode.CATEGORY_HAS_CHILDREN]: '分类下存在子分类，无法删除',
  [ErrorCode.CATEGORY_HAS_GOODS]: '分类下存在商品，无法删除',
  [ErrorCode.ATTR_HAS_REFERENCE]: '属性已被商品引用，无法删除',

  [ErrorCode.CART_EMPTY]: '购物车为空',
  [ErrorCode.CART_ITEM_INVALID]: '购物车存在失效商品',
  [ErrorCode.ORDER_NOT_FOUND]: '订单不存在',
  [ErrorCode.ORDER_STATUS_INVALID]: '订单状态不允许该操作',
  [ErrorCode.ORDER_AMOUNT_INVALID]: '订单金额异常',
  [ErrorCode.ORDER_ALREADY_PAID]: '订单已支付',
  [ErrorCode.ORDER_ALREADY_SHIPPED]: '订单已发货',
  [ErrorCode.ADDRESS_REQUIRED]: '请选择收货地址',
  [ErrorCode.FREIGHT_TEMPLATE_INVALID]: '运费模板不存在',

  [ErrorCode.PAY_FAILED]: '支付失败',

  [ErrorCode.ROLE_HAS_USER]: '角色下存在管理员，无法删除',
  [ErrorCode.MENU_HAS_CHILDREN]: '菜单下存在子菜单，无法删除',
  [ErrorCode.DICT_HAS_REFERENCE]: '字典已被引用，无法删除',
  [ErrorCode.CANNOT_DISABLE_SELF]: '不能禁用自己',
  [ErrorCode.CANNOT_DELETE_SELF]: '不能删除自己',
  [ErrorCode.SUPER_ADMIN_PROTECTED]: '超级管理员受保护，禁止该操作',

  [ErrorCode.FILE_TOO_LARGE]: '文件超过大小限制',
  [ErrorCode.FILE_TYPE_INVALID]: '不支持的文件类型',
  [ErrorCode.FILE_UPLOAD_FAILED]: '文件上传失败',
};
