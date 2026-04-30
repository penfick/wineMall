// 本地存储封装（兼容微信小程序与 H5）
const PREFIX = 'wm_';

export function setStorage<T = unknown>(key: string, value: T): void {
  try {
    uni.setStorageSync(PREFIX + key, value as never);
  } catch (e) {
    console.error('setStorage failed', key, e);
  }
}

export function getStorage<T = unknown>(key: string, fallback: T | null = null): T | null {
  try {
    const v = uni.getStorageSync(PREFIX + key);
    if (v === '' || v === undefined || v === null) return fallback;
    return v as T;
  } catch {
    return fallback;
  }
}

export function removeStorage(key: string): void {
  try {
    uni.removeStorageSync(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export const TOKEN_KEY = 'token';
export const USER_INFO_KEY = 'userInfo';
