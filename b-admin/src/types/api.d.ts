/**
 * 后端统一响应结构（TransformInterceptor）
 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/**
 * 分页响应（业务通用）
 */
export interface PageResult<T = unknown> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 分页查询入参
 */
export interface PageQuery {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}
