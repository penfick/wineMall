// 统一请求封装：处理鉴权 / 错误码 / loading / 401 跳登录
import { getStorage, removeStorage, TOKEN_KEY } from './storage';
import { UNAUTHORIZED_CODES, ErrorCode } from './error-code';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const PREFIX = import.meta.env.VITE_API_PREFIX || '';

export interface ApiResult<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: Record<string, unknown> | unknown[];
  header?: Record<string, string>;
  loading?: boolean;
  loadingText?: string;
  silent?: boolean; // true 时不弹错误 toast
  auth?: boolean;   // 默认 true，是否需要带 token
}

let pendingCount = 0;

function showLoading(text = '加载中') {
  pendingCount += 1;
  uni.showLoading({ title: text, mask: true });
}

function hideLoading() {
  pendingCount = Math.max(0, pendingCount - 1);
  if (pendingCount === 0) uni.hideLoading();
}

let isRedirectingToLogin = false;
function redirectLogin() {
  if (isRedirectingToLogin) return;
  isRedirectingToLogin = true;
  removeStorage(TOKEN_KEY);
  uni.showToast({ title: '请先登录', icon: 'none' });
  setTimeout(() => {
    uni.navigateTo({
      url: '/pages/login/index',
      complete: () => {
        isRedirectingToLogin = false;
      },
    });
  }, 300);
}

export function request<T = unknown>(url: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    data,
    header = {},
    loading = false,
    loadingText,
    silent = false,
    auth = true,
  } = options;

  if (loading) showLoading(loadingText);

  return new Promise<T>((resolve, reject) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...header };
    if (auth) {
      const token = getStorage<string>(TOKEN_KEY);
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    uni.request({
      url: BASE_URL + PREFIX + url,
      method,
      data,
      header: headers,
      timeout: 15000,
      success: (res) => {
        if (loading) hideLoading();
        const status = res.statusCode || 0;
        if (status === 401) {
          redirectLogin();
          reject(new Error('未授权'));
          return;
        }
        if (status < 200 || status >= 300) {
          if (!silent) uni.showToast({ title: `网络错误 ${status}`, icon: 'none' });
          reject(new Error(`HTTP ${status}`));
          return;
        }
        const body = res.data as ApiResult<T>;
        if (!body || typeof body.code !== 'number') {
          if (!silent) uni.showToast({ title: '响应格式错误', icon: 'none' });
          reject(new Error('Invalid response'));
          return;
        }
        if (body.code !== ErrorCode.SUCCESS) {
          // 业务码 token 失效 — 走跳登录流程
          if (UNAUTHORIZED_CODES.includes(body.code)) {
            redirectLogin();
            reject(new Error(body.message || '登录已失效'));
            return;
          }
          if (!silent) uni.showToast({ title: body.message || '请求失败', icon: 'none' });
          reject(new Error(body.message || `code ${body.code}`));
          return;
        }
        resolve(body.data);
      },
      fail: (err) => {
        if (loading) hideLoading();
        if (!silent) uni.showToast({ title: '网络异常，请重试', icon: 'none' });
        reject(err);
      },
    });
  });
}

export const http = {
  get<T = unknown>(url: string, params?: Record<string, unknown>, opts: Omit<RequestOptions, 'method' | 'data'> = {}) {
    const qs = params
      ? '?' + Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return request<T>(url + qs, { ...opts, method: 'GET' });
  },
  post<T = unknown>(url: string, data?: Record<string, unknown> | unknown[], opts: Omit<RequestOptions, 'method' | 'data'> = {}) {
    return request<T>(url, { ...opts, method: 'POST', data });
  },
  put<T = unknown>(url: string, data?: Record<string, unknown>, opts: Omit<RequestOptions, 'method' | 'data'> = {}) {
    return request<T>(url, { ...opts, method: 'PUT', data });
  },
  delete<T = unknown>(
    url: string,
    paramsOrBody?: Record<string, unknown>,
    opts: Omit<RequestOptions, 'method' | 'data'> & { asBody?: boolean } = {},
  ) {
    const { asBody, ...rest } = opts;
    if (asBody) {
      return request<T>(url, { ...rest, method: 'DELETE', data: paramsOrBody });
    }
    const qs = paramsOrBody
      ? '?' + Object.entries(paramsOrBody)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return request<T>(url + qs, { ...rest, method: 'DELETE' });
  },
};
