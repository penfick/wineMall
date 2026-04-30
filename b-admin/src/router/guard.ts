/**
 * 路由守卫：登录态校验 + 动态路由注入 + 进度条 + 标题
 */
import type { Router, RouteRecordRaw } from 'vue-router';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

import { useUserStore } from '@/stores/user';
import { usePermissionStore } from '@/stores/permission';
import DefaultLayout from '@/layouts/default-layout.vue';

NProgress.configure({ showSpinner: false, trickleSpeed: 200 });

const SITE_TITLE = '优选商城后台';
const WHITE_LIST = ['/login', '/404'];

export function setupRouterGuard(router: Router) {
  router.beforeEach(async (to, _from) => {
    NProgress.start();

    document.title = to.meta.title ? `${to.meta.title} · ${SITE_TITLE}` : SITE_TITLE;

    const user = useUserStore();
    const permission = usePermissionStore();

    // 白名单
    if (WHITE_LIST.includes(to.path)) {
      // 已登录访问 /login → 直接跳工作台
      if (to.path === '/login' && user.isLoggedIn) return { path: '/' };
      return true;
    }

    if (!user.isLoggedIn) {
      return { path: '/login', query: { redirect: to.fullPath } };
    }

    // 动态路由未加载 → 加载并 next
    if (!permission.loaded) {
      try {
        // 并行：菜单（生成路由）+ 按钮权限
        const [routes] = await Promise.all([
          permission.generateRoutes(),
          user.fetchAbility(),
        ]);

        // 把动态路由挂到根 layout 下
        const rootName = 'RootLayout';
        if (!router.hasRoute(rootName)) {
          router.addRoute({
            path: '/__root',
            name: rootName,
            component: DefaultLayout,
            children: routes as RouteRecordRaw[],
          });
        } else {
          for (const r of routes) router.addRoute(rootName, r);
        }

        // 重新解析当前 to（动态路由刚注入）
        return { ...to, replace: true };
      } catch (e) {
        console.error('[router] 动态路由加载失败：', e);
        user.reset();
        return { path: '/login', query: { redirect: to.fullPath } };
      }
    }

    return true;
  });

  router.afterEach((to) => {
    NProgress.done();
    if (to.matched.length === 0) {
      router.replace('/404');
    }
  });

  router.onError((err) => {
    NProgress.done();
    console.error('[router] 路由错误：', err);
  });
}
