/**
 * 权限 store — 根据后端返回的菜单生成 Vue Router 路由
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { RouteRecordRaw } from 'vue-router';

import { authApi, type MenuNode } from '@/api/auth';

// 自动收集 src/views 下所有 .vue 组件
const viewModules = import.meta.glob('@/views/**/*.vue');

const NotFoundComponent = () => import('@/views/error/404.vue');

function loadComponent(component?: string) {
  if (!component) return undefined;
  const normalized = component.startsWith('/') ? component.slice(1) : component;
  const candidates = [
    `/src/views/${normalized}.vue`,
    `/src/views/${normalized}/index.vue`,
  ];
  for (const key of candidates) {
    if (viewModules[key]) return viewModules[key];
  }
  console.warn(`[permission] 未找到组件: ${component}（尝试: ${candidates.join(' / ')}）`);
  return NotFoundComponent;
}

function buildRoute(node: MenuNode): RouteRecordRaw | null {
  // 按钮（type=3）不参与路由
  if (node.type === 3) return null;
  if (node.visible === 0 || node.status === 0) return null;

  const route = {
    path: node.path || `/menu-${node.id}`,
    name: node.path ? `menu_${node.id}` : undefined,
    component: node.type === 2 ? loadComponent(node.component) : undefined,
    meta: {
      title: node.name,
      icon: node.icon,
      menuId: node.id,
      permission: node.permission,
    },
    children: [] as RouteRecordRaw[],
  };

  if (node.children?.length) {
    const children = node.children
      .map(buildRoute)
      .filter((r): r is RouteRecordRaw => r !== null);
    if (children.length) route.children = children;
  }

  return route as unknown as RouteRecordRaw;
}

export const usePermissionStore = defineStore('permission', () => {
  const menuTree = ref<MenuNode[]>([]);
  const dynamicRoutes = ref<RouteRecordRaw[]>([]);
  const loaded = ref(false);

  async function generateRoutes() {
    const tree = await authApi.menu();
    menuTree.value = tree;

    const routes = tree
      .map(buildRoute)
      .filter((r): r is RouteRecordRaw => r !== null);

    dynamicRoutes.value = routes;
    loaded.value = true;
    return routes;
  }

  function reset() {
    menuTree.value = [];
    dynamicRoutes.value = [];
    loaded.value = false;
  }

  return { menuTree, dynamicRoutes, loaded, generateRoutes, reset };
});
