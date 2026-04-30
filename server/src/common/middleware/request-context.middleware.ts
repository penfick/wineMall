import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

/**
 * 请求上下文中间件
 * - 注入 X-Request-Id（如客户端没传则自动生成）
 * - 记录请求开始时间，便于后续拦截器计算耗时
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = (req.headers['x-request-id'] as string) || '';
    const requestId = incoming || randomUUID();
    (req as any).requestId = requestId;
    (req as any).startAt = Date.now();
    res.setHeader('X-Request-Id', requestId);
    next();
  }
}
