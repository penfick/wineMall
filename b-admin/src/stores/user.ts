/**
 * 用户态 store — Token + 当前管理员资料 + 按钮权限
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

import { authApi, type AdminLoginParams, type AdminProfile } from '@/api/auth';
import { StorageKey } from '@/constants/storage-key';

export const useUserStore = defineStore(
  'user',
  () => {
    const token = ref<string>('');
    const profile = ref<AdminProfile | null>(null);
    const permissions = ref<string[]>([]);

    const isLoggedIn = computed(() => !!token.value);
    const isSuper = computed(() => !!profile.value?.isSuper);

    async function login(params: AdminLoginParams) {
      const res = await authApi.login(params);
      token.value = res.token;
      profile.value = res.admin;
      // 存到 localStorage 让 axios 拦截器能读取
      localStorage.setItem(StorageKey.TOKEN, res.token);
      return res;
    }

    async function fetchProfile() {
      const data = await authApi.profile();
      profile.value = data;
      return data;
    }

    async function fetchAbility() {
      const codes = await authApi.ability();
      permissions.value = codes;
      return codes;
    }

    function hasPermission(code: string | string[]) {
      if (isSuper.value) return true;
      const codes = Array.isArray(code) ? code : [code];
      return codes.some((c) => permissions.value.includes(c));
    }

    async function logout() {
      try {
        await authApi.logout();
      } catch {
        /* 忽略服务端报错，本地清空即可 */
      }
      reset();
    }

    function reset() {
      token.value = '';
      profile.value = null;
      permissions.value = [];
      localStorage.removeItem(StorageKey.TOKEN);
      localStorage.removeItem(StorageKey.USER_INFO);
    }

    return {
      token,
      profile,
      permissions,
      isLoggedIn,
      isSuper,
      login,
      fetchProfile,
      fetchAbility,
      hasPermission,
      logout,
      reset,
    };
  },
  {
    persist: {
      key: StorageKey.USER_INFO,
      storage: localStorage,
      paths: ['token', 'profile', 'permissions'],
    },
  },
);
