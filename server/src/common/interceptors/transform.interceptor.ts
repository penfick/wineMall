import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ErrorCode } from '../constants/error-code';

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

const SKIP_TRANSFORM = Symbol.for('skipTransform');

/** 在 controller 方法上标记返回结果不被包装（如导出文件、SSE）*/
export function skipTransform<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    (value as any)[SKIP_TRANSFORM] = true;
  }
  return value;
}

/**
 * 统一响应包装：{ code, message, data, timestamp }
 * - 已经是 ApiResponse 形态的不重复包装
 * - StreamableFile / Buffer / 标记 skipTransform 的不包装
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T> | T> {
    return next.handle().pipe(
      map((data) => {
        if (data instanceof StreamableFile || Buffer.isBuffer(data)) return data;
        if (data && typeof data === 'object' && (data as any)[SKIP_TRANSFORM]) return data;
        if (
          data &&
          typeof data === 'object' &&
          'code' in data &&
          'message' in data &&
          'data' in data
        ) {
          return data as any;
        }
        return {
          code: ErrorCode.SUCCESS,
          message: 'ok',
          data: data ?? null,
          timestamp: Date.now(),
        };
      }),
    );
  }
}
