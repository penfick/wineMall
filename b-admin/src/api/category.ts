import request from '@/utils/request';

export interface CategoryNode {
  id: number;
  parentId: number;
  name: string;
  level: 1 | 2 | 3;
  icon?: string;
  banner?: string;
  sort: number;
  status: number;
  children?: CategoryNode[];
}

export interface CreateCategoryDto {
  parentId?: number;
  name: string;
  icon?: string;
  banner?: string;
  sort?: number;
  status?: number;
}

export type UpdateCategoryDto = Partial<CreateCategoryDto>;

export const categoryApi = {
  tree: () => request.get<CategoryNode[]>('/admin/category/tree'),
  list: (params?: { keyword?: string; status?: number }) =>
    request.get<CategoryNode[]>('/admin/category', params),
  detail: (id: number) => request.get<CategoryNode>(`/admin/category/${id}`),
  create: (data: CreateCategoryDto) => request.post<void>('/admin/category', data),
  update: (id: number, data: UpdateCategoryDto) =>
    request.put<void>(`/admin/category/${id}`, data),
  remove: (id: number) => request.delete<void>(`/admin/category/${id}`),
  sort: (data: { id: number; sort: number }[]) =>
    request.put<void>('/admin/category/sort', { items: data }),
};
