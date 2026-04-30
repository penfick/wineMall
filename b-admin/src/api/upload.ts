import request from '@/utils/request';

export interface UploadResult {
  url: string;
  objectName: string;
  size: number;
  width?: number;
  height?: number;
}

export const uploadApi = {
  /** 单图（FormData）— 由具体组件发起 */
  imageUrl: (prefix?: string) =>
    `${import.meta.env.VITE_API_BASE_URL || '/api'}/admin/upload/image${prefix ? `?prefix=${prefix}` : ''}`,
  /** 标记为已认领（不再清理临时文件） */
  markUsed: (objectNames: string[]) =>
    request.post<void>('/admin/upload/mark-used', { objectNames }),
  /** 删除已上传文件 */
  remove: (objectName: string) =>
    request.delete<void>('/admin/upload', { objectName }),
};
