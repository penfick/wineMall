<template>
  <view class="mine-page">
    <!-- 头部：墨绿底 + 香槟金分隔线 -->
    <view class="header">
      <view class="brand-mark serif">壹</view>
      <view class="user-area" @tap="onUserTap">
        <image
          class="avatar"
          :src="userStore.userInfo?.avatar || DEFAULT_AVATAR"
          mode="aspectFill"
        />
        <view class="user-info">
          <text class="nickname serif">{{ userStore.isLogin ? userStore.userInfo?.nickname : '点 击 登 录' }}</text>
          <text class="phone">{{ userStore.userInfo?.phone ? formatPhone(userStore.userInfo.phone) : '欢 迎 至 优 选 酒 坊' }}</text>
        </view>
        <text class="edit-arrow" v-if="userStore.isLogin">›</text>
      </view>
      <view class="header-line"></view>
    </view>

    <!-- 订单卡片 -->
    <view class="order-card">
      <view class="card-head">
        <view class="bar"></view>
        <text class="title serif">我 的 订 单</text>
        <view class="more" @tap="goOrders(-1)">
          <text>全部订单</text>
          <text class="arrow">›</text>
        </view>
      </view>
      <view class="status-grid">
        <view class="status-cell" v-for="s in statusList" :key="s.code" @tap="goOrders(s.code)">
          <view :class="['s-icon', `s-${s.icon}`]"></view>
          <text class="label">{{ s.label }}</text>
        </view>
      </view>
    </view>

    <!-- 菜单 -->
    <view class="menu-card">
      <view v-for="m in menus" :key="m.title" class="menu-row" @tap="m.action">
        <view :class="['m-icon', `mi-${m.icon}`]"></view>
        <text class="m-title">{{ m.title }}</text>
        <text class="arrow">›</text>
      </view>
    </view>

    <view v-if="userStore.isLogin" class="logout-btn serif" @tap="onLogout">退 出 登 录</view>

    <view class="foot serif">— 优 选 好 酒 · 品 鉴 生 活 —</view>

    <CustomTabBar :current="3" />
  </view>
</template>

<script setup lang="ts">
import { useUserStore } from '@/store/user';
import { navTo } from '@/utils/nav';
import { formatPhone } from '@/utils/format';
import { DEFAULT_AVATAR } from '@/utils/assets';
import CustomTabBar from '@/components/CustomTabBar.vue';
import { useHideNativeTabBar } from '@/composables/useHideNativeTabBar';

useHideNativeTabBar();

const userStore = useUserStore();

const statusList = [
  { code: 0, label: '待 付 款', icon: 'pay' },
  { code: 1, label: '待 发 货', icon: 'pack' },
  { code: 2, label: '待 收 货', icon: 'truck' },
  { code: 3, label: '已 完 成', icon: 'done' },
];

const menus = [
  { icon: 'address', title: '收 货 地 址', action: () => requireLogin('/pages/address/list') },
  { icon: 'fav', title: '我 的 收 藏', action: () => requireLogin('/pages/favorite/index') },
  { icon: 'profile', title: '个 人 资 料', action: () => requireLogin('/pages/profile/index') },
  { icon: 'phone', title: '联 系 客 服', action: () => uni.makePhoneCall({ phoneNumber: '400-000-0000' }).catch(() => {}) },
  { icon: 'info', title: '关 于 我 们', action: () => navTo('/pages/webview/index?type=about') },
];

function onUserTap() {
  if (!userStore.isLogin) navTo('/pages/login/index');
  else navTo('/pages/profile/index');
}

function goOrders(status: number) {
  if (!userStore.isLogin) {
    navTo('/pages/login/index');
    return;
  }
  navTo(`/pages/order/list?status=${status}`);
}

function requireLogin(url: string) {
  if (!userStore.isLogin) {
    navTo('/pages/login/index');
    return;
  }
  navTo(url);
}

async function onLogout() {
  const res = await uni.showModal({ title: '退出登录', content: '确认退出？' });
  if (!res.confirm) return;
  userStore.logout();
  uni.showToast({ title: '已退出', icon: 'none' });
}
</script>

<style lang="scss" scoped>
.mine-page {
  min-height: 100vh;
  background: $bg-page;
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

// === 头部 ===
.header {
  position: relative;
  background: linear-gradient(135deg, $color-primary-dark 0%, $color-primary 100%);
  padding: 100rpx $space-lg $space-xl;
  overflow: hidden;
}
.brand-mark {
  position: absolute;
  right: -20rpx;
  top: 60rpx;
  font-size: 220rpx;
  color: rgba(184, 149, 106, 0.08);
  line-height: 1;
  pointer-events: none;
}
.user-area {
  display: flex;
  align-items: center;
  min-height: 140rpx;
  position: relative;
  z-index: 1;
}
.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: $bg-card;
  margin-right: $space-md;
  border: 2rpx solid $color-accent;
}
.user-info { flex: 1; }
.nickname {
  display: block;
  color: $color-accent-light;
  font-size: $font-lg;
  letter-spacing: 4rpx;
  margin-bottom: 8rpx;
}
.phone {
  color: rgba(212, 181, 126, 0.7);
  font-size: $font-xs;
  letter-spacing: 2rpx;
}
.edit-arrow {
  color: $color-accent;
  font-size: 40rpx;
}
.header-line {
  position: absolute;
  left: $space-lg;
  right: $space-lg;
  bottom: $space-md;
  height: 1rpx;
  background: linear-gradient(to right, transparent, $color-accent, transparent);
  opacity: 0.5;
}

// === 卡片通用 ===
.order-card, .menu-card {
  background: $bg-card;
  margin: $space-md;
  padding: $space-md $space-lg;
  border: 1rpx solid $border-light;
}
.card-head {
  display: flex;
  align-items: center;
  gap: $space-sm;
  margin-bottom: $space-md;
  .bar {
    width: 4rpx;
    height: 24rpx;
    background: $color-accent;
  }
  .title {
    font-size: $font-md;
    color: $color-primary-dark;
    letter-spacing: 4rpx;
    flex: 1;
  }
  .more {
    display: flex;
    align-items: center;
    gap: 4rpx;
    font-size: $font-xs;
    color: $text-secondary;
    .arrow { color: $color-accent; font-size: $font-md; }
  }
}

// === 订单状态格 ===
.status-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $space-sm;
  padding-top: $space-sm;
}
.status-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $space-sm 0;
  gap: $space-xs;
  .label {
    font-size: $font-xs;
    color: $text-regular;
    letter-spacing: 1rpx;
  }
  &:active .s-icon { color: $color-primary-dark; }
}
.s-icon {
  width: 48rpx;
  height: 48rpx;
  position: relative;
  color: $color-primary;
}
// 钱币（圆 + ¥）
.s-pay {
  &::before {
    content: '';
    position: absolute;
    inset: 4rpx;
    border: 2rpx solid currentColor;
    border-radius: 50%;
  }
  &::after {
    content: '¥';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 22rpx;
    color: currentColor;
    font-family: $font-mono;
  }
}
// 包裹（方框）
.s-pack {
  &::before {
    content: '';
    position: absolute;
    inset: 4rpx;
    border: 2rpx solid currentColor;
  }
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 4rpx;
    right: 4rpx;
    height: 2rpx;
    background: currentColor;
  }
}
// 卡车（车厢+轮）
.s-truck {
  &::before {
    content: '';
    position: absolute;
    top: 12rpx;
    left: 4rpx;
    width: 28rpx;
    height: 20rpx;
    border: 2rpx solid currentColor;
  }
  &::after {
    content: '';
    position: absolute;
    top: 16rpx;
    right: 4rpx;
    width: 14rpx;
    height: 16rpx;
    border: 2rpx solid currentColor;
    border-left: 0;
  }
}
// 完成（勾）
.s-done {
  &::before {
    content: '';
    position: absolute;
    inset: 4rpx;
    border: 2rpx solid currentColor;
    border-radius: 50%;
  }
  &::after {
    content: '';
    position: absolute;
    top: 18rpx;
    left: 14rpx;
    width: 16rpx;
    height: 8rpx;
    border-left: 2rpx solid currentColor;
    border-bottom: 2rpx solid currentColor;
    transform: rotate(-45deg);
  }
}

// === 菜单行 ===
.menu-row {
  display: flex;
  align-items: center;
  padding: $space-md 0;
  min-height: 88rpx;
  border-bottom: 1rpx dashed $border-light;
  gap: $space-md;
  &:last-child { border-bottom: 0; }
  .m-title {
    flex: 1;
    font-size: $font-base;
    color: $text-primary;
    letter-spacing: 2rpx;
  }
  .arrow {
    color: $color-accent;
    font-size: 36rpx;
  }
}
.m-icon {
  width: 36rpx;
  height: 36rpx;
  position: relative;
  color: $color-primary;
}
.mi-address {
  &::before {
    content: '';
    position: absolute;
    top: 4rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 20rpx;
    height: 20rpx;
    border: 2rpx solid currentColor;
    border-radius: 50% 50% 50% 0;
    transform: translateX(-50%) rotate(-45deg);
  }
  &::after {
    content: '';
    position: absolute;
    top: 10rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 6rpx;
    height: 6rpx;
    background: $bg-card;
    border-radius: 50%;
  }
}
.mi-fav {
  &::before {
    content: '';
    position: absolute;
    top: 8rpx;
    left: 4rpx;
    width: 14rpx;
    height: 22rpx;
    border: 2rpx solid currentColor;
    border-bottom: 0;
    border-radius: 14rpx 14rpx 0 0;
    transform: rotate(-45deg);
    transform-origin: bottom left;
  }
  &::after {
    content: '';
    position: absolute;
    top: 8rpx;
    right: 4rpx;
    width: 14rpx;
    height: 22rpx;
    border: 2rpx solid currentColor;
    border-bottom: 0;
    border-radius: 14rpx 14rpx 0 0;
    transform: rotate(45deg);
    transform-origin: bottom right;
  }
}
.mi-profile {
  &::before {
    content: '';
    position: absolute;
    top: 4rpx;
    left: 50%;
    width: 14rpx;
    height: 14rpx;
    border: 2rpx solid currentColor;
    border-radius: 50%;
    transform: translateX(-50%);
  }
  &::after {
    content: '';
    position: absolute;
    bottom: 4rpx;
    left: 50%;
    width: 24rpx;
    height: 14rpx;
    border: 2rpx solid currentColor;
    border-bottom: 0;
    border-radius: 24rpx 24rpx 0 0;
    transform: translateX(-50%);
  }
}
.mi-phone {
  &::before {
    content: '';
    position: absolute;
    inset: 4rpx 10rpx;
    border: 2rpx solid currentColor;
    border-radius: 4rpx;
  }
  &::after {
    content: '';
    position: absolute;
    bottom: 6rpx;
    left: 50%;
    width: 8rpx;
    height: 8rpx;
    background: currentColor;
    border-radius: 50%;
    transform: translateX(-50%);
  }
}
.mi-info {
  &::before {
    content: '';
    position: absolute;
    inset: 4rpx;
    border: 2rpx solid currentColor;
    border-radius: 50%;
  }
  &::after {
    content: 'i';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 22rpx;
    color: currentColor;
    font-family: $font-serif;
    font-style: italic;
  }
}

.logout-btn {
  margin: $space-md;
  background: transparent;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $color-primary-dark;
  border: 1rpx solid $color-accent;
  font-size: $font-base;
  letter-spacing: 6rpx;
  &:active { background: rgba(184, 149, 106, 0.06); }
}

.foot {
  text-align: center;
  font-size: $font-xs;
  color: $color-accent-deep;
  letter-spacing: 8rpx;
  padding: $space-md 0 $space-lg;
}
</style>
