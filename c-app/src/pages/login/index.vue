<template>
  <view class="login-page">
    <view class="bg-watermark serif">壹</view>

    <view class="header">
      <view class="brand-frame">
        <view class="brand-line"></view>
        <text class="brand serif">优 选 酒 坊</text>
        <view class="brand-line"></view>
      </view>
      <text class="slogan serif">— 品 鉴 生 活 · 优 选 好 酒 —</text>

      <view class="seal serif">
        <text class="seal-char">壹</text>
      </view>
    </view>

    <view class="actions safe-area-bottom">
      <view class="btn primary serif" :class="{ disabled: loading }" @tap="onWechatLogin">
        <text>{{ loading ? '登 录 中…' : '微 信 一 键 登 录' }}</text>
      </view>
      <view class="agreement">
        <text>登录即代表同意</text>
        <text class="link" @tap="openTerms">《用户协议》</text>
        <text>与</text>
        <text class="link" @tap="openPrivacy">《隐私政策》</text>
      </view>
      <view class="skip serif" @tap="goHome">
        <text>暂 不 登 录 · 先 看 看</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from '@/store/user';
import { reLaunchTo } from '@/utils/nav';

const userStore = useUserStore();
const loading = ref(false);

async function onWechatLogin() {
  loading.value = true;
  try {
    let code = 'mock_code_' + Date.now();
    // #ifdef MP-WEIXIN
    try {
      const res = await new Promise<UniApp.LoginRes>((resolve, reject) => {
        uni.login({ provider: 'weixin', success: resolve, fail: reject });
      });
      code = res.code || code;
    } catch {
      // 失败时仍用 mock code
    }
    // #endif

    await userStore.loginByCode(code);
    uni.showToast({ title: '登录成功', icon: 'success' });
    setTimeout(() => reLaunchTo('/pages/index/index'), 600);
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function goHome() {
  reLaunchTo('/pages/index/index');
}

function openTerms() {
  uni.navigateTo({ url: '/pages/webview/index?type=terms' });
}

function openPrivacy() {
  uni.navigateTo({ url: '/pages/webview/index?type=privacy' });
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: $bg-page;
  padding: 240rpx $space-lg $space-xl;
  position: relative;
  overflow: hidden;
}

.bg-watermark {
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 600rpx;
  color: rgba(31, 58, 46, 0.04);
  line-height: 1;
  pointer-events: none;
  z-index: 0;
}

.header {
  text-align: center;
  position: relative;
  z-index: 1;
}

.brand-frame {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-md;
  margin-bottom: $space-md;
}
.brand-line {
  width: 80rpx;
  height: 1rpx;
  background: $color-accent;
}
.brand {
  font-size: 56rpx;
  color: $color-primary-dark;
  letter-spacing: 12rpx;
  padding-left: 12rpx;
}
.slogan {
  color: $color-accent-deep;
  font-size: $font-sm;
  letter-spacing: 6rpx;
  display: block;
}

.seal {
  margin: 100rpx auto 0;
  width: 160rpx;
  height: 160rpx;
  border: 3rpx solid $color-accent;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  &::before {
    content: '';
    position: absolute;
    inset: 8rpx;
    border: 1rpx solid rgba(184, 149, 106, 0.5);
  }
  .seal-char {
    font-size: 110rpx;
    color: $color-primary-dark;
    line-height: 1;
  }
}

.actions {
  padding: 0 $space-md;
  position: relative;
  z-index: 1;
}
.btn {
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-md;
  letter-spacing: 6rpx;
  position: relative;
  &.primary {
    background: $color-primary;
    color: $color-accent-light;
    border: 1rpx solid $color-accent;
    &::before {
      content: '';
      position: absolute;
      inset: 6rpx;
      border: 1rpx solid rgba(184, 149, 106, 0.3);
      pointer-events: none;
    }
    &:active:not(.disabled) { background: $color-primary-dark; }
  }
  &.disabled { opacity: 0.6; }
}
.agreement {
  margin-top: $space-md;
  text-align: center;
  font-size: $font-xs;
  color: $text-placeholder;
  letter-spacing: 1rpx;
  .link {
    color: $color-accent-deep;
    font-family: $font-serif;
  }
}
.skip {
  margin-top: $space-xl;
  text-align: center;
  color: $text-secondary;
  font-size: $font-sm;
  letter-spacing: 4rpx;
  padding: $space-sm 0;
}
</style>
