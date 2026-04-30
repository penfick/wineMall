<template>
  <view class="skeleton-wrap">
    <view v-for="n in count" :key="n" class="skeleton-item" :class="layout">
      <template v-if="layout === 'goods-grid'">
        <view class="block cover" />
        <view class="block line w-80" />
        <view class="block line w-60" />
      </template>
      <template v-else-if="layout === 'goods-list'">
        <view class="block thumb" />
        <view class="content">
          <view class="block line w-90" />
          <view class="block line w-50" />
          <view class="block line w-30" />
        </view>
      </template>
      <template v-else>
        <view class="block line w-100" />
        <view class="block line w-70" />
        <view class="block line w-50" />
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    count?: number;
    layout?: 'goods-grid' | 'goods-list' | 'lines';
  }>(),
  { count: 4, layout: 'lines' },
);
</script>

<style lang="scss" scoped>
.skeleton-wrap {
  display: flex;
  flex-direction: column;
  gap: $space-md;
}
.skeleton-item {
  background: $bg-card;
  border-radius: $radius-md;
  padding: $space-md;
}
.block {
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 37%, #f0f0f0 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
  border-radius: $radius-sm;
}
.line { height: 28rpx; margin: 12rpx 0; }
.cover { width: 100%; aspect-ratio: 1; margin-bottom: $space-sm; border-radius: $radius-base; }
.thumb {
  width: 200rpx;
  height: 200rpx;
  margin-right: $space-md;
  flex-shrink: 0;
}
.skeleton-item.goods-list {
  display: flex;
  .content { flex: 1; }
}
.skeleton-item.goods-grid {
  width: 100%;
}
.w-30 { width: 30%; }
.w-50 { width: 50%; }
.w-60 { width: 60%; }
.w-70 { width: 70%; }
.w-80 { width: 80%; }
.w-90 { width: 90%; }
.w-100 { width: 100%; }

@keyframes shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
</style>
