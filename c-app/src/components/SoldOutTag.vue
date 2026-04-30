<template>
  <view v-if="show" class="sold-out-tag">
    <text class="serif">{{ text }}</text>
  </view>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    show?: boolean;
    text?: string;
  }>(),
  { show: true, text: '虚位以待' },
);
</script>

<style lang="scss" scoped>
.sold-out-tag {
  position: absolute;
  inset: 0;
  background: rgba(31, 58, 46, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  color: $color-accent-light;
  font-size: 32rpx;
  font-family: $font-serif;
  letter-spacing: 8rpx;
}
</style>
