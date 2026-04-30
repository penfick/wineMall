/**
 * 按钮级权限标识
 * 命名：{资源}:{动作}
 */
export const Permission = {
  // 仪表盘
  DASHBOARD_VIEW: 'dashboard:view',

  // 商品
  GOODS_LIST: 'goods:list',
  GOODS_CREATE: 'goods:create',
  GOODS_UPDATE: 'goods:update',
  GOODS_DELETE: 'goods:delete',
  GOODS_PUBLISH: 'goods:publish',

  // 分类
  CATEGORY_LIST: 'category:list',
  CATEGORY_MANAGE: 'category:manage',
  CATEGORY_ATTR_MANAGE: 'category:attr:manage',

  // 订单
  ORDER_LIST: 'order:list',
  ORDER_DETAIL: 'order:detail',
  ORDER_SHIP: 'order:ship',
  ORDER_CLOSE: 'order:close',
  ORDER_EXPORT: 'order:export',

  // 运费
  FREIGHT_LIST: 'freight:list',
  FREIGHT_MANAGE: 'freight:manage',

  // 物流
  LOGISTICS_COMPANY: 'logistics:company',
  LOGISTICS_RECORD: 'logistics:record',

  // 用户
  USER_LIST: 'user:list',
  USER_DETAIL: 'user:detail',
  USER_DISABLE: 'user:disable',

  // 内容
  BANNER_LIST: 'content:banner:list',
  BANNER_MANAGE: 'content:banner:manage',
  NOTICE_LIST: 'content:notice:list',
  NOTICE_MANAGE: 'content:notice:manage',

  // 系统
  ADMIN_LIST: 'system:admin:list',
  ADMIN_MANAGE: 'system:admin:manage',
  ADMIN_RESET_PWD: 'system:admin:reset-password',
  ROLE_LIST: 'system:role:list',
  ROLE_MANAGE: 'system:role:manage',
  ROLE_PERMISSION: 'system:role:permission',
  MENU_LIST: 'system:menu:list',
  MENU_MANAGE: 'system:menu:manage',
  DICT_LIST: 'system:dict:list',
  DICT_MANAGE: 'system:dict:manage',
  CONFIG_LIST: 'system:config:list',
  CONFIG_MANAGE: 'system:config:manage',
  CACHE_VIEW: 'system:cache:view',
  CACHE_CLEAR: 'system:cache:clear',
  STOCK_LIST: 'system:stock:list',
  STOCK_ADJUST: 'system:stock:adjust',
  LOG_LIST: 'system:log:list',
} as const;

export type PermissionKey = (typeof Permission)[keyof typeof Permission];
