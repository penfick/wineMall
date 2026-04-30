import request from '@/utils/request';
import type { PageQuery, PageResult } from '@/types/api';

export interface UserItem {
  id: number;
  openid: string;
  nickname: string;
  avatar?: string;
  phone?: string;
  gender: 0 | 1 | 2;
  status: number;
  totalOrders: number;
  totalAmount: number;
  registeredAt: string;
  lastLoginAt?: string;
}

export interface UserQuery extends PageQuery {
  keyword?: string;
  status?: number;
  gender?: number;
  startDate?: string;
  endDate?: string;
}

export interface UserAddress {
  id: number;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: number;
}

export interface UserOrderSummary {
  id: number;
  orderNo: string;
  totalAmount: number;
  status: number;
  createdAt: string;
}

export const userApi = {
  page: (params: UserQuery) => request.get<PageResult<UserItem>>('/admin/user', params),
  detail: (id: number) => request.get<UserItem>(`/admin/user/${id}`),
  toggleStatus: (id: number, status: 0 | 1) =>
    request.put<void>(`/admin/user/${id}/status/${status}`),
  addresses: (id: number) => request.get<UserAddress[]>(`/admin/user/${id}/addresses`),
  orders: (id: number, params?: PageQuery) =>
    request.get<PageResult<UserOrderSummary>>(`/admin/user/${id}/orders`, params),
};
