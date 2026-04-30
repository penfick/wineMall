import { http } from '@/utils/request';

/** 后端 AddressEntity 原始结构 */
interface AddressRaw {
  id: number;
  userId: number;
  receiverName: string;
  receiverPhone: string;
  provinceCode: string;
  cityCode: string;
  districtCode: string;
  provinceName: string;
  cityName: string;
  districtName: string;
  detailAddress: string;
  isDefault: 0 | 1;
  createdAt?: string;
  updatedAt?: string;
}

/** 前端使用的地址结构 */
export interface Address {
  id: number;
  name: string;
  phone: string;
  provinceCode: string;
  cityCode: string;
  districtCode: string;
  provinceName: string;
  cityName: string;
  districtName: string;
  detail: string;
  isDefault: 0 | 1;
  fullAddress: string;
}

export interface AddressInput {
  name: string;
  phone: string;
  provinceCode: string;
  cityCode: string;
  districtCode: string;
  detail: string;
  isDefault?: 0 | 1;
}

function fromRaw(raw: AddressRaw): Address {
  return {
    id: raw.id,
    name: raw.receiverName,
    phone: raw.receiverPhone,
    provinceCode: raw.provinceCode,
    cityCode: raw.cityCode,
    districtCode: raw.districtCode,
    provinceName: raw.provinceName,
    cityName: raw.cityName,
    districtName: raw.districtName,
    detail: raw.detailAddress,
    isDefault: raw.isDefault,
    fullAddress: `${raw.provinceName}${raw.cityName}${raw.districtName}${raw.detailAddress}`,
  };
}

function toPayload(input: Partial<AddressInput>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.receiverName = input.name;
  if (input.phone !== undefined) payload.receiverPhone = input.phone;
  if (input.provinceCode !== undefined) payload.provinceCode = input.provinceCode;
  if (input.cityCode !== undefined) payload.cityCode = input.cityCode;
  if (input.districtCode !== undefined) payload.districtCode = input.districtCode;
  if (input.detail !== undefined) payload.detailAddress = input.detail;
  if (input.isDefault !== undefined) payload.isDefault = input.isDefault;
  return payload;
}

export const addressApi = {
  async list(): Promise<Address[]> {
    const raw = await http.get<AddressRaw[]>('/address');
    return raw.map(fromRaw);
  },

  async getDefault(): Promise<Address | null> {
    const raw = await http.get<AddressRaw | null>('/address/default');
    return raw ? fromRaw(raw) : null;
  },

  async detail(id: number): Promise<Address> {
    const raw = await http.get<AddressRaw>(`/address/${id}`);
    return fromRaw(raw);
  },

  async create(input: AddressInput): Promise<Address> {
    const raw = await http.post<AddressRaw>('/address', toPayload(input));
    return fromRaw(raw);
  },

  async update(id: number, input: Partial<AddressInput>): Promise<Address> {
    const raw = await http.put<AddressRaw>(`/address/${id}`, toPayload(input));
    return fromRaw(raw);
  },

  setDefault(id: number) {
    return http.put<{ id: number; isDefault: 1 }>(`/address/${id}/default`);
  },

  remove(id: number) {
    return http.delete<{ id: number }>(`/address/${id}`);
  },
};
