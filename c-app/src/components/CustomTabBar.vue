<template>
  <view class="ctb-wrap">
    <view class="ctb">
      <view
        v-for="(item, idx) in tabs"
        :key="item.path"
        class="ctb-item"
        :class="{ active: current === idx }"
        @tap="onTap(idx)"
      >
        <view class="ctb-top-mark" :class="{ on: current === idx }"></view>
        <view class="ctb-icon-wrap">
          <view :class="['icon', `icon-${item.icon}`, { fill: current === idx }]">
            <template v-if="item.icon === 'category'">
              <view class="grid-cell"></view>
              <view class="grid-cell"></view>
              <view class="grid-cell"></view>
              <view class="grid-cell"></view>
            </template>
          </view>
          <view v-if="item.icon === 'cart' && badge > 0" class="ctb-badge">
            <text>{{ badge > 99 ? '99+' : badge }}</text>
          </view>
        </view>
        <text class="ctb-label serif" :class="{ on: current === idx }">{{ item.label }}</text>
        <view class="ctb-bottom-bar" :class="{ on: current === idx }"></view>
      </view>
    </view>
    <view class="ctb-safe"></view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useCartStore } from '@/store/cart';
import { storeToRefs } from 'pinia';

const props = defineProps<{ current: number }>();

const cart = useCartStore();
const { totalCount } = storeToRefs(cart);
const badge = computed(() => totalCount.value);

interface Tab {
  label: string;
  icon: 'home' | 'category' | 'cart' | 'mine';
  path: string;
}

const tabs: Tab[] = [
  { label: '首 页', icon: 'home', path: '/pages/index/index' },
  { label: '分 类', icon: 'category', path: '/pages/category/index' },
  { label: '购物车', icon: 'cart', path: '/pages/cart/index' },
  { label: '我 的', icon: 'mine', path: '/pages/mine/index' },
];

function onTap(idx: number) {
  if (idx === props.current) return;
  // #ifdef MP-WEIXIN
  // 切页前主动再隐藏一次原生栏，杜绝 switchTab 瞬间露出
  try {
    uni.hideTabBar({ animation: false });
  } catch (_) {
    // ignore
  }
  // #endif
  uni.switchTab({ url: tabs[idx].path });
}
</script>

<style lang="scss" scoped>
.ctb-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99;
  background: #ffffff;
  border-top: 1rpx solid $border-light;
  box-shadow: 0 -4rpx 20rpx rgba(31, 58, 46, 0.04);
  /* 提升为合成层，避免重排引起的抖动 */
  transform: translateZ(0);
  will-change: transform;
  backface-visibility: hidden;
}
.ctb {
  display: flex;
  align-items: stretch;
  height: 100rpx;
}
.ctb-item {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
  &:active {
    background: rgba(184, 149, 106, 0.06);
  }
}

// 顶部短饰 - 香槟金小竖线
.ctb-top-mark {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 32rpx;
  height: 0;
  background: $color-accent;
  transition: height 0.25s ease;
  &.on {
    height: 4rpx;
  }
}

.ctb-icon-wrap {
  position: relative;
  width: 44rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4rpx;
}

// 图标 base：未选用描边色，选中替换为墨绿填充
.icon {
  width: 40rpx;
  height: 40rpx;
  position: relative;
  color: #8a7f73;
}

// === 首页（屋顶） ===
.icon-home {
  &::before {
    content: '';
    position: absolute;
    inset: 12rpx 4rpx 4rpx 4rpx;
    border: 2rpx solid currentColor;
    border-top: 0;
  }
  &::after {
    content: '';
    position: absolute;
    top: 4rpx;
    left: 50%;
    width: 28rpx;
    height: 28rpx;
    border-top: 2rpx solid currentColor;
    border-right: 2rpx solid currentColor;
    transform: translateX(-50%) rotate(-45deg);
    transform-origin: center;
  }
  &.fill {
    color: $color-primary;
  }
}

// === 分类（四格） ===
.icon-category {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 4rpx;
  padding: 6rpx;
  box-sizing: border-box;
  .grid-cell {
    background: transparent;
    border: 2rpx solid currentColor;
    border-radius: 2rpx;
  }
  &.fill {
    color: $color-primary;
    .grid-cell {
      background: $color-primary;
    }
  }
}

// === 购物车（袋形） ===
.icon-cart {
  &::before {
    content: '';
    position: absolute;
    inset: 12rpx 4rpx 4rpx 4rpx;
    border: 2rpx solid currentColor;
    border-radius: 2rpx 2rpx 4rpx 4rpx;
  }
  &::after {
    content: '';
    position: absolute;
    top: 4rpx;
    left: 50%;
    width: 16rpx;
    height: 12rpx;
    border: 2rpx solid currentColor;
    border-bottom: 0;
    border-radius: 8rpx 8rpx 0 0;
    transform: translateX(-50%);
  }
  &.fill {
    color: $color-primary;
    &::before {
      background: $color-primary;
    }
  }
}

// === 我的（人形） ===
.icon-mine {
  &::before {
    content: '';
    position: absolute;
    top: 4rpx;
    left: 50%;
    width: 16rpx;
    height: 16rpx;
    border: 2rpx solid currentColor;
    border-radius: 50%;
    transform: translateX(-50%);
  }
  &::after {
    content: '';
    position: absolute;
    bottom: 4rpx;
    left: 50%;
    width: 28rpx;
    height: 16rpx;
    border: 2rpx solid currentColor;
    border-bottom: 0;
    border-radius: 28rpx 28rpx 0 0;
    transform: translateX(-50%);
  }
  &.fill {
    color: $color-primary;
    &::before {
      background: $color-primary;
    }
    &::after {
      background: $color-primary;
    }
  }
}

// === 标签 ===
.ctb-label {
  font-size: 22rpx;
  color: #8a7f73;
  letter-spacing: 2rpx;
  line-height: 1;
  &.on {
    color: $color-primary-dark;
  }
}

// === 底部金线 ===
.ctb-bottom-bar {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 4rpx;
  background: $color-accent;
  transition: width 0.25s ease;
  &.on {
    width: 56rpx;
  }
}

// === 购物车角标 ===
.ctb-badge {
  position: absolute;
  top: -4rpx;
  right: -10rpx;
  min-width: 28rpx;
  height: 28rpx;
  padding: 0 6rpx;
  background: $color-accent;
  color: #ffffff;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18rpx;
  font-family: $font-mono;
  letter-spacing: 0;
  border: 2rpx solid #ffffff;
  box-sizing: border-box;
}

// 安全区
.ctb-safe {
  height: env(safe-area-inset-bottom);
  background: #ffffff;
}
</style>
