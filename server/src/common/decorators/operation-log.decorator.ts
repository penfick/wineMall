import { SetMetadata } from '@nestjs/common';

export const OPERATION_LOG_KEY = 'operationLog';

export interface OperationLogMeta {
  module: string;
  action: string;
  /** 是否记录请求体（默认 true，敏感接口可关闭）*/
  recordBody?: boolean;
}

/**
 * 标记接口需要写入操作日志（B 端 admin 操作审计）
 * @example @OperationLog({ module: '商品', action: '新增' })
 */
export const OperationLog = (meta: OperationLogMeta) => SetMetadata(OPERATION_LOG_KEY, meta);
