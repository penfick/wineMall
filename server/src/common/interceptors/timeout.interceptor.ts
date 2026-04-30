import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { BusinessException } from '../exceptions/business.exception';
import { ErrorCode } from '../constants/error-code';

/** 请求超时拦截（默认 30 秒）*/
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly ms: number;
  constructor(ms?: number) {
    this.ms = ms ?? 30_000;
  }

  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(this.ms),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(() => new BusinessException(ErrorCode.REQUEST_TIMEOUT));
        }
        return throwError(() => err);
      }),
    );
  }
}
