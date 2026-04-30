# 优选商城 wineMall

多品类电商系统，含 C 端微信小程序、B 端管理后台、NestJS 后端服务。

## 项目结构

```
wineMall/
├── server/       NestJS + TypeORM + MySQL + Redis + MinIO
├── b-admin/      Vue3 + Vite + Element Plus + Pinia
├── c-app/        UniApp + Vue3 + uni-ui
└── docker-compose.yml   本地中间件
```

## 快速启动

### 1. 启动中间件

```bash
docker-compose up -d
```

| 服务  | 端口 | 凭据 |
|-------|------|------|
| MySQL | 3306 | root / wineMall@2026 |
| Redis | 6379 | 无密码 |
| MinIO API | 9000 | minio / minio123456 |
| MinIO 控制台 | 9001 | http://localhost:9001 |

### 2. 后端服务

```bash
cd server
npm install
cp .env.example .env       # 按需修改
npm run db:migrate         # 初始化数据库
npm run db:seed            # 写入种子数据
npm run start:dev          # 启动开发服务（端口 3000）
```

默认超管账号：`admin` / `Init@123456`（首次登录强制改密）

### 3. B 端管理后台

```bash
cd b-admin
npm install
cp .env.example .env
npm run dev                # 默认端口 5173
```

### 4. C 端小程序

```bash
cd c-app
npm install
npm run dev:mp-weixin      # 编译到 dist/dev/mp-weixin/
```

然后用微信开发者工具打开 `c-app/dist/dev/mp-weixin/` 目录。

## 端口占用一览

| 端口 | 用途 |
|------|------|
| 3000 | 后端 API |
| 3306 | MySQL |
| 5173 | B 端管理后台（Vite 默认） |
| 6379 | Redis |
| 9000 | MinIO API |
| 9001 | MinIO 控制台 |

## MVP 范围与决策

- **微信登录 / 支付 / 短信 / 快递查询**：MVP 阶段全部 Mock（接口预留，返回固定成功），后期再接真实
- **单元测试**：暂未编写，保留 Jest 脚手架
- **三端响应包装**：`{ code, message, data, timestamp }`，业务码与 server 错误码常量对齐（详见 server/src/common/constants/error-code.ts）
- **鉴权**：C 端 token TTL 30 天滑动续期，B 端 8 小时。Token 失效业务码 20001/20002/20003 自动跳登录
