import request from '@/utils/request';
import type { PageQuery, PageResult } from '@/types/api';

export interface RoleItem {
  id: number;
  name: string;
  code: string;
  description?: string;
  status: number;
  sort: number;
  createdAt: string;
  menuIds?: number[];
}

export interface RoleQuery extends PageQuery {
  keyword?: string;
  status?: number;
}

export interface CreateRoleDto {
  name: string;
  code: string;
  description?: string;
  status?: number;
  sort?: number;
}

export type UpdateRoleDto = Partial<CreateRoleDto>;

export const roleApi = {
  page: (params: RoleQuery) => request.get<PageResult<RoleItem>>('/admin/system/role', params),
  all: () => request.get<RoleItem[]>('/admin/system/role/all'),
  detail: (id: number) => request.get<RoleItem>(`/admin/system/role/${id}`),
  create: (data: CreateRoleDto) => request.post<void>('/admin/system/role', data),
  update: (id: number, data: UpdateRoleDto) => request.put<void>(`/admin/system/role/${id}`, data),
  assignMenus: (id: number, data: { menuIds: number[] }) =>
    request.put<void>(`/admin/system/role/${id}/menus`, data),
  remove: (id: number) => request.delete<void>(`/admin/system/role/${id}`),
};
