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
import { BusinessException } from '../exceptions/business.exception';

/**
 * 已知异常处理（HttpException 及其子类，包括 BusinessException）
 * - BusinessException：使用其 errorCode 和 message
 * - 其他 HttpException：根据 status 映射到 ErrorCode
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResp = exception.getResponse();

    let code: number;
    let message: string;

    if (exception instanceof BusinessException) {
      code = exception.errorCode;
      const r = exceptionResp as { code: number; message: string };
      message = r.message;
    } else {
      code = this.mapStatusToCode(status);
      message =
        typeof exceptionResp === 'string'
          ? exceptionResp
          : (exceptionResp as any)?.message || exception.message;
      if (Array.isArray(message)) message = message[0]; // class-validator 错误数组
    }

    this.logger.warn(
      `[${request.method} ${request.url}] ${status} code=${code} msg=${message}`,
    );

    response.status(status).json({
      code,
      message,
      data: null,
      timestamp: Date.now(),
    });
  }

  private mapStatusToCode(status: number): number {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.PARAM_INVALID;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.TOKEN_INVALID;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.PERMISSION_DENIED;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.DATA_NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.DATA_CONFLICT;
      case HttpStatus.REQUEST_TIMEOUT:
        return ErrorCode.REQUEST_TIMEOUT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.TOO_MANY_REQUESTS;
      default:
        return ErrorCode.UNKNOWN;
    }
  }
}
