import request from '@/utils/request';
import type { PageQuery, PageResult } from '@/types/api';

export interface NoticeItem {
  id: number;
  title: string;
  /** notice=公告，news=资讯 */
  type: 'notice' | 'news';
  cover?: string;
  content: string;
  isTop: number;
  sort: number;
  status: number;
  publishedAt?: string;
  views: number;
  createdAt: string;
}

export interface NoticeQuery extends PageQuery {
  keyword?: string;
  type?: string;
  status?: number;
}

export const noticeApi = {
  page: (params: NoticeQuery) => request.get<PageResult<NoticeItem>>('/admin/notice', params),
  detail: (id: number) => request.get<NoticeItem>(`/admin/notice/${id}`),
  create: (data: Partial<NoticeItem>) => request.post<void>('/admin/notice', data),
  update: (id: number, data: Partial<NoticeItem>) =>
    request.put<void>(`/admin/notice/${id}`, data),
  remove: (id: number) => request.delete<void>(`/admin/notice/${id}`),
  toggleStatus: (id: number, status: 0 | 1) =>
    request.put<void>(`/admin/notice/${id}/status/${status}`),
  toggleTop: (id: number, isTop: 0 | 1) => request.put<void>(`/admin/notice/${id}/top/${isTop}`),
};
