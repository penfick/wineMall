import { onShow, onReady } from '@dcloudio/uni-app';

/**
 * 隐藏原生 tabBar，避免 switchTab 切页时它先于自定义栏渲染造成闪烁。
 * onShow / onReady 双重保险；同步调用，不依赖返回 Promise。
 */
export function useHideNativeTabBar() {
  const hide = () => {
    // #ifdef MP-WEIXIN
    try {
      uni.hideTabBar({ animation: false });
    } catch (_) {
      // 忽略：部分基础库或 H5 端不支持
    }
    // #endif
  };
  onReady(hide);
  onShow(hide);
}
