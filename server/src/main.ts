import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { join } from 'node:path';

import { AppModule } from './app.module';
import { ErrorCode } from '@common/constants/error-code';
import { BusinessException } from '@common/exceptions/business.exception';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    cors: false,
  });

  // 替换默认 logger 为 pino
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService);
  const port = config.get<number>('app.port') ?? 3000;
  const prefix = config.get<string>('app.prefix') ?? 'v1';
  const env = config.get<string>('app.env') ?? 'development';

  // 全局前缀（health 不挂前缀，方便容器/网关健康检查）
  app.setGlobalPrefix(prefix, { exclude: ['health'] });

  // CORS（开发期放开，生产由 Nginx 控制）
  app.enableCors({
    origin: true,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    exposedHeaders: ['X-Request-Id'],
  });

  // body 大小限制（图片是直接走 multer 的，这里仅控制 JSON/表单）
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: true, limit: '2mb' }));

  // 静态资源：上传的临时文件 / favicon
  app.useStaticAssets(join(process.cwd(), 'public'), { prefix: '/static/' });

  // 全局校验管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: true,
      exceptionFactory: (errors) => {
        process.stdout.write(`[ValidationPipe] errors=${JSON.stringify(errors, null, 2)}\n`);
        const first = errors[0];
        const constraints = first?.constraints || {};
        const msg = Object.values(constraints)[0] || '参数校验失败';
        return new BusinessException(ErrorCode.PARAM_INVALID, String(msg));
      },
    }),
  );

  // 优雅关闭（Bull 队列、TypeORM 连接需要时机来释放）
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');

  const url = await app.getUrl();
  // eslint-disable-next-line no-console
  console.log(`\n🚀 优选商城后端启动成功`);
  // eslint-disable-next-line no-console
  console.log(`   ENV : ${env}`);
  // eslint-disable-next-line no-console
  console.log(`   URL : ${url}/${prefix}`);
  // eslint-disable-next-line no-console
  console.log(`   Health: ${url}/${prefix}/health\n`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ Bootstrap failed:', err);
  process.exit(1);
});
