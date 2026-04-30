import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.APP_PORT || '3000', 10),
  prefix: process.env.APP_PREFIX || 'v1',
  timezone: process.env.TIMEZONE || '+08:00',
  logLevel: process.env.LOG_LEVEL || 'info',
  siteName: process.env.SITE_NAME || '优选商城',
  sitePhone: process.env.SITE_PHONE || '',
  uploadMaxSizeMb: parseInt(process.env.UPLOAD_MAX_SIZE_MB || '5', 10),
  orderTimeoutMinutes: parseInt(process.env.ORDER_TIMEOUT_MINUTES || '30', 10),
  superAdmin: {
    username: process.env.SUPER_ADMIN_USERNAME || 'admin',
    password: process.env.SUPER_ADMIN_PASSWORD || 'Init@123456',
  },
  token: {
    secret: process.env.TOKEN_SECRET || 'winemall-secret',
    userTtl: parseInt(process.env.USER_TOKEN_TTL || '2592000', 10),
    adminTtl: parseInt(process.env.ADMIN_TOKEN_TTL || '28800', 10),
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '1000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '20', 10),
  },
}));
