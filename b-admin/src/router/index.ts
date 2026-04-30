/**
 * 路由：常量路由（白名单）+ 动态路由（菜单生成）
 */
import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

import DefaultLayout from '@/layouts/default-layout.vue';

/** 常量路由：登录 / 错误页 / 个人中心（任何登录用户都能访问） */
export const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', noAuth: true },
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '页面不存在', noAuth: true },
  },
  {
    path: '/',
    component: DefaultLayout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '工作台', icon: 'Odometer', affix: true },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/index.vue'),
        meta: { title: '个人信息', hidden: true },
      },
      {
        path: 'change-password',
        name: 'ChangePassword',
        component: () => import('@/views/profile/change-password.vue'),
        meta: { title: '修改密码', hidden: true },
      },

      // 商品：新增 / 编辑 / 详情（不在菜单中显示，但需要可访问）
      {
        path: 'goods/create',
        name: 'GoodsCreate',
        component: () => import('@/views/goods/edit.vue'),
        meta: { title: '新增商品', hidden: true, activeMenu: '/goods' },
      },
      {
        path: 'goods/edit/:id',
        name: 'GoodsEdit',
        component: () => import('@/views/goods/edit.vue'),
        meta: { title: '编辑商品', hidden: true, activeMenu: '/goods' },
      },
      {
        path: 'goods/detail/:id',
        name: 'GoodsDetail',
        component: () => import('@/views/goods/detail.vue'),
        meta: { title: '商品详情', hidden: true, activeMenu: '/goods' },
      },

      // 订单：详情
      {
        path: 'order/detail/:id',
        name: 'OrderDetail',
        component: () => import('@/views/order/detail.vue'),
        meta: { title: '订单详情', hidden: true, activeMenu: '/order' },
      },

      // 用户：详情
      {
        path: 'user/detail/:id',
        name: 'UserDetail',
        component: () => import('@/views/user/detail.vue'),
        meta: { title: '用户详情', hidden: true, activeMenu: '/user' },
      },

      // 运费模板：新增 / 编辑
      {
        path: 'freight/edit',
        name: 'FreightCreate',
        component: () => import('@/views/freight/edit.vue'),
        meta: { title: '新增运费模板', hidden: true, activeMenu: '/freight' },
      },
      {
        path: 'freight/edit/:id',
        name: 'FreightEdit',
        component: () => import('@/views/freight/edit.vue'),
        meta: { title: '编辑运费模板', hidden: true, activeMenu: '/freight' },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHashHistory(import.meta.env.VITE_BASE_PATH || '/'),
  routes: constantRoutes,
  scrollBehavior: () => ({ top: 0 }),
});

export default router;
