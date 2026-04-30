import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';

import { configurations } from '@config/index';
import { buildLoggerConfig } from '@shared/logger/logger.config';
import { SharedModule } from '@shared/shared.module';

import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { AllExceptionFilter } from '@common/filters/all-exception.filter';
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';
import { TimeoutInterceptor } from '@common/interceptors/timeout.interceptor';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { IdempotentGuard } from '@common/guards/idempotent.guard';
import { RequestContextMiddleware } from '@common/middleware/request-context.middleware';

import { HealthModule } from '@modules/health/health.module';
import { AuthModule } from '@modules/auth/auth.module';
import { MenuModule } from '@modules/system/menu/menu.module';
import { RoleModule } from '@modules/system/role/role.module';
import { AdminModule } from '@modules/system/admin/admin.module';
import { DictModule } from '@modules/system/dict/dict.module';
import { SysConfigModule } from '@modules/system/config/config.module';
import { RegionModule } from '@modules/region/region.module';
import { UploadModule } from '@modules/upload/upload.module';
import { CategoryModule } from '@modules/category/category.module';
import { CategoryAttrModule } from '@modules/category-attr/category-attr.module';
import { GoodsModule } from '@modules/goods/goods.module';
import { FavoriteModule } from '@modules/favorite/favorite.module';
import { BannerModule } from '@modules/content/banner/banner.module';
import { NoticeModule } from '@modules/content/notice/notice.module';
import { CacheModule } from '@modules/system/cache/cache.module';
import { StockModule } from '@modules/system/stock/stock.module';
import { CartModule } from '@modules/cart/cart.module';
import { AddressModule } from '@modules/address/address.module';
import { FreightModule } from '@modules/freight/freight.module';
import { LogisticsModule } from '@modules/logistics/logistics.module';
import { OrderModule } from '@modules/order/order.module';
import { QueueModule } from '@modules/queue/queue.module';
import { DashboardModule } from '@modules/dashboard/dashboard.module';
import { TaskModule } from '@modules/task/task.module';
import { UserModule } from '@modules/user/user.module';
import { OperationLogModule } from '@modules/system/log/operation-log.module';

@Module({
  imports: [
    // 配置
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [process.env.DOTENV_FILE || '.env'],
      load: configurations,
    }),

    // 日志（Pino）
    LoggerModule.forRoot(buildLoggerConfig()),

    // 数据库
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions =>
        config.get<TypeOrmModuleOptions>('database'),
    }),

    // 限流
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('app.throttle.ttl'),
          limit: config.get<number>('app.throttle.limit'),
        },
      ],
    }),

    // 定时任务
    ScheduleModule.forRoot(),

    // Bull 队列（共享 Redis 连接配置）
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get('bull.redis'),
        defaultJobOptions: config.get('bull.defaultJobOptions'),
        prefix: config.get<string>('bull.prefix'),
      }),
    }),

    // 全局共享服务
    SharedModule,
    QueueModule,

    // 业务模块
    HealthModule,
    AuthModule,
    MenuModule,
    RoleModule,
    AdminModule,
    DictModule,
    SysConfigModule,
    RegionModule,
    UploadModule,
    CategoryModule,
    CategoryAttrModule,
    GoodsModule,
    FavoriteModule,
    BannerModule,
    NoticeModule,
    CacheModule,
    StockModule,
    CartModule,
    AddressModule,
    FreightModule,
    LogisticsModule,
    OrderModule,
    DashboardModule,
    TaskModule,
    UserModule,
    OperationLogModule,
  ],
  providers: [
    // 异常过滤器（先注册兜底，再注册具体；NestJS 后注册的优先级更高，所以反向）
    { provide: APP_FILTER, useClass: AllExceptionFilter },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },

    // 拦截器（顺序：超时 → 响应包装）
    {
      provide: APP_INTERCEPTOR,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new TimeoutInterceptor(config.get<number>('app.requestTimeoutMs') ?? 30_000),
    },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },

    // 守卫（顺序：限流 → 鉴权 → 权限 → 幂等）
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_GUARD, useClass: IdempotentGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
