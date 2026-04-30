import request from '@/utils/request';

export interface CategoryAttrItem {
  id: number;
  categoryId: number;
  name: string;
  type: 'sku' | 'normal'; // sku 参与组合，normal 仅展示
  inputType: 'select' | 'input';
  required: number;
  sort: number;
  values?: CategoryAttrValue[];
}

export interface CategoryAttrValue {
  id: number;
  attrId: number;
  value: string;
  sort: number;
}

export const categoryAttrApi = {
  listByCategory: (categoryId: number) =>
    request.get<CategoryAttrItem[]>(`/admin/category-attr`, { categoryId }),
  create: (data: Partial<CategoryAttrItem>) => request.post<void>('/admin/category-attr', data),
  update: (id: number, data: Partial<CategoryAttrItem>) =>
    request.put<void>(`/admin/category-attr/${id}`, data),
  remove: (id: number) => request.delete<void>(`/admin/category-attr/${id}`),

  valueCreate: (data: Partial<CategoryAttrValue>) =>
    request.post<void>('/admin/category-attr/value', data),
  valueUpdate: (id: number, data: Partial<CategoryAttrValue>) =>
    request.put<void>(`/admin/category-attr/value/${id}`, data),
  valueRemove: (id: number) => request.delete<void>(`/admin/category-attr/value/${id}`),
};
