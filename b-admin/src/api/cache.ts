import request from '@/utils/request';

export interface CacheOverview {
  /** Redis 信息 */
  redisVersion: string;
  uptimeDays: number;
  connectedClients: number;
  usedMemory: string;
  usedMemoryPeak: string;
  totalKeys: number;
  /** 命令统计 */
  totalCommands: number;
  opsPerSec: number;
  /** 各业务前缀分组 */
  groups: Array<{ prefix: string; count: number; description: string }>;
}

export interface CacheKeyItem {
  key: string;
  type: string;
  ttl: number;
  size: number;
}

export const cacheApi = {
  overview: () => request.get<CacheOverview>('/admin/system/cache/overview'),
  keys: (params: { pattern?: string; page?: number; pageSize?: number }) =>
    request.get<{ list: CacheKeyItem[]; total: number }>('/admin/system/cache/keys', params),
  value: (key: string) => request.get<{ key: string; type: string; value: unknown }>(
    '/admin/system/cache/value',
    { key },
  ),
  remove: (key: string) => request.delete<void>('/admin/system/cache/key', { key }),
  clear: (data: { prefix: string; confirm: string }) =>
    request.post<{ removed: number }>('/admin/system/cache/clear', data),
};
