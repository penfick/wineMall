/**
 * 清空 menus 与 role_menus 表，方便重新跑 seed 修正菜单 component 字段
 * 用法：npm run db:reset-menus:local
 */
import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { createConnection } from 'mysql2/promise';

const envFile = process.env.DOTENV_FILE || '.env';
const envPath = join(process.cwd(), envFile);
if (existsSync(envPath)) loadEnv({ path: envPath });
else loadEnv();

(async () => {
  const conn = await createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });
  console.log(`连接到 ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  await conn.query(`SET FOREIGN_KEY_CHECKS = 0`);
  await conn.query(`TRUNCATE TABLE role_menus`);
  await conn.query(`TRUNCATE TABLE admin_roles`);
  await conn.query(`TRUNCATE TABLE menus`);
  await conn.query(`TRUNCATE TABLE roles`);
  await conn.query(`TRUNCATE TABLE admins`);
  await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);
  console.log('✅ menus / roles / admins / role_menus / admin_roles 已清空，可以重新跑 npm run db:seed:local');
  await conn.end();
})();
