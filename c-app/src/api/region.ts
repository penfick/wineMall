import { http } from '@/utils/request';

export interface RegionNode {
  code: string;
  name: string;
  level: 1 | 2 | 3;
  children?: RegionNode[];
}

export const regionApi = {
  tree() {
    return http.get<RegionNode[]>('/region/tree');
  },
};
