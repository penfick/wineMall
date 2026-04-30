import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

// 支持 DOTENV_FILE=.env.local 切换环境配置
const envFile = process.env.DOTENV_FILE || '.env';
const envPath = join(process.cwd(), envFile);
if (existsSync(envPath)) {
  loadEnv({ path: envPath });
} else {
  loadEnv();
}

/**
 * TypeORM CLI 专用 DataSource
 * - migration:run / migration:generate / migration:create 都从这里读
 * - 生产运行时 NestJS 通过 TypeOrmModule.forRootAsync 注入，不走这个入口
 */
const options: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'wine_mall',
  charset: 'utf8mb4_unicode_ci',
  timezone: process.env.TIMEZONE || '+08:00',
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  entities: [join(__dirname, '..', 'modules', '**', 'entities', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'typeorm_migrations',
};

export default new DataSource(options);
