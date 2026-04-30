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
  });
  const [rows] = (await conn.query(`SHOW DATABASES`)) as any;
  console.log('账号可见数据库：');
  for (const r of rows) console.log('  -', Object.values(r)[0]);
  const [grants] = (await conn.query(`SHOW GRANTS FOR CURRENT_USER`)) as any;
  console.log('\n账号权限：');
  for (const r of grants) console.log('  -', Object.values(r)[0]);
  await conn.end();
})();
