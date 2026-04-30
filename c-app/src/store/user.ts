import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { http } from '@/utils/request';
import { setStorage, getStorage, removeStorage, TOKEN_KEY, USER_INFO_KEY } from '@/utils/storage';

export interface UserInfo {
  id: number;
  openid: string;
  nickname: string;
  avatar: string;
  gender: 0 | 1 | 2;
  phone?: string;
  status: number;
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(getStorage<string>(TOKEN_KEY) || '');
  const userInfo = ref<UserInfo | null>(getStorage<UserInfo>(USER_INFO_KEY));

  const isLogin = computed(() => Boolean(token.value));

  function setToken(t: string) {
    token.value = t;
    setStorage(TOKEN_KEY, t);
  }

  function setUserInfo(info: UserInfo) {
    userInfo.value = info;
    setStorage(USER_INFO_KEY, info);
  }

  async function loginByCode(code: string) {
    const res = await http.post<{ token: string; userInfo: UserInfo }>(
      '/auth/wechat-login',
      { code },
      { auth: false, loading: true, loadingText: '登录中' },
    );
    setToken(res.token);
    setUserInfo(res.userInfo);
    return res;
  }

  async function refreshUserInfo() {
    const info = await http.get<UserInfo>('/auth/profile');
    setUserInfo(info);
    return info;
  }

  async function updateProfile(payload: Partial<UserInfo>) {
    const info = await http.post<UserInfo>('/auth/profile', payload);
    setUserInfo(info);
    return info;
  }

  function logout() {
    token.value = '';
    userInfo.value = null;
    removeStorage(TOKEN_KEY);
    removeStorage(USER_INFO_KEY);
  }

  return {
    token,
    userInfo,
    isLogin,
    setToken,
    setUserInfo,
    loginByCode,
    refreshUserInfo,
    updateProfile,
    logout,
  };
});
