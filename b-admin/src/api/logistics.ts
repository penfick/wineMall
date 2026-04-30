import request from '@/utils/request';
import type { PageQuery, PageResult } from '@/types/api';

export interface LogisticsCompany {
  id: number;
  code: string;
  name: string;
  contact?: string;
  phone?: string;
  trackUrl?: string;
  sort: number;
  status: number;
  createdAt: string;
}

export interface ShipmentRecord {
  id: number;
  orderId: number;
  orderNo: string;
  companyCode: string;
  companyName: string;
  trackingNo: string;
  status: number;
  shippedAt: string;
  receivedAt?: string;
  operator?: string;
}

export interface ShipmentQuery extends PageQuery {
  keyword?: string;
  companyCode?: string;
  status?: number;
  startDate?: string;
  endDate?: string;
}

export const logisticsApi = {
  // 物流公司
  companyPage: (params: PageQuery & { keyword?: string; status?: number }) =>
    request.get<PageResult<LogisticsCompany>>('/admin/logistics/company', params),
  companyAll: () => request.get<LogisticsCompany[]>('/admin/logistics/company/all'),
  companyCreate: (data: Partial<LogisticsCompany>) =>
    request.post<void>('/admin/logistics/company', data),
  companyUpdate: (id: number, data: Partial<LogisticsCompany>) =>
    request.put<void>(`/admin/logistics/company/${id}`, data),
  companyRemove: (id: number) => request.delete<void>(`/admin/logistics/company/${id}`),

  // 发货记录
  shipmentPage: (params: ShipmentQuery) =>
    request.get<PageResult<ShipmentRecord>>('/admin/logistics/shipment', params),
  shipmentDetail: (id: number) => request.get<ShipmentRecord>(`/admin/logistics/shipment/${id}`),
  trace: (id: number) =>
    request.get<Array<{ time: string; description: string }>>(
      `/admin/logistics/shipment/${id}/trace`,
    ),
};
