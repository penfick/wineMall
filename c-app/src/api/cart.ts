import { http } from '@/utils/request';

/** 后端 CartItemView 原始结构 */
interface CartItemRaw {
  skuId: number;
  goodsId: number;
  goodsName: string;
  imageUrl: string;
  specName: string;
  price: string;
  qty: number;
  selected: number; // 0|1
  stock: number;
  invalidReason: 0 | 1 | 2 | 3; // 0 正常 1 已下架 2 已删除 3 库存不足
  available: boolean;
  subtotal: string;
  addedAt: number;
}

interface CartListRaw {
  list: CartItemRaw[];
  total: number;
  selectedCount: number;
  selectedAmount: string;
  hasInvalid: boolean;
}

/** 前端使用的购物车项（按页面字段习惯） */
export interface CartItem {
  id: number; // === skuId
  skuId: number;
  goodsId: number;
  goodsName: string;
  cover: string;
  skuText: string;
  price: number;
  qty: number;
  stock: number;
  selected: boolean;
  invalid: boolean;
  invalidReason: 0 | 1 | 2 | 3;
  subtotal: number;
  addedAt: number;
}

export interface CartListResult {
  list: CartItem[];
  total: number;
  selectedCount: number;
  selectedAmount: number;
  hasInvalid: boolean;
}

function mapItem(raw: CartItemRaw): CartItem {
  return {
    id: raw.skuId,
    skuId: raw.skuId,
    goodsId: raw.goodsId,
    goodsName: raw.goodsName,
    cover: raw.imageUrl,
    skuText: raw.specName,
    price: parseFloat(raw.price) || 0,
    qty: raw.qty,
    stock: raw.stock,
    selected: raw.selected === 1,
    invalid: !raw.available,
    invalidReason: raw.invalidReason,
    subtotal: parseFloat(raw.subtotal) || 0,
    addedAt: raw.addedAt,
  };
}

export const cartApi = {
  async list(): Promise<CartListResult> {
    const raw = await http.get<CartListRaw>('/cart');
    return {
      list: raw.list.map(mapItem),
      total: raw.total,
      selectedCount: raw.selectedCount,
      selectedAmount: parseFloat(raw.selectedAmount) || 0,
      hasInvalid: raw.hasInvalid,
    };
  },

  count() {
    return http.get<{ count: number }>('/cart/count');
  },

  add(skuId: number, quantity: number) {
    return http.post<{ skuId: number; qty: number }>('/cart', { skuId, quantity });
  },

  updateQty(skuId: number, quantity: number) {
    return http.put<{ skuId: number; qty: number }>('/cart/qty', { skuId, quantity });
  },

  setSelected(skuId: number, selected: boolean) {
    return http.put('/cart/select', { skuId, selected: selected ? 1 : 0 });
  },

  batchSelect(skuIds: number[], selected: boolean) {
    return http.put('/cart/select/batch', { skuIds, selected: selected ? 1 : 0 });
  },

  selectAll(selected: boolean) {
    return http.put(`/cart/select/all/${selected ? 1 : 0}`);
  },

  remove(skuId: number) {
    return http.delete(`/cart/${skuId}`);
  },

  batchRemove(skuIds: number[]) {
    return http.delete('/cart/batch', { skuIds }, { asBody: true });
  },

  clear() {
    return http.delete('/cart/clear');
  },
};
