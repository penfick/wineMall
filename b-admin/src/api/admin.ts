import request from '@/utils/request';
import type { PageQuery, PageResult } from '@/types/api';

export interface AdminItem {
  id: number;
  username: string;
  nickname: string;
  avatar?: string;
  email?: string;
  phone?: string;
  status: number;
  isSuper: boolean;
  lastLoginAt?: string;
  lastLoginIp?: string;
  roles: Array<{ id: number; name: string }>;
  createdAt: string;
}

export interface AdminQuery extends PageQuery {
  keyword?: string;
  status?: number;
  roleId?: number;
}

export interface CreateAdminDto {
  username: string;
  password: string;
  nickname: string;
  email?: string;
  phone?: string;
  status?: number;
  roleIds: number[];
}

export type UpdateAdminDto = Partial<Omit<CreateAdminDto, 'username' | 'password'>>;

export const adminApi = {
  page: (params: AdminQuery) => request.get<PageResult<AdminItem>>('/admin/system/admin', params),
  detail: (id: number) => request.get<AdminItem>(`/admin/system/admin/${id}`),
  create: (data: CreateAdminDto) => request.post<void>('/admin/system/admin', data),
  update: (id: number, data: UpdateAdminDto) => request.put<void>(`/admin/system/admin/${id}`, data),
  resetPassword: (id: number, data: { newPassword: string }) =>
    request.put<void>(`/admin/system/admin/${id}/reset-password`, data),
  toggleStatus: (id: number, status: 0 | 1) =>
    request.put<void>(`/admin/system/admin/${id}/status/${status}`),
  kick: (id: number) => request.post<void>(`/admin/system/admin/${id}/kick`),
  remove: (id: number) => request.delete<void>(`/admin/system/admin/${id}`),
};
