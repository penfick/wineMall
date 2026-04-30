# 优选商城 - C 端小程序 (c-app)

UniApp 3.x + Vue 3.4 + Vite 5 + uni-ui + Pinia 2.0 + TypeScript

## 前置依赖

- Node.js ≥ 18
- 微信开发者工具（最新稳定版，调试基础库 ≥ 2.10.0）
- 后端 server 已启动

## 启动

```bash
npm install
cp .env.example .env             # 填入 VITE_API_BASE_URL（不同环境不同）
npm run dev:mp-weixin            # 编译到 dist/dev/mp-weixin/（watch）
```

然后用微信开发者工具：

1. **项目 → 导入** → 路径选择 `c-app/dist/dev/mp-weixin/`
2. **AppID** 选「测试号」或填入小程序 AppID
3. 详情 → 本地设置 → 勾选「不校验合法域名」（开发期）
4. 详情 → 本地设置 → 勾选「使用 npm 模块」

## 常用脚本

| 脚本 | 说明 |
|---|---|
| `npm run dev:mp-weixin` | 编译微信小程序（watch） |
| `npm run dev:h5` | H5 浏览器调试（端口由 vite 决定） |
| `npm run build:mp-weixin` | 微信小程序生产构建 |
| `npm run build:h5` | H5 生产构建 |
| `npm run lint` | ESLint 自动修复 |
| `npm run format` | Prettier 格式化 |

## TabBar

底部 4 个 Tab：首页 / 分类 / 购物车 / 我的，选中色 `#059669`，购物车带角标。

## 目录约定

```
src/
├── main.ts                      入口（注册 Pinia）
├── App.vue                      根组件
├── manifest.json                UniApp 配置（小程序 AppID 等）
├── pages.json                   页面注册 + tabBar 配置
├── pages/                       19 个业务页面
│   ├── index/                   首页
│   ├── category/                分类
│   ├── search/                  搜索
│   ├── goods/                   商品列表 / 详情
│   ├── cart/                    购物车
│   ├── order/                   确认订单 / 列表 / 详情 / 支付结果
│   ├── address/                 地址列表 / 编辑 / 选择
│   ├── login/                   微信登录（mock）
│   ├── profile/                 个人信息
│   ├── favorite/                收藏
│   ├── logistics/               物流轨迹
│   ├── webview/                 富文本展示（公告等）
│   └── me/                      我的中心
├── components/                  10 个公共组件
│   ├── GoodsCard.vue            商品卡（grid/list 两种布局）
│   ├── PriceTag.vue             价格（tabular-nums）
│   ├── EmptyState.vue
│   ├── LoadMore.vue
│   ├── Skeleton.vue
│   ├── SoldOutTag.vue
│   ├── CountDown.vue
│   ├── RegionPicker.vue         省市区选择（uni-popup）
│   ├── NetworkError.vue
│   └── SkuSelector.vue
├── api/                         按模块拆分
│   ├── goods.ts                 商品 / 收藏
│   ├── order.ts                 订单 / mock 支付
│   ├── region.ts
│   └── index.ts
├── store/                       Pinia 组合式
│   ├── user.ts                  用户信息 + token
│   ├── cart.ts                  购物车
│   ├── address.ts               收货地址
│   └── dict.ts                  字典缓存
├── utils/
│   ├── request.ts               uni.request 封装（业务码 + 401 跳登录）
│   ├── error-code.ts            与 server 对齐的业务码
│   ├── storage.ts               wm_ 前缀的 storage 封装
│   ├── nav.ts                   navTo / reLaunchTo / navBack
│   └── format.ts
├── styles/
│   └── variables.scss           全局 SCSS 变量（自动注入）
├── static/                      静态资源（小程序限制：本地图片必须 static/）
│   ├── tabbar/                  4 + 4 = 8 张 tabBar 图标
│   └── ...
└── types/                       TS 类型
```

## 关键约束

- **单位**：所有尺寸用 **rpx**（750rpx = 屏幕宽度）
- **触控区**：最小 88×88rpx（≈44pt）
- **价格**：`tabular-nums` class 防止数字跳动
- **scroll-view**：必须显式高度 — 父级 `height:100vh + flex column`，scroll-view `flex:1; height:0`
- **rich-text**：图片需通过 `formattedDetail` 计算属性预处理，注入 `max-width:100%; height:auto`
- **chooseImage 已废弃**：在 mp-weixin 中用 `chooseMedia`，h5/app 仍可 `chooseImage`，通过 `// #ifdef MP-WEIXIN` 条件编译切换
- **错误码**：`@/utils/error-code` 必须与 `server/src/common/constants/error-code.ts` 对齐
- **mock 接口**：登录走 `mock_code_xxx`、支付走 `pay-mock`，对应 server 端预留接口

## 验证清单

- [ ] 微信开发者工具能打开 `c-app/dist/dev/mp-weixin/`，无报错
- [ ] 首页轮播 + 分类 + 商品列表正常加载
- [ ] mock 登录成功后跳到「我的」，token 写入 storage
- [ ] 商品详情加购 → 购物车 → 全选 → 结算 → 选地址 → 下单 → mock 支付 → 订单详情
- [ ] 个人信息改头像走 `chooseMedia`（基础库 2.10+）
- [ ] 收藏列表 / 物流轨迹 / 富文本公告均能加载
- [ ] 401 时自动跳 `/pages/login/index`

## 详见

- [07 页面设计](../docs/07-页面设计.md)
- [10 边界场景测试剧本](../docs/10-边界场景测试剧本.md)
