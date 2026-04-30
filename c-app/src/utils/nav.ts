// 路由跳转封装
const TAB_PAGES = [
  '/pages/index/index',
  '/pages/category/index',
  '/pages/cart/index',
  '/pages/mine/index',
];

export function navTo(url: string) {
  if (TAB_PAGES.includes(url.split('?')[0])) {
    uni.switchTab({ url: url.split('?')[0] });
  } else {
    uni.navigateTo({ url });
  }
}

export function redirectTo(url: string) {
  uni.redirectTo({ url });
}

export function navBack(delta = 1) {
  uni.navigateBack({ delta });
}

export function reLaunchTo(url: string) {
  uni.reLaunch({ url });
}
