<template>
  <view class="result-page">
    <view class="seal-wrap">
      <view class="seal">
        <view class="seal-inner"></view>
        <text class="seal-char serif">成</text>
      </view>
    </view>
    <view class="title-frame">
      <view class="line"></view>
      <text class="title serif">订 单 已 提 交</text>
      <view class="line"></view>
    </view>
    <text class="desc serif">{{ payAmount > 0 ? '请 尽 早 完 成 雅 集' : '感 谢 您 的 雅 选' }}</text>

    <view v-if="payAmount > 0" class="amount">
      <text class="label serif">应 付 金 额</text>
      <PriceTag :value="payAmount" size="xl" />
    </view>

    <view class="divider serif">— ◆ —</view>

    <view class="actions">
      <view v-if="payAmount > 0" class="btn primary serif" @tap="onPay">立 即 支 付</view>
      <view class="btn ghost serif" @tap="goDetail">查 看 订 单</view>
      <view class="btn ghost serif" @tap="goHome">回 到 首 页</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import PriceTag from '@/components/PriceTag.vue';
import { orderApi } from '@/api/order';
import { redirectTo, reLaunchTo } from '@/utils/nav';

const orderId = ref(0);
const payAmount = ref(0);

async function onPay() {
  await orderApi.payMock(orderId.value);
  uni.showToast({ title: '支付成功', icon: 'success' });
  setTimeout(() => redirectTo(`/pages/order/detail?id=${orderId.value}`), 600);
}

function goDetail() { redirectTo(`/pages/order/detail?id=${orderId.value}`); }
function goHome() { reLaunchTo('/pages/index/index'); }

onLoad((opts: Record<string, string>) => {
  orderId.value = Number(opts.orderId || 0);
  payAmount.value = Number(opts.payAmount || 0);
});
</script>

<style lang="scss" scoped>
.result-page {
  min-height: 100vh;
  background: $bg-page;
  padding: $space-xl $space-lg calc($space-xl + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  align-items: center;
}

.seal-wrap { padding: 100rpx 0 $space-md; }
.seal {
  width: 180rpx;
  height: 180rpx;
  border: 3rpx solid $color-primary-dark;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: $bg-card;
}
.seal-inner {
  position: absolute;
  inset: 8rpx;
  border: 1rpx solid rgba(31, 58, 46, 0.4);
}
.seal-char {
  font-size: 110rpx;
  color: $color-primary-dark;
  line-height: 1;
}

.title-frame {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-md;
  margin-top: $space-xl;
}
.line {
  width: 60rpx;
  height: 1rpx;
  background: $color-accent;
}
.title {
  font-size: $font-xl;
  color: $color-primary-dark;
  letter-spacing: 8rpx;
  padding-left: 8rpx;
}
.desc {
  font-size: $font-sm;
  color: $color-accent-deep;
  margin-top: $space-md;
  letter-spacing: 6rpx;
}

.amount {
  margin: 80rpx 0 $space-xl;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $space-lg $space-xl;
  background: $bg-card;
  border: 1rpx solid $border-light;
  border-top: 2rpx solid $color-accent;
  .label {
    color: $color-primary;
    font-size: $font-sm;
    margin-bottom: $space-sm;
    letter-spacing: 6rpx;
  }
}

.divider {
  font-size: $font-xs;
  color: $color-accent;
  letter-spacing: 8rpx;
  margin: $space-xl 0 $space-lg;
}

.actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: $space-md;
  margin-top: auto;
  padding-top: $space-lg;
}
.btn {
  height: 88rpx;
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
      inset: 4rpx;
      border: 1rpx solid rgba(184, 149, 106, 0.3);
      pointer-events: none;
    }
    &:active { background: $color-primary-dark; }
  }
  &.ghost {
    background: transparent;
    color: $color-primary-dark;
    border: 1rpx solid $color-accent;
    &:active { background: rgba(184, 149, 106, 0.06); }
  }
}
</style>
