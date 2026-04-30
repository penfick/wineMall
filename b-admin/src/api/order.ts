import request from '@/utils/request';
import type { PageQuery, PageResult } from '@/types/api';

export interface OrderItem {
  id: number;
  orderNo: string;
  userId: number;
  userName?: string;
  userPhone?: string;
  status: 0 | 1 | 2 | 3 | 4 | 5; // 0待付款 1待发货 2待收货 3已完成 4已取消 5退款中
  totalAmount: number;
  goodsAmount: number;
  freightAmount: number;
  discountAmount: number;
  payAmount: number;
  payType?: string;
  paidAt?: string;
  shippedAt?: string;
  finishedAt?: string;
  cancelledAt?: string;
  remark?: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  expressCompany?: string;
  expressNo?: string;
  logisticsCompanyId?: number;
  createdAt: string;
  items?: OrderLineItem[];
}

export interface OrderLineItem {
  id: number;
  orderId: number;
  goodsId: number;
  skuId: number;
  goodsName: string;
  skuAttrText?: string;
  goodsImage?: string;
  price: number;
  quantity: number;
  amount: number;
}

export interface OrderQuery extends PageQuery {
  keyword?: string;
  status?: number;
  startDate?: string;
  endDate?: string;
  userId?: number;
  orderNo?: string;
  receiverName?: string;
  receiverPhone?: string;
}

export interface ShipDto {
  logisticsCompanyId: number;
  trackingNo: string;
}

/* ========== 后端原始结构（与 server OrderEntity / OrderItemEntity 一致）========== */

interface OrderItemRaw {
  id: number;
  orderId: number;
  goodsId: number;
  skuId: number;
  goodsName: string;
  specName?: string;
  imageUrl?: string;
  price: number | string;
  quantity: number;
  subtotal: number | string;
}

interface OrderRaw {
  id: number;
  orderNo: string;
  userId: number;
  userName?: string;
  userPhone?: string;
  status: number;
  totalAmount: number | string;
  goodsAmount?: number | string;
  freightAmount: number | string;
  discountAmount?: number | string;
  payAmount: number | string;
  payType?: string;
  receiverName: string;
  receiverPhone: string;
  receiverProvince?: string;
  receiverCity?: string;
  receiverDistrict?: string;
  receiverAddress: string;
  remark?: string;
  logisticsCompanyId?: number | null;
  logisticsCompanyName?: string;
  trackingNo?: string;
  paidAt?: string | null;
  shippedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  items?: OrderItemRaw[];
}

interface OrderDetailRaw {
  order: OrderRaw;
  items: OrderItemRaw[];
  logs?: Array<{ id: number; action: string; content: string; createdAt: string }>;
}

function num(v: unknown): number {
  return Number(v) || 0;
}

function mapItem(raw: OrderItemRaw): OrderLineItem {
  const price = num(raw.price);
  return {
    id: raw.id,
    orderId: raw.orderId,
    goodsId: raw.goodsId,
    skuId: raw.skuId,
    goodsName: raw.goodsName,
    skuAttrText: raw.specName ?? '',
    goodsImage: raw.imageUrl ?? '',
    price,
    quantity: raw.quantity,
    amount: raw.subtotal !== undefined ? num(raw.subtotal) : price * raw.quantity,
  };
}

function mapOrder(raw: OrderRaw, items: OrderItemRaw[] = []): OrderItem {
  const lineItems = items.map(mapItem);
  const totalAmount = num(raw.totalAmount);
  const goodsAmount =
    raw.goodsAmount !== undefined
      ? num(raw.goodsAmount)
      : totalAmount || lineItems.reduce((s, i) => s + i.amount, 0);
  const fullAddress = `${raw.receiverProvince ?? ''}${raw.receiverCity ?? ''}${raw.receiverDistrict ?? ''}${raw.receiverAddress ?? ''}`;
  return {
    id: raw.id,
    orderNo: raw.orderNo,
    userId: raw.userId,
    userName: raw.userName,
    userPhone: raw.userPhone,
    status: raw.status as OrderItem['status'],
    totalAmount,
    goodsAmount,
    freightAmount: num(raw.freightAmount),
    discountAmount: num(raw.discountAmount),
    payAmount: num(raw.payAmount),
    payType: raw.payType,
    paidAt: raw.paidAt ?? undefined,
    shippedAt: raw.shippedAt ?? undefined,
    finishedAt: raw.completedAt ?? undefined,
    cancelledAt: raw.cancelledAt ?? undefined,
    remark: raw.remark,
    receiverName: raw.receiverName,
    receiverPhone: raw.receiverPhone,
    receiverAddress: fullAddress,
    expressCompany: raw.logisticsCompanyName ?? '',
    expressNo: raw.trackingNo ?? '',
    logisticsCompanyId: raw.logisticsCompanyId ?? undefined,
    createdAt: raw.createdAt,
    items: lineItems,
  };
}

export const orderApi = {
  async page(params: OrderQuery): Promise<PageResult<OrderItem>> {
    // 后端 keyword 没单独支持，分别走 orderNo / receiverName / receiverPhone
    const { keyword, ...rest } = params;
    const query: OrderQuery = { ...rest };
    if (keyword) {
      // 简化：把 keyword 同时塞给三个字段，由后端 LIKE 取并集（实际后端是 AND，所以只能选一个）
      // 这里默认按订单号搜，业务侧再决定要不要拆 UI
      query.orderNo = keyword;
    }
    const raw = await request.get<{ list: OrderRaw[]; total: number; page?: number; pageSize?: number }>(
      '/admin/order',
      query,
    );
    return {
      list: (raw.list ?? []).map((o) => mapOrder(o, o.items ?? [])),
      total: raw.total ?? 0,
    };
  },
  async detail(id: number): Promise<OrderItem> {
    const raw = await request.get<OrderDetailRaw>(`/admin/order/${id}`);
    return mapOrder(raw.order, raw.items ?? []);
  },
  ship: (id: number, data: ShipDto) => request.post<void>(`/admin/order/${id}/ship`, data),
  cancel: (id: number, reason?: string) =>
    request.post<void>(`/admin/order/${id}/cancel`, { reason }),
  refund: (id: number, data: { reason: string; amount?: number }) =>
    request.post<void>(`/admin/order/${id}/refund`, data),
  remark: (id: number, remark: string) =>
    request.post<void>(`/admin/order/${id}/remark`, { remark }),
  exportExcel: (params: OrderQuery) =>
    request<Blob>({
      url: '/admin/order/export',
      method: 'get',
      params,
      responseType: 'blob',
    }),
};
