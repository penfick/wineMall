import { registerAs } from '@nestjs/config';

/** Bull 使用独立的 Redis 连接（与 ioredis 主连接物理上同一个 Redis 实例，但逻辑隔离） */
export default registerAs('bull', () => ({
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_BULL_DB || '1', 10),
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
  prefix: 'wm:bull',
}));

export const QueueName = {
  IMAGE: 'image-processing',
  EXPORT: 'export',
} as const;
