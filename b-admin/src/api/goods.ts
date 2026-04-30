import request from '@/utils/request';
import type { PageQuery, PageResult } from '@/types/api';

export interface GoodsItem {
  id: number;
  name: string;
  subTitle?: string;
  categoryId: number;
  categoryName?: string;
  brandId?: number;
  mainImage: string;
  images?: string[];
  detail?: string;
  unit?: string;
  price: number;
  marketPrice?: number;
  costPrice?: number;
  stock: number;
  stockWarning?: number;
  sales?: number;
  status: 0 | 1; // 0 下架 1 上架
  sort: number;
  createdAt: string;
  specs?: GoodsSpecItem[];
}

export interface GoodsSpecItem {
  id?: number;
  goodsId?: number;
  skuCode?: string;
  attrText: string; // "红色|XL"，默认 SKU 时为 ''
  /** 后端标记：true 表示这是「无规格商品」自动建的默认 SKU */
  isDefault?: boolean;
  price: number;
  costPrice?: number;
  stock: number;
  stockWarning?: number;
  image?: string;
  status: 0 | 1;
}

export interface GoodsQuery extends PageQuery {
  keyword?: string;
  categoryId?: number;
  status?: number;
  lowStock?: boolean;
}

export const goodsApi = {
  page: (params: GoodsQuery) => request.get<PageResult<GoodsItem>>('/admin/goods', params),
  detail: (id: number) => request.get<GoodsItem>(`/admin/goods/${id}`),
  create: (data: Partial<GoodsItem>) => request.post<{ id: number }>('/admin/goods', data),
  update: (id: number, data: Partial<GoodsItem>) =>
    request.put<void>(`/admin/goods/${id}`, data),
  remove: (id: number) => request.delete<void>(`/admin/goods/${id}`),
  toggleStatus: (id: number, status: 0 | 1) =>
    request.put<void>(`/admin/goods/${id}/status/${status}`),
  batchToggle: (ids: number[], status: 0 | 1) =>
    request.put<void>('/admin/goods/batch/status', { ids, status }),
};
