import appConfig from './app.config';
import databaseConfig from './database.config';
import redisConfig from './redis.config';
import minioConfig from './minio.config';
import bullConfig from './bull.config';

export const configurations = [
  appConfig,
  databaseConfig,
  redisConfig,
  minioConfig,
  bullConfig,
];

export { appConfig, databaseConfig, redisConfig, minioConfig, bullConfig };
