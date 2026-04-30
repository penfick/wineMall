# 优选商城 - 管理后台 (b-admin)

Vue 3.5 + Vite 5 + Element Plus 2.8 + Pinia 2.2 + TypeScript + ECharts + wangEditor 5

## 前置依赖

- Node.js ≥ 18
- 后端 server 已启动（默认 `http://localhost:3000`）

## 启动

```bash
npm install
cp .env.example .env       # 修改 VITE_API_BASE_URL 指向后端
npm run dev                # 端口 5173
```

## 常用脚本

| 脚本 | 说明 |
|---|---|
| `npm run dev` | 开发服务（HMR） |
| `npm run build` | 类型检查 + 生产构建 → dist/ |
| `npm run build:no-check` | 跳过 vue-tsc，紧急出包 |
| `npm run preview` | 预览生产构建（本地 4173） |
| `npm run lint` | ESLint 自动修复 |
| `npm run format` | Prettier 格式化 |

## 默认账号

`admin` / `Init@123456`（首次登录强制改密 — 后端返回 ErrorCode 20008）

## 目录约定

```
src/
├── main.ts                  入口（注册 ElementPlus / Pinia / Router）
├── App.vue                  根组件
├── router/
│   ├── index.ts             路由入口（动态路由生成）
│   ├── static.ts            静态路由（login / 404）
│   └── permission.ts        守卫（登录态 + 权限检查 + nprogress）
├── stores/                  Pinia（持久化通过 pinia-plugin-persistedstate）
│   ├── user.ts              用户信息 + token + 权限码集合
│   ├── permission.ts        菜单树 + 动态路由
│   ├── dict.ts              字典缓存
│   └── app.ts               sidebar 折叠等 UI 状态
├── api/                     按业务模块拆分 22 个 ts 文件
├── utils/
│   ├── request.ts           axios 封装（dedupe / Token / 业务码统一处理）
│   └── ...
├── constants/
│   ├── error-code.ts        与 server 严格对齐的错误码
│   ├── storage-key.ts       localStorage key
│   └── route.ts
├── components/              8 个公共组件
│   ├── ImageUpload/
│   ├── RichTextEditor/
│   ├── RegionSelect/
│   ├── Pagination/
│   ├── TableColumnSetting/
│   ├── DictTag/
│   ├── StatusTag/
│   └── IconSelect/
├── views/                   27 个业务页面
│   ├── login/
│   ├── dashboard/
│   ├── goods/               商品列表 / 表单 / 详情
│   ├── category/
│   ├── order/               列表 / 详情 / 发货
│   ├── system/              admin / role / menu / dict / config / cache / log
│   ├── content/             banner / notice
│   ├── freight/
│   ├── logistics/
│   ├── stock/
│   └── user/
├── layouts/
│   ├── default/             默认布局（Sidebar + Header + Breadcrumb）
│   └── empty/               登录页等纯白布局
├── directives/
│   └── permission.ts        v-permission="'goods:create'"
├── styles/
│   ├── variables.scss       色彩 / 间距变量
│   ├── element-overrides.scss
│   └── index.scss
└── types/                   TS 类型声明
```

## 关键约束

- **请求**：`@/utils/request` 已统一处理 401 跳登录、业务码 toast、同源去重
- **错误码**：`@/constants/error-code` 必须与 `server/src/common/constants/error-code.ts` 完全对齐
- **权限**：组件内 `v-permission="'goods:create'"`；后端校验由 `@CheckPermission` 装饰器
- **路由**：登录后根据 user.menus 动态生成，新页面要在后台菜单管理里加入
- **二次确认**：所有删除/批量操作必须 `ElMessageBox.confirm`
- **表格列设置**：`TableColumnSetting` 组件存 `localStorage`，key 含路由路径

## 验证清单

- [ ] `npm run dev` 启动，访问 `http://localhost:5173`
- [ ] admin/Init@123456 登录 → 强制改密 → 重新登录
- [ ] 仪表盘有数据（4 张统计卡 + 趋势图 + 占比饼图）
- [ ] 商品发布：分类 → SKU → 主图 → 详情富文本 → 上架
- [ ] 订单列表能筛选 / 导出 Excel / 发货
- [ ] 角色管理能勾选菜单按钮权限
- [ ] 关闭浏览器重新打开，token 仍有效

## 详见

- [07 页面设计](../docs/07-页面设计.md)
- [10 边界场景测试剧本](../docs/10-边界场景测试剧本.md)
