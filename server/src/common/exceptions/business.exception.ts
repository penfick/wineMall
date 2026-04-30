import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorMessage } from '../constants/error-code';

/**
 * 业务异常 - 由业务代码主动抛出，被全局过滤器捕获
 * 使用：throw new BusinessException(ErrorCode.GOODS_NOT_FOUND)
 *      throw new BusinessException(ErrorCode.STOCK_NOT_ENOUGH, '茅台 500ml 库存仅剩 3 件')
 */
export class BusinessException extends HttpException {
  readonly errorCode: number;

  constructor(errorCode: number, message?: string, httpStatus: HttpStatus = HttpStatus.OK) {
    const msg = message || ErrorMessage[errorCode] || '系统繁忙';
    super({ code: errorCode, message: msg }, httpStatus);
    this.errorCode = errorCode;
  }
}

/** 401 未授权 */
export class UnauthorizedException extends BusinessException {
  constructor(errorCode: number = ErrorCode.TOKEN_INVALID, message?: string) {
    super(errorCode, message, HttpStatus.UNAUTHORIZED);
  }
}

/** 403 无权限 */
export class ForbiddenException extends BusinessException {
  constructor(message?: string) {
    super(ErrorCode.PERMISSION_DENIED, message, HttpStatus.FORBIDDEN);
  }
}
