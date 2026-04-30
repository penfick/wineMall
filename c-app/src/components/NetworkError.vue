<template>
  <view class="net-error">
    <text class="icon">📡</text>
    <text class="title">{{ title }}</text>
    <text class="desc">{{ description }}</text>
    <view class="btn" @tap="$emit('retry')">
      <text>重新加载</text>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
  }>(),
  {
    title: '网络异常',
    description: '请检查网络后重试',
  },
);

defineEmits<{ (e: 'retry'): void }>();
</script>

<style lang="scss" scoped>
.net-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 160rpx $space-lg;
}
.icon { font-size: 100rpx; margin-bottom: $space-md; }
.title { font-size: $font-md; color: $text-secondary; margin-bottom: $space-xs; }
.desc { font-size: $font-sm; color: $text-placeholder; margin-bottom: $space-lg; }
.btn {
  padding: 0 $space-xl;
  height: 80rpx;
  background: $color-primary;
  color: #fff;
  border-radius: $radius-lg;
  display: flex;
  align-items: center;
  font-size: $font-base;
}
</style>
