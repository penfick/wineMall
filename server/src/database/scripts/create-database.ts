/**
 * 建库脚本：连到 MySQL 实例（不指定 database），CREATE DATABASE IF NOT EXISTS
 * 用法：npm run db:create-database:local
 */
import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { createConnection } from 'mysql2/promise';

const envFile = process.env.DOTENV_FILE || '.env';
const envPath = join(process.cwd(), envFile);
if (existsSync(envPath)) {
  loadEnv({ path: envPath });
} else {
  loadEnv();
}

async function main() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASS || '';
  const database = process.env.DB_NAME || 'winemall';

  console.log(`[create-database] 连接 ${user}@${host}:${port} → 准备创建 \`${database}\``);
  const conn = await createConnection({ host, port, user, password });

  try {
    const [rows] = (await conn.query(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [database],
    )) as any;
    if (rows.length > 0) {
      console.log(`[create-database] 库 \`${database}\` 已存在，跳过`);
    } else {
      await conn.query(
        `CREATE DATABASE \`${database}\` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci`,
      );
      console.log(`[create-database] 库 \`${database}\` 创建成功（utf8mb4 / utf8mb4_unicode_ci）`);
    }
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error('[create-database] 失败：', e.message);
  process.exit(1);
});
