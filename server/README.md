# 优选商城 - 后端服务 (server)

NestJS 10 + TypeORM 0.3 + MySQL 8 + Redis 7 + MinIO + Bull + CASL

## 前置依赖

- Node.js ≥ 18
- 中间件：MySQL / Redis / MinIO（推荐顶层 `docker-compose up -d` 一键起）

## 启动

```bash
npm install
cp .env.example .env       # 按本地环境改连接信息
npm run db:migrate         # 初始化 23 张表
npm run db:seed            # 写入字典/区域/超管/菜单种子
npm run start:dev          # 端口 3000
```

启动后 `GET http://localhost:3000/v1/health` 应返回：

```json
{
  "code": 0,
  "message": "ok",
  "data": { "status": "ok", "db": true, "redis": true, "minio": true },
  "timestamp": 1740000000000
}
```

默认超管：`admin` / `Init@123456`（首次登录强制改密，详见 ErrorCode 20008）

## 常用脚本

| 脚本 | 说明 |
|---|---|
| `npm run start:dev` | watch 模式启动 |
| `npm run build` | 编译到 dist |
| `npm run start:prod` | 生产模式启动（先 build） |
| `npm run db:migrate` | 跑所有未执行的 migration |
| `npm run db:revert` | 回滚最近一个 migration |
| `npm run db:show` | 查看 migration 状态 |
| `npm run db:gen <Name>` | 根据 entity 变更生成 migration |
| `npm run db:seed` | 写入种子数据（幂等） |
| `npm run lint` | ESLint 自动修复 |
| `npm run format` | Prettier 格式化 |

## 目录约定

```
src/
├── main.ts                      入口（全局 pipe/filter/interceptor 注册）
├── app.module.ts                根模块（装配 ConfigModule + SharedModule + 业务模块）
├── config/                      环境配置（database/redis/minio/throttler/bull）
├── common/                      横切关注点
│   ├── constants/error-code.ts  业务错误码（前端必须对齐）
│   ├── constants/cache-key.ts   Redis Key 集中管理
│   ├── decorators/              @Public / @CurrentUser / @CheckPermission
│   ├── filters/                 HttpException / 全局异常 → 统一响应
│   ├── guards/                  AuthGuard / RolesGuard / IdempotentGuard
│   ├── interceptors/            响应包装 / 超时 / 操作日志
│   └── exceptions/              BusinessException
├── shared/                      全局服务（@Global()）
│   ├── redis/                   ioredis 单例 + 分布式锁工具
│   ├── minio/                   上传 / 签名 URL / 删除
│   ├── logger/                  pino + 滚动日志
│   └── id/                      雪花 ID（订单号 + 业务 ID）
├── database/
│   ├── data-source.ts           TypeORM CLI DataSource
│   ├── migrations/              23 张表的 migration（按业务域拆分）
│   └── seeds/                   字典 / 区域 / 超管 / 菜单 / 配置
└── modules/                     业务模块
    ├── auth/                    C 端 + B 端登录、Token 续期
    ├── system/                  admin / role / menu / dict / config / cache / stock / log
    ├── user/                    C 端用户
    ├── address/                 C 端收货地址
    ├── region/                  省市区树（Redis 缓存）
    ├── upload/                  MinIO 上传
    ├── category/                分类树
    ├── category-attr/           分类属性
    ├── goods/                   商品 + SKU + 收藏
    ├── favorite/                C 端收藏
    ├── content/                 banner + notice
    ├── cart/                    Redis Hash 实现
    ├── freight/                 运费模板
    ├── order/                   订单事务 + 库存预扣 + mock 支付
    ├── logistics/               物流公司 + mock 轨迹
    ├── dashboard/               B 端仪表盘
    ├── queue/                   Bull 队列（图片处理 / 大订单导出）
    ├── task/                    @nestjs/schedule 定时任务
    └── health/                  健康检查
```

## 关键约束

- **响应包装**：成功 `{code:0, message:'ok', data, timestamp}`；失败 `{code:非0, message, data:null, timestamp}`
- **错误码**：见 `src/common/constants/error-code.ts` — **前端 b-admin/c-app 的 error-code 常量必须严格对齐**
- **migration**：`synchronize: false`，所有 schema 变更走 migration
- **时区**：统一 `+08:00`（TypeORM `timezone:'+08:00'` + MySQL `default-time-zone='+08:00'`）
- **业务异常**：抛 `throw new BusinessException(ErrorCode.STOCK_NOT_ENOUGH)` 由全局 filter 包装
- **Token**：UUID v4，存 Redis `user:token:{token}` / `admin:token:{token}`，每次请求滑动续期
- **库存扣减**：Redis Lua 脚本原子执行避免超卖，下单事务失败时回滚预扣

## 接口前缀

所有路由前缀 `/v1`：
- C 端：`/v1/...`（如 `/v1/auth/wechat-login`）
- B 端：`/v1/admin/...`（如 `/v1/admin/auth/login`）

## 验证清单

启动后逐一确认：

- [ ] `GET /v1/health` 返回 200
- [ ] `POST /v1/admin/auth/login` 用 admin/Init@123456 拿到 token
- [ ] 带 token 调 `GET /v1/admin/system/admin` 返回管理员列表
- [ ] 不带 token 返回 `{code:20001}`
- [ ] 错 token 返回 `{code:20002}`
- [ ] 队列：上传图后 1-2s 在 MinIO 看到 `_thumb` 缩略图
- [ ] 定时任务：临时把 `ORDER_TIMEOUT_MINUTES=1` → 创建未付订单 → 1 分钟后变「已取消」

## 调试技巧

- 看 SQL：`.env` 设 `DB_LOGGING=true`
- 看 Redis：`docker exec -it winemall-redis redis-cli` 然后 `KEYS *`
- 看 MinIO 控制台：http://localhost:9001（minio / minio123456）

## 详见

- [05 接口设计](../docs/05-接口设计.md)
- [10 边界场景测试剧本](../docs/10-边界场景测试剧本.md)
- [11 部署文档](../docs/11-部署文档.md)
