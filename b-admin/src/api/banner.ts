import request from '@/utils/request';
import type { PageQuery, PageResult } from '@/types/api';

export interface BannerItem {
  id: number;
  title: string;
  image: string;
  /** none=无跳转，goods=商品，category=分类，url=外链 */
  jumpType: 'none' | 'goods' | 'category' | 'url';
  jumpTarget?: string;
  /** home=首页 */
  position: 'home';
  sort: number;
  status: number;
  startAt?: string;
  endAt?: string;
  createdAt: string;
}

export interface BannerQuery extends PageQuery {
  keyword?: string;
  position?: string;
  status?: number;
}

export const bannerApi = {
  page: (params: BannerQuery) => request.get<PageResult<BannerItem>>('/admin/banner', params),
  detail: (id: number) => request.get<BannerItem>(`/admin/banner/${id}`),
  create: (data: Partial<BannerItem>) => request.post<void>('/admin/banner', data),
  update: (id: number, data: Partial<BannerItem>) =>
    request.put<void>(`/admin/banner/${id}`, data),
  remove: (id: number) => request.delete<void>(`/admin/banner/${id}`),
  toggleStatus: (id: number, status: 0 | 1) =>
    request.put<void>(`/admin/banner/${id}/status/${status}`),
};
