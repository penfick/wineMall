/**
 * localStorage / sessionStorage 键名集中管理
 * 命名规范：wm-admin:<域>:<key>
 */
export const StorageKey = {
  TOKEN: 'wm-admin:auth:token',
  USER_INFO: 'wm-admin:auth:user',
  PERMISSIONS: 'wm-admin:auth:permissions',
  SIDEBAR_COLLAPSED: 'wm-admin:layout:sidebar-collapsed',
  TABLE_COLUMNS: (page: string) => `wm-admin:table-cols:${page}`,
  DICT_CACHE: 'wm-admin:dict:cache',
  DICT_CACHE_AT: 'wm-admin:dict:cached-at',
} as const;
