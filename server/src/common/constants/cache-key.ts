/**
 * Redis Key 命名集中管理
 * 命名规则：{业务域}:{资源}:{标识}
 * TTL 单位：秒
 */
export const CacheKey = {
  // ===== 认证 =====
  /** 用户 Token → userId（30 天，滑动续期）*/
  userToken: (token: string) => `user:token:${token}`,
  /** 管理员 Token → adminId（8 小时，滑动续期）*/
  adminToken: (token: string) => `admin:token:${token}`,
  /** 管理员 Ability 序列化（按管理员缓存）*/
  adminAbility: (adminId: number) => `admin:ability:${adminId}`,
  /** 管理员菜单缓存 */
  adminMenu: (adminId: number) => `admin:menu:${adminId}`,
  /** 登录失败次数（按账号 + IP）*/
  loginFail: (kind: 'admin' | 'user', identifier: string) =>
    `login:fail:${kind}:${identifier}`,
  /** 图形验证码 */
  captcha: (uuid: string) => `captcha:${uuid}`,
  /** 短信验证码 */
  smsCode: (phone: string) => `sms:code:${phone}`,
  /** 短信发送次数限制（按手机号 + 日）*/
  smsDaily: (phone: string, ymd: string) => `sms:daily:${phone}:${ymd}`,

  // ===== 购物车 =====
  /** 购物车 Hash：field=skuId value=qty */
  cart: (userId: number) => `cart:user:${userId}`,
  /** 购物车待同步标记（用于定时回写 MySQL）*/
  cartDirty: 'cart:dirty:set',

  // ===== 库存 =====
  /** SKU 实时库存（写后回 MySQL）*/
  skuStock: (skuId: number) => `stock:sku:${skuId}`,

  // ===== 订单 =====
  /** 订单详情缓存（短缓存，5min）*/
  orderDetail: (orderId: number) => `order:detail:${orderId}`,
  /** 用户最近一次下单时间（防重复下单）*/
  orderLastTime: (userId: number) => `order:last:${userId}`,

  // ===== 商品 / 内容 =====
  /** 商品详情缓存 */
  goodsDetail: (goodsId: number) => `cache:goods:detail:${goodsId}`,
  /** 商品列表缓存（按参数哈希）*/
  goodsList: (paramsHash: string) => `cache:goods:list:${paramsHash}`,
  /** 商品 SKU 缓存 */
  goodsSku: (goodsId: number) => `cache:goods:sku:${goodsId}`,
  /** 分类树缓存 */
  categoryTree: 'cache:category:tree',
  /** 首页 Banner */
  banner: 'cache:banner:list',
  /** 热门搜索词 */
  searchHot: 'cache:search:hot',

  // ===== 字典 / 配置 / 区域 =====
  dict: (typeKey: string) => `cache:dict:${typeKey}`,
  config: (key: string) => `cache:config:${key}`,
  region: 'cache:region:tree',

  // ===== 仪表盘 =====
  dashboardOverview: 'cache:dashboard:overview',
  dashboardTrend: (days: number) => `cache:dashboard:trend:${days}`,
  dashboardCategory: 'cache:dashboard:category',
  dashboardTop10: 'cache:dashboard:top10',

  // ===== 限流 / 幂等 / 锁 =====
  rateLimit: (key: string) => `rate:${key}`,
  idempotent: (key: string) => `idem:${key}`,
  lock: (key: string) => `lock:${key}`,

  // ===== 上传 =====
  /** 临时文件登记（用于清理无主文件）*/
  uploadTemp: (objectName: string) => `upload:temp:${objectName}`,
} as const;

/** 缓存 TTL 常量（秒）*/
export const CacheTTL = {
  USER_TOKEN: 30 * 24 * 60 * 60, // 30 天
  ADMIN_TOKEN: 8 * 60 * 60, // 8 小时
  CAPTCHA: 5 * 60, // 5 分钟
  SMS: 5 * 60, // 5 分钟
  GOODS_DETAIL: 5 * 60,
  GOODS_LIST: 5 * 60,
  CATEGORY_TREE: 30 * 60,
  BANNER: 30 * 60,
  DICT: 60 * 60,
  CONFIG: 60 * 60,
  REGION: 24 * 60 * 60,
  DASHBOARD: 10 * 60,
  ORDER_DETAIL: 5 * 60,
  ABILITY: 30 * 60,
  MENU: 30 * 60,
  IDEMPOTENT: 30,
  LOCK_DEFAULT: 30,
} as const;
