<template>
  <view class="empty-state">
    <view class="icon-wrap">
      <text class="icon">{{ icon }}</text>
    </view>
    <text class="title">{{ title }}</text>
    <text v-if="description" class="desc">{{ description }}</text>
    <view v-if="actionText" class="action" @tap="$emit('action')">
      <text>{{ actionText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    icon?: string;
    title?: string;
    description?: string;
    actionText?: string;
  }>(),
  {
    icon: '📦',
    title: '暂无数据',
    description: '',
    actionText: '',
  },
);

defineEmits<{ (e: 'action'): void }>();
</script>

<style lang="scss" scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx $space-lg;
}
.icon-wrap {
  width: 160rpx;
  height: 160rpx;
  background: $border-light;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: $space-md;
  .icon { font-size: 80rpx; }
}
.title {
  font-size: $font-md;
  color: $text-secondary;
  margin-bottom: $space-xs;
}
.desc {
  font-size: $font-sm;
  color: $text-placeholder;
  margin-bottom: $space-lg;
}
.action {
  margin-top: $space-md;
  padding: $space-sm $space-xl;
  background: $color-primary;
  color: #fff;
  border-radius: $radius-lg;
  font-size: $font-base;
  min-height: 80rpx;
  display: flex;
  align-items: center;
}
</style>
