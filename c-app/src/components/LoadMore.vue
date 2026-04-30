<template>
  <view class="load-more" :class="status">
    <view v-if="status === 'loading'" class="loading">
      <view class="spinner" />
      <text>加载中...</text>
    </view>
    <text v-else-if="status === 'noMore'">— 没有更多了 —</text>
    <text v-else-if="status === 'error'" @tap="$emit('retry')">加载失败，点击重试</text>
    <text v-else>上拉加载更多</text>
  </view>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    status?: 'more' | 'loading' | 'noMore' | 'error';
  }>(),
  { status: 'more' },
);

defineEmits<{ (e: 'retry'): void }>();
</script>

<style lang="scss" scoped>
.load-more {
  padding: $space-md 0;
  text-align: center;
  font-size: $font-sm;
  color: $text-placeholder;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-xs;
}
.spinner {
  width: 28rpx;
  height: 28rpx;
  border: 3rpx solid $border-base;
  border-top-color: $color-primary;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
.error { color: $color-danger; }

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
