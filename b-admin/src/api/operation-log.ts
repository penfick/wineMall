import request from '@/utils/request';
import type { PageQuery, PageResult } from '@/types/api';

export interface OperationLogItem {
  id: number;
  adminId?: number;
  username?: string;
  module: string;
  action: string;
  description: string;
  method: string;
  path: string;
  ip: string;
  userAgent?: string;
  status: 'success' | 'fail';
  errorMessage?: string;
  durationMs: number;
  createdAt: string;
}

export interface OperationLogQuery extends PageQuery {
  keyword?: string;
  module?: string;
  status?: 'success' | 'fail';
  username?: string;
  startDate?: string;
  endDate?: string;
}

export const operationLogApi = {
  page: (params: OperationLogQuery) =>
    request.get<PageResult<OperationLogItem>>('/admin/system/operation-log', params),
  detail: (id: number) => request.get<OperationLogItem>(`/admin/system/operation-log/${id}`),
  clear: (data: { beforeDate: string; confirm: string }) =>
    request.post<{ removed: number }>('/admin/system/operation-log/clear', data),
};
