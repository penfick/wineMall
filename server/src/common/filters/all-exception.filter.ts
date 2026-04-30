import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ErrorCode } from '../constants/error-code';

/**
 * 兜底异常过滤器（所有未被 HttpExceptionFilter 捕获的异常）
 * - 生产环境隐藏堆栈
 */
@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof HttpException) {
      // 已被 HttpExceptionFilter 处理，理论不会到这（防御性留个分支）
      return;
    }
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const err = exception as Error;
    this.logger.error(
      `[UNCAUGHT] ${request.method} ${request.url} → ${err?.message || exception}`,
      err?.stack,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: ErrorCode.UNKNOWN,
      message: process.env.NODE_ENV === 'production' ? '系统繁忙' : err?.message || '系统繁忙',
      data: null,
      timestamp: Date.now(),
    });
  }
}
