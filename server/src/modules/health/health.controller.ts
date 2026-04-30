import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RedisService } from '@shared/redis/redis.service';
import { MinioService } from '@shared/minio/minio.service';
import { Public } from '@common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly redis: RedisService,
    private readonly minio: MinioService,
  ) {}

  @Public()
  @Get()
  async health() {
    const [db, redis, minio] = await Promise.all([
      this.checkDb(),
      this.redis.ping().catch(() => false),
      this.minio.healthy().catch(() => false),
    ]);
    const ok = db && redis && minio;
    return {
      status: ok ? 'ok' : 'degraded',
      uptime: Math.floor(process.uptime()),
      timestamp: Date.now(),
      services: { db, redis, minio },
    };
  }

  private async checkDb(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
