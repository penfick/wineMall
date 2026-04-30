import { http } from '@/utils/request';

export interface OrderItem {
  id: number;
  goodsId: number;
  goodsName: string;
  cover: string;
  skuId: number;
  skuText: string;
  price: number;
  qty: number;
  amount: number;
}

/** 后端 ResolvedItem 原始结构（preview 返回 items 中的元素）*/
interface OrderItemRaw {
  id?: number;
  goodsId: number;
  skuId: number;
  goodsName: string;
  specName?: string;
  skuText?: string;
  imageUrl?: string;
  cover?: string;
  price: number | string;
  quantity?: number;
  qty?: number;
  subtotal?: number | string;
  amount?: number | string;
}

/** 后端 preview 返回原始结构 */
interface PreviewRaw {
  items: OrderItemRaw[];
  totalAmount?: number | string;
  goodsAmount?: number | string;
  freightAmount: number | string;
  discountAmount?: number | string;
  payAmount: number | string;
  address?: AddressRaw | null;
}

/** 后端 AddressEntity 字段 */
interface AddressRaw {
  id: number;
  receiverName?: string;
  name?: string;
  receiverPhone?: string;
  phone?: string;
  provinceName?: string;
  cityName?: string;
  districtName?: string;
  detailAddress?: string;
  detail?: string;
  fullAddress?: string;
}

function num(v: unknown): number {
  return Number(v) || 0;
}

function mapOrderItem(raw: OrderItemRaw): OrderItem {
  const qty = raw.quantity ?? raw.qty ?? 1;
  const price = num(raw.price);
  const amount = raw.subtotal !== undefined ? num(raw.subtotal) : num(raw.amount) || price * qty;
  return {
    id: raw.id ?? raw.skuId,
    goodsId: raw.goodsId,
    skuId: raw.skuId,
    goodsName: raw.goodsName,
    cover: raw.cover || raw.imageUrl || '',
    skuText: raw.skuText || raw.specName || '',
    price,
    qty,
    amount,
  };
}

function mapAddress(raw: AddressRaw | null | undefined): PreviewResult['address'] | undefined {
  if (!raw) return undefined;
  const name = raw.name || raw.receiverName || '';
  const phone = raw.phone || raw.receiverPhone || '';
  const full =
    raw.fullAddress ||
    `${raw.provinceName ?? ''}${raw.cityName ?? ''}${raw.districtName ?? ''}${raw.detailAddress ?? raw.detail ?? ''}`;
  return { id: raw.id, name, phone, fullAddress: full };
}

/** 后端订单原始结构（detail 返回 {order, items, logs}）*/
interface OrderRaw {
  id: number;
  orderNo: string;
  status: number;
  totalAmount?: number | string;
  goodsAmount?: number | string;
  freightAmount?: number | string;
  discountAmount?: number | string;
  payAmount?: number | string;
  receiverName?: string;
  receiverPhone?: string;
  receiverProvince?: string;
  receiverCity?: string;
  receiverDistrict?: string;
  receiverAddress?: string;
  remark?: string;
  createdAt?: string;
  paidAt?: string | null;
  payAt?: string | null;
  shippedAt?: string | null;
  shipAt?: string | null;
  completedAt?: string | null;
  finishAt?: string | null;
  cancelledAt?: string | null;
  logisticsCompany?: string;
  logisticsCompanyName?: string;
  trackingNo?: string;
}

interface OrderDetailRaw {
  order: OrderRaw;
  items: OrderItemRaw[];
  logs?: Array<{ id: number; action: string; content: string; createdAt: string }>;
}

const STATUS_TEXT: Record<number, string> = {
  0: '待付款',
  1: '待发货',
  2: '待收货',
  3: '已完成',
  4: '已取消',
  5: '退款中',
};

function mapOrderInfo(raw: OrderRaw, items: OrderItemRaw[] = []): OrderInfo {
  const mappedItems = items.map(mapOrderItem);
  const totalAmount = num(raw.totalAmount);
  const goodsAmount =
    raw.goodsAmount !== undefined
      ? num(raw.goodsAmount)
      : totalAmount || mappedItems.reduce((s, i) => s + i.amount, 0);
  const fullAddr =
    `${raw.receiverProvince ?? ''}${raw.receiverCity ?? ''}${raw.receiverDistrict ?? ''}${raw.receiverAddress ?? ''}`;
  return {
    id: raw.id,
    orderNo: raw.orderNo,
    status: raw.status,
    statusText: STATUS_TEXT[raw.status] ?? '',
    totalAmount,
    goodsAmount,
    freightAmount: num(raw.freightAmount),
    discountAmount: num(raw.discountAmount),
    payAmount: num(raw.payAmount),
    receiverName: raw.receiverName ?? '',
    receiverPhone: raw.receiverPhone ?? '',
    receiverAddress: fullAddr,
    remark: raw.remark,
    createdAt: raw.createdAt ?? '',
    payAt: raw.payAt ?? raw.paidAt ?? undefined,
    shipAt: raw.shipAt ?? raw.shippedAt ?? undefined,
    finishAt: raw.finishAt ?? raw.completedAt ?? undefined,
    logisticsCompany: raw.logisticsCompany ?? raw.logisticsCompanyName,
    trackingNo: raw.trackingNo,
    items: mappedItems,
  };
}

function mapPreview(raw: PreviewRaw): PreviewResult {
  const items = (raw.items ?? []).map(mapOrderItem);
  const goodsAmount =
    raw.goodsAmount !== undefined
      ? num(raw.goodsAmount)
      : raw.totalAmount !== undefined
        ? num(raw.totalAmount)
        : items.reduce((s, i) => s + i.amount, 0);
  return {
    items,
    goodsAmount,
    freightAmount: num(raw.freightAmount),
    discountAmount: num(raw.discountAmount),
    payAmount: num(raw.payAmount),
    address: mapAddress(raw.address),
  };
}

export interface OrderInfo {
  id: number;
  orderNo: string;
  status: number; // 0 待付款 1 待发货 2 已发货 3 已完成 4 已取消 5 退款中
  statusText: string;
  totalAmount: number;
  goodsAmount: number;
  freightAmount: number;
  discountAmount: number;
  payAmount: number;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  remark?: string;
  createdAt: string;
  payAt?: string;
  shipAt?: string;
  finishAt?: string;
  logisticsCompany?: string;
  trackingNo?: string;
  items: OrderItem[];
  countdown?: number; // 剩余支付秒数
}

export interface PreviewDto {
  source: 'cart' | 'goods';
  cartIds?: number[];
  skuId?: number;
  qty?: number;
  addressId?: number;
}

export interface PreviewResult {
  items: OrderItem[];
  goodsAmount: number;
  freightAmount: number;
  discountAmount: number;
  payAmount: number;
  address?: {
    id: number;
    name: string;
    phone: string;
    fullAddress: string;
  };
}

export interface CreateOrderDto extends PreviewDto {
  addressId: number;
  remark?: string;
}

function toBackendPayload(payload: PreviewDto | CreateOrderDto): Record<string, unknown> {
  return { ...payload } as unknown as Record<string, unknown>;
}

export const orderApi = {
  async preview(payload: PreviewDto) {
    const raw = await http.post<PreviewRaw>('/order/preview', toBackendPayload(payload));
    return mapPreview(raw);
  },
  async create(payload: CreateOrderDto) {
    const res = await http.post<{ orderId?: number; id?: number; orderNo: string; payAmount: number | string }>(
      '/order',
      toBackendPayload(payload),
      { loading: true, loadingText: '提交中' },
    );
    return {
      orderId: res.orderId ?? res.id ?? 0,
      orderNo: res.orderNo,
      payAmount: num(res.payAmount),
    };
  },
  async list(params: { status?: number; page?: number; pageSize?: number }) {
    const raw = await http.get<{ list: Array<OrderRaw & { items?: OrderItemRaw[] }>; total: number }>(
      '/order',
      params,
    );
    return {
      list: (raw.list ?? []).map((o) => mapOrderInfo(o, o.items ?? [])),
      total: raw.total ?? 0,
    };
  },
  async detail(id: number): Promise<OrderInfo> {
    const raw = await http.get<OrderDetailRaw>(`/order/${id}`);
    return mapOrderInfo(raw.order, raw.items ?? []);
  },
  cancel(id: number, reason?: string) {
    return http.post(`/order/${id}/cancel`, { reason });
  },
  confirm(id: number) {
    return http.post(`/order/${id}/confirm`);
  },
  payMock(id: number) {
    return http.post<{ success: boolean }>(
      `/order/${id}/pay-mock`,
      undefined,
      { loading: true, loadingText: '支付中' },
    );
  },
  trace(id: number) {
    return http.get<Array<{ time: string; description: string }>>(`/order/${id}/trace`);
  },
};
