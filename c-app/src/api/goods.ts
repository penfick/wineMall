import { http } from '@/utils/request';

export interface GoodsItem {
  id: number;
  name: string;
  cover: string;
  price: number;
  originalPrice?: number;
  sales: number;
  stock: number;
  tagText?: string;
  status: number;
}

export interface SkuSpecKV {
  key: string;
  value: string;
}

export interface SkuItem {
  id: number;
  name: string;
  price: number;
  stock: number;
  image?: string;
  specs: SkuSpecKV[];
}

export interface GoodsDetail extends GoodsItem {
  images: string[];
  detail: string; // 富文本
  categoryId: number;
  attributes: Array<{ key: string; value: string }>;
  skus: SkuItem[];
  freightTemplateId?: number;
}

export interface GoodsListQuery {
  keyword?: string;
  categoryId?: number;
  sortBy?: 'default' | 'sales' | 'price-asc' | 'price-desc' | 'newest';
  page?: number;
  pageSize?: number;
}

/** 后端列表项原始结构 */
interface GoodsItemRaw {
  id: number;
  name: string;
  mainImage?: string;
  cover?: string;
  price: number | string;
  marketPrice?: number | string;
  originalPrice?: number | string;
  sales?: number;
  stock?: number;
  tagText?: string;
  status?: number;
}

/** 后端 detail 原始结构 */
interface GoodsDetailRaw extends GoodsItemRaw {
  subTitle?: string;
  images?: string[];
  detail?: string;
  categoryId: number;
  attributes?: Array<
    | { key: string; value: string }
    | { attributeName?: string; attrValue?: string; attributeId?: number }
  >;
  specs?: GoodsSpecRaw[];
  skus?: GoodsSpecRaw[];
  freightTemplateId?: number | null;
}

/** 后端 SKU 原始结构（attrText 形如 "颜色:红色;尺寸:L"） */
interface GoodsSpecRaw {
  id: number;
  skuCode?: string;
  attrText?: string;
  name?: string;
  price: number | string;
  marketPrice?: number | string;
  image?: string;
  stock: number;
  status?: number;
  specs?: SkuSpecKV[]; // 兼容已是结构化的情况
}

function parseAttrText(text: string | undefined): SkuSpecKV[] {
  if (!text) return [];
  return text
    .split(/[;,，；]/)
    .map((seg) => seg.trim())
    .filter(Boolean)
    .map((seg) => {
      const m = seg.match(/^([^:：]+)[:：](.+)$/);
      return m
        ? { key: m[1].trim(), value: m[2].trim() }
        : { key: '规格', value: seg };
    });
}

function mapItem(raw: GoodsItemRaw): GoodsItem {
  const price = Number(raw.price) || 0;
  const original =
    Number(raw.originalPrice ?? raw.marketPrice ?? 0) || undefined;
  return {
    id: raw.id,
    name: raw.name,
    cover: raw.cover || raw.mainImage || '',
    price,
    originalPrice: original && original > price ? original : undefined,
    sales: raw.sales ?? 0,
    stock: raw.stock ?? 0,
    tagText: raw.tagText,
    status: raw.status ?? 1,
  };
}

function mapSku(raw: GoodsSpecRaw): SkuItem {
  return {
    id: raw.id,
    name: raw.name || raw.attrText || raw.skuCode || `SKU-${raw.id}`,
    price: Number(raw.price) || 0,
    stock: raw.stock ?? 0,
    image: raw.image || undefined,
    specs:
      raw.specs && raw.specs.length
        ? raw.specs
        : parseAttrText(raw.attrText),
  };
}

function mapDetail(raw: GoodsDetailRaw): GoodsDetail {
  const base = mapItem(raw);
  const skuRawList = raw.skus ?? raw.specs ?? [];
  const attrs = (raw.attributes ?? []).map((a) => {
    const obj = a as Record<string, unknown>;
    return {
      key: String(obj.key ?? obj.attributeName ?? ''),
      value: String(obj.value ?? obj.attrValue ?? ''),
    };
  });
  return {
    ...base,
    images: raw.images ?? (base.cover ? [base.cover] : []),
    detail: raw.detail ?? '',
    categoryId: raw.categoryId,
    attributes: attrs,
    skus: skuRawList.map(mapSku),
    freightTemplateId: raw.freightTemplateId ?? undefined,
  };
}

export const goodsApi = {
  async list(params: GoodsListQuery) {
    const raw = await http.get<{ list: GoodsItemRaw[]; total: number }>(
      '/goods',
      params as Record<string, unknown>,
    );
    return { list: raw.list.map(mapItem), total: raw.total };
  },
  async detail(id: number) {
    const raw = await http.get<GoodsDetailRaw>(`/goods/${id}`);
    return mapDetail(raw);
  },
  async hot() {
    const raw = await http.get<GoodsItemRaw[]>('/goods/hot');
    return raw.map(mapItem);
  },
  async recommend() {
    const raw = await http.get<GoodsItemRaw[]>('/goods/recommend');
    return raw.map(mapItem);
  },
};

export interface CategoryNode {
  id: number;
  name: string;
  icon?: string;
  parentId: number;
  level: number;
  children?: CategoryNode[];
}

export const categoryApi = {
  tree() {
    return http.get<CategoryNode[]>('/category/tree');
  },
  homeCategories() {
    return http.get<CategoryNode[]>('/category/home');
  },
};

export interface BannerItem {
  id: number;
  title: string;
  image: string;
  jumpType: 'none' | 'goods' | 'category' | 'url';
  jumpTarget: string;
}

export const bannerApi = {
  home() {
    return http.get<BannerItem[]>('/banner', { position: 'home' });
  },
};

export interface NoticeItem {
  id: number;
  title: string;
  type: 'notice' | 'news';
  isTop: 0 | 1;
  cover?: string;
  publishedAt: string;
}

export const noticeApi = {
  list(params: { page?: number; pageSize?: number; type?: string } = {}) {
    return http.get<{ list: NoticeItem[]; total: number }>('/notice', params);
  },
  detail(id: number) {
    return http.get<NoticeItem & { content: string; views: number }>(`/notice/${id}`);
  },
};

export const favoriteApi = {
  list(params: { page?: number; pageSize?: number } = {}) {
    return http.get<{ list: GoodsItem[]; total: number }>('/favorite', params);
  },
  add(goodsId: number) {
    return http.post('/favorite', { goodsId });
  },
  remove(goodsId: number) {
    return http.delete(`/favorite/${goodsId}`);
  },
  check(goodsId: number) {
    return http.get<{ favored: boolean }>(`/favorite/check/${goodsId}`);
  },
};
