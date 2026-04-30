import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs('database', (): TypeOrmModuleOptions => ({
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
  autoLoadEntities: true,
  retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '5', 10),
  retryDelay: parseInt(process.env.DB_RETRY_DELAY || '2000', 10),
  extra: {
    connectionLimit: 20,
    waitForConnections: true,
    decimalNumbers: false, // 价格用 string 处理，避免精度丢失
  },
}));
