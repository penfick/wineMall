import request from '@/utils/request';
import type { PageQuery, PageResult } from '@/types/api';

export interface FreightRule {
  /** 区域编码列表（省/市），空数组表示其他区域 */
  regionCodes: string[];
  firstQty: number;
  firstFee: number;
  extraQty: number;
  extraFee: number;
  /** 包邮金额阈值，0=不包邮 */
  freeThreshold: number;
}

export interface FreightTemplate {
  id: number;
  name: string;
  /** qty=按件，weight=按重量 */
  chargeType: 'qty' | 'weight';
  status: number;
  isDefault: number;
  rules: FreightRule[];
  createdAt: string;
  updatedAt: string;
}

export interface FreightQuery extends PageQuery {
  keyword?: string;
  status?: number;
}

export const freightApi = {
  page: (params: FreightQuery) =>
    request.get<PageResult<FreightTemplate>>('/admin/freight/template', params),
  all: () => request.get<FreightTemplate[]>('/admin/freight/template/all'),
  detail: (id: number) => request.get<FreightTemplate>(`/admin/freight/template/${id}`),
  create: (data: Partial<FreightTemplate>) => request.post<void>('/admin/freight/template', data),
  update: (id: number, data: Partial<FreightTemplate>) =>
    request.put<void>(`/admin/freight/template/${id}`, data),
  remove: (id: number) => request.delete<void>(`/admin/freight/template/${id}`),
  setDefault: (id: number) => request.put<void>(`/admin/freight/template/${id}/default`),
};
