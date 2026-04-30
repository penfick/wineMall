import request from '@/utils/request';

export interface DashboardOverview {
  todayOrderCount: number;
  todayAmount: number;
  pendingShipCount: number;
  onSaleGoodsCount: number;
  lowStockCount: number;
  totalUserCount: number;
  todayNewUserCount: number;
}

export interface TrendPoint {
  date: string;
  orderCount: number;
  amount: number;
}

export interface CategoryShareItem {
  categoryId: number;
  categoryName: string;
  amount: number;
  ratio: number;
}

export interface TopGoodsItem {
  goodsId: number;
  goodsName: string;
  qty: number;
  amount: number;
}

export const dashboardApi = {
  overview: () => request.get<DashboardOverview>('/admin/dashboard/overview'),
  trend: (days = 30) => request.get<TrendPoint[]>('/admin/dashboard/trend', { days }),
  categoryShare: () => request.get<CategoryShareItem[]>('/admin/dashboard/category-share'),
  top10: () => request.get<TopGoodsItem[]>('/admin/dashboard/top10'),
};
