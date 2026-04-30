import request from '@/utils/request';

export interface RegionNode {
  code: string;
  name: string;
  parentCode?: string;
  level: 1 | 2 | 3;
  children?: RegionNode[];
}

export const regionApi = {
  tree: () => request.get<RegionNode[]>('/region/tree'),
  children: (parentCode: string) => request.get<RegionNode[]>(`/region/children/${parentCode}`),
};
