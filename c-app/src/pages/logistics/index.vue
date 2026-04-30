<template>
  <view class="logistics-page">
    <Skeleton v-if="loading && !order" :count="2" layout="lines" />
    <EmptyState
      v-else-if="!order"
      icon="📦"
      title="订单信息加载失败"
      action-text="重新加载"
      @action="load"
    />
    <template v-else>
    <view class="head-card">
      <view class="head-row">
        <text class="ll serif">{{ order.logisticsCompany || '物 流 公 司' }}</text>
        <text class="lt">{{ order.trackingNo || '—' }}</text>
      </view>
      <view class="addr-row">
        <text class="addr-label serif">收 货</text>
        <text class="addr-text">{{ order.receiverAddress }}</text>
      </view>
    </view>

    <view class="trace-card">
      <view class="card-title">
        <view class="bar"></view>
        <text class="serif">物 流 详 情</text>
      </view>
      <Skeleton v-if="!traces.length && loading" :count="3" layout="lines" />
      <EmptyState v-else-if="!traces.length" icon="🚚" title="暂无物流信息" />
      <view v-else class="timeline">
        <view v-for="(t, i) in traces" :key="i" class="t-item" :class="{ first: i === 0 }">
          <view class="t-dot" />
          <view class="t-content">
            <text class="t-desc serif">{{ t.description }}</text>
            <text class="t-time">{{ t.time }}</text>
          </view>
        </view>
      </view>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import Skeleton from '@/components/Skeleton.vue';
import EmptyState from '@/components/EmptyState.vue';
import { orderApi, type OrderInfo } from '@/api/order';

const orderId = ref(0);
const order = ref<OrderInfo | null>(null);
const traces = ref<Array<{ time: string; description: string }>>([]);
const loading = ref(false);

onLoad((opts: Record<string, string>) => {
  orderId.value = Number(opts.orderId || 0);
});

async function load() {
  if (!orderId.value) return;
  loading.value = true;
  try {
    const [o, t] = await Promise.all([
      orderApi.detail(orderId.value),
      orderApi.trace(orderId.value).catch(() => []),
    ]);
    order.value = o;
    traces.value = t;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style lang="scss" scoped>
.logistics-page {
  min-height: 100vh;
  background: $bg-page;
  padding: $space-md;
}

.head-card {
  background: $bg-card;
  padding: $space-md $space-lg;
  margin-bottom: $space-md;
  border: 1rpx solid $border-light;
  border-top: 2rpx solid $color-accent;
}
.head-row {
  display: flex;
  align-items: baseline;
  margin-bottom: $space-sm;
  padding-bottom: $space-sm;
  border-bottom: 1rpx dashed $border-light;
}
.ll {
  font-size: $font-md;
  color: $color-primary-dark;
  letter-spacing: 4rpx;
}
.lt {
  font-size: $font-sm;
  color: $text-secondary;
  margin-left: $space-md;
  font-family: $font-mono;
}
.addr-row {
  display: flex;
  font-size: $font-sm;
  color: $text-secondary;
  letter-spacing: 1rpx;
}
.addr-label {
  width: 100rpx;
  color: $color-primary;
  letter-spacing: 4rpx;
}
.addr-text { flex: 1; line-height: 1.5; }

.trace-card {
  background: $bg-card;
  padding: $space-md $space-lg;
  border: 1rpx solid $border-light;
}
.card-title {
  display: flex;
  align-items: center;
  gap: $space-sm;
  margin-bottom: $space-lg;
  padding-bottom: $space-sm;
  border-bottom: 1rpx solid $border-gold;
  .bar {
    width: 4rpx;
    height: 24rpx;
    background: $color-accent;
  }
  .serif {
    font-size: $font-md;
    color: $color-primary-dark;
    letter-spacing: 6rpx;
  }
}

.timeline { padding-left: $space-sm; }
.t-item {
  position: relative;
  padding-left: $space-lg;
  padding-bottom: $space-lg;
  border-left: 1rpx dashed $color-accent;
  &:last-child {
    border-left-color: transparent;
    padding-bottom: 0;
  }
}
.t-dot {
  position: absolute;
  left: -10rpx;
  top: 8rpx;
  width: 18rpx;
  height: 18rpx;
  background: $bg-card;
  border: 1rpx solid $color-accent;
  transform: rotate(45deg);
}
.t-item.first .t-dot {
  background: $color-primary;
  border-color: $color-primary-dark;
}
.t-content {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.t-desc {
  font-size: $font-sm;
  color: $text-primary;
  letter-spacing: 1rpx;
  line-height: 1.5;
}
.t-item.first .t-desc {
  color: $color-primary-dark;
  font-size: $font-base;
  letter-spacing: 2rpx;
}
.t-time {
  font-size: $font-xs;
  color: $text-placeholder;
  font-family: $font-mono;
}
</style>
