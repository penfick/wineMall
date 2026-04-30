import request from '@/utils/request';
import type { MenuNode } from './auth';

export interface CreateMenuDto {
  parentId?: number;
  name: string;
  type: 1 | 2 | 3;
  path?: string;
  component?: string;
  permission?: string;
  icon?: string;
  sort?: number;
  visible?: number;
  status?: number;
}

export type UpdateMenuDto = Partial<CreateMenuDto>;

export const menuApi = {
  tree: (params?: { keyword?: string; status?: number }) =>
    request.get<MenuNode[]>('/admin/system/menu', params),
  detail: (id: number) => request.get<MenuNode>(`/admin/system/menu/${id}`),
  create: (data: CreateMenuDto) => request.post<void>('/admin/system/menu', data),
  update: (id: number, data: UpdateMenuDto) => request.put<void>(`/admin/system/menu/${id}`, data),
  remove: (id: number) => request.delete<void>(`/admin/system/menu/${id}`),
};

export type { MenuNode };
