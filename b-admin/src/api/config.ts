import request from '@/utils/request';

export interface ConfigItem {
  id: number;
  groupCode: string;
  groupName: string;
  key: string;
  label: string;
  value: string;
  /** input=单行 textarea=多行 number=数字 switch=开关 image=图片 select=下拉 */
  type: 'input' | 'textarea' | 'number' | 'switch' | 'image' | 'select';
  options?: string;
  hint?: string;
  sort: number;
}

export interface ConfigGroup {
  groupCode: string;
  groupName: string;
  items: ConfigItem[];
}

export const configApi = {
  groups: () => request.get<ConfigGroup[]>('/admin/system/config'),
  group: (groupCode: string) => request.get<ConfigGroup>(`/admin/system/config/${groupCode}`),
  saveGroup: (groupCode: string, data: Record<string, string>) =>
    request.put<void>(`/admin/system/config/${groupCode}`, { values: data }),
};
