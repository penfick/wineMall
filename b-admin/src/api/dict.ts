import request from '@/utils/request';
import type { PageQuery, PageResult } from '@/types/api';

export interface DictType {
  id: number;
  code: string;
  name: string;
  description?: string;
  status: number;
}

export interface DictItem {
  id: number;
  typeCode: string;
  label: string;
  value: string;
  sort: number;
  status: number;
  remark?: string;
  cssClass?: string;
}

export const dictApi = {
  typePage: (params: PageQuery & { keyword?: string }) =>
    request.get<PageResult<DictType>>('/admin/system/dict/types', params),
  typeAll: () => request.get<DictType[]>('/admin/system/dict/types/all'),
  typeCreate: (data: Partial<DictType>) => request.post<void>('/admin/system/dict/types', data),
  typeUpdate: (id: number, data: Partial<DictType>) =>
    request.put<void>(`/admin/system/dict/types/${id}`, data),
  typeRemove: (id: number) => request.delete<void>(`/admin/system/dict/types/${id}`),

  itemList: (typeCode: string) => request.get<DictItem[]>(`/admin/system/dict/items/${typeCode}`),
  itemCreate: (data: Partial<DictItem>) => request.post<void>('/admin/system/dict/items', data),
  itemUpdate: (id: number, data: Partial<DictItem>) =>
    request.put<void>(`/admin/system/dict/items/${id}`, data),
  itemRemove: (id: number) => request.delete<void>(`/admin/system/dict/items/${id}`),

  /** C/B 通用：查询字典项（按 typeCode），用于前端下拉缓存 */
  query: (typeCode: string) => request.get<DictItem[]>(`/dict/${typeCode}`),
};
