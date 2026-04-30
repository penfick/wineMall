import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis/redis.service';
import { MinioService } from './minio/minio.service';
import { IdGeneratorService } from './id/id-generator.service';

/**
 * 全局共享模块
 * 在此注册的 provider 在任何业务模块中可直接注入
 */
@Global()
@Module({
  providers: [RedisService, MinioService, IdGeneratorService],
  exports: [RedisService, MinioService, IdGeneratorService],
})
export class SharedModule {}
