import request from '@/utils/request';
import type { PageQuery, PageResult } from '@/types/api';

export interface StockLogItem {
  id: number;
  goodsId: number;
  goodsName: string;
  skuId?: number;
  skuText?: string;
  /** in=入库，out=出库，adjust=人工调整，order=订单出库，cancel=订单取消回滚 */
  type: 'in' | 'out' | 'adjust' | 'order' | 'cancel';
  changeQty: number;
  beforeStock: number;
  afterStock: number;
  remark?: string;
  operator?: string;
  createdAt: string;
}

export interface StockQuery extends PageQuery {
  keyword?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
}

export interface StockAdjustDto {
  /** 必填：库存挂在 SKU 上 */
  skuId: number;
  /** 1=入库 2=出库 */
  action: 1 | 2;
  /** 变更数量绝对值，必须 > 0 */
  change: number;
  remark: string;
}

export const stockApi = {
  logPage: (params: StockQuery) =>
    request.get<PageResult<StockLogItem>>('/admin/system/stock/log', params),
  adjust: (data: StockAdjustDto) => request.post<void>('/admin/system/stock/adjust', data),
};
