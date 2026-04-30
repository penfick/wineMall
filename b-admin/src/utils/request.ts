/**
 * Axios 封装 — 统一请求/响应/错误处理
 *
 * 设计要点：
 * - 自动注入 Token（来自 Pinia user store）
 * - 业务码与 HTTP 码双层校验
 * - 401 自动登出跳登录（防重复弹窗）
 * - 同源请求去重（同 method+url+params 在途时，第二次直接返回前一次的 promise）
 * - 业务异常通过 BizError 抛出，方便组件层 catch
 */
import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { ElMessage, ElMessageBox } from 'element-plus';
import qs from 'qs';

import { StorageKey } from '@/constants/storage-key';
import { BizErrorCode, UNAUTHORIZED_CODES } from '@/constants/error-code';
import type { ApiResponse } from '@/types/api';

/* ==================== 业务异常 ==================== */
export class BizError extends Error {
  code: number;
  data: unknown;

  constructor(code: number, message: string, data: unknown = null) {
    super(message);
    this.name = 'BizError';
    this.code = code;
    this.data = data;
  }
}

/* ==================== 自定义请求配置 ==================== */
export interface RequestOptions {
  /** 跳过 Token 注入（如登录接口） */
  skipAuth?: boolean;
  /** 失败时不弹 Message（业务自己处理） */
  silent?: boolean;
  /** 直接返回完整 ApiResponse 而不是 data 字段 */
  rawResponse?: boolean;
  /** 防重复请求（同 url+method+params 在途时复用 promise） */
  dedupe?: boolean;
}

declare module 'axios' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface InternalAxiosRequestConfig {
    _wm?: RequestOptions;
  }
  interface AxiosRequestConfig {
    _wm?: RequestOptions;
  }
}

/* ==================== 实例 ==================== */
const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 20_000,
  paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'repeat' }),
});

/* ==================== 请求去重 ==================== */
const pendingMap = new Map<string, AbortController>();

function buildPendingKey(config: InternalAxiosRequestConfig): string {
  return [config.method, config.url, qs.stringify(config.params || {}), JSON.stringify(config.data || {})].join('|');
}

function addPending(config: InternalAxiosRequestConfig) {
  if (!config._wm?.dedupe) return;
  const key = buildPendingKey(config);
  removePending(config); // 同 key 在途，先取消
  const controller = new AbortController();
  config.signal = controller.signal;
  pendingMap.set(key, controller);
}

function removePending(config: InternalAxiosRequestConfig | AxiosRequestConfig) {
  const key = buildPendingKey(config as InternalAxiosRequestConfig);
  const controller = pendingMap.get(key);
  if (controller) {
    controller.abort();
    pendingMap.delete(key);
  }
}

/* ==================== 防重复登录提示 ==================== */
let isShowingLogout = false;

function handleUnauthorized(message = '登录状态已失效，请重新登录') {
  if (isShowingLogout) return;
  isShowingLogout = true;
  ElMessageBox.alert(message, '提示', {
    type: 'warning',
    confirmButtonText: '重新登录',
    showClose: false,
  })
    .then(() => {
      localStorage.removeItem(StorageKey.TOKEN);
      localStorage.removeItem(StorageKey.USER_INFO);
      const redirect = encodeURIComponent(location.hash.replace('#', '') || '/');
      location.href = `/#/login?redirect=${redirect}`;
      location.reload();
    })
    .finally(() => {
      isShowingLogout = false;
    });
}

/* ==================== 请求拦截 ==================== */
service.interceptors.request.use(
  (config) => {
    addPending(config);

    if (!config._wm?.skipAuth) {
      const token = localStorage.getItem(StorageKey.TOKEN);
      if (token && config.headers) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

/* ==================== 响应拦截 ==================== */
service.interceptors.response.use(
  (response) => {
    removePending(response.config);

    const opts = response.config._wm || {};
    const payload = response.data as ApiResponse;

    // 非 JSON 响应（文件流等）直接返回
    if (typeof payload !== 'object' || payload === null || !('code' in payload)) {
      return response.data;
    }

    if (opts.rawResponse) {
      return payload;
    }

    if (payload.code === BizErrorCode.SUCCESS) {
      return payload.data;
    }

    // 业务错误统一处理
    if (UNAUTHORIZED_CODES.includes(payload.code)) {
      handleUnauthorized(payload.message);
    } else if (payload.code === BizErrorCode.PASSWORD_INIT_REQUIRED) {
      // 首次登录强制改密 — 业务页面自行 catch 并跳转，这里不弹 toast
    } else if (!opts.silent) {
      ElMessage.error(payload.message || '请求失败');
    }

    return Promise.reject(new BizError(payload.code, payload.message, payload.data));
  },
  (error: AxiosError) => {
    if (error.config) removePending(error.config as InternalAxiosRequestConfig);

    // 主动取消（去重逻辑触发）— 静默
    if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
      return Promise.reject(new BizError(-1, 'canceled'));
    }

    const opts = (error.config as InternalAxiosRequestConfig)?._wm || {};
    const status = error.response?.status;

    let message = error.message || '网络异常';
    if (status === 401) {
      handleUnauthorized();
    } else if (status === 403) {
      message = '没有访问权限';
    } else if (status === 404) {
      message = '接口不存在';
    } else if (status === 429) {
      message = '请求过于频繁，请稍后再试';
    } else if (status && status >= 500) {
      message = '服务器开小差了，请稍后再试';
    } else if (error.code === 'ECONNABORTED') {
      message = '请求超时';
    }

    if (status !== 401 && !opts.silent) {
      ElMessage.error(message);
    }
    return Promise.reject(new BizError(status || -1, message));
  },
);

/* ==================== 对外暴露 ==================== */
export interface RequestMethod {
  <T = unknown>(config: AxiosRequestConfig & { _wm?: RequestOptions }): Promise<T>;
  get<T = unknown>(url: string, params?: unknown, opts?: RequestOptions): Promise<T>;
  post<T = unknown>(url: string, data?: unknown, opts?: RequestOptions): Promise<T>;
  put<T = unknown>(url: string, data?: unknown, opts?: RequestOptions): Promise<T>;
  patch<T = unknown>(url: string, data?: unknown, opts?: RequestOptions): Promise<T>;
  delete<T = unknown>(url: string, params?: unknown, opts?: RequestOptions): Promise<T>;
}

const request = ((config: AxiosRequestConfig) => service.request(config)) as RequestMethod;

request.get = <T>(url: string, params?: unknown, _wm?: RequestOptions) =>
  service.request<unknown, T>({ url, method: 'get', params, _wm });

request.post = <T>(url: string, data?: unknown, _wm?: RequestOptions) =>
  service.request<unknown, T>({ url, method: 'post', data, _wm });

request.put = <T>(url: string, data?: unknown, _wm?: RequestOptions) =>
  service.request<unknown, T>({ url, method: 'put', data, _wm });

request.patch = <T>(url: string, data?: unknown, _wm?: RequestOptions) =>
  service.request<unknown, T>({ url, method: 'patch', data, _wm });

request.delete = <T>(url: string, params?: unknown, _wm?: RequestOptions) =>
  service.request<unknown, T>({ url, method: 'delete', params, _wm });

export default request;
export { service as axiosInstance };
