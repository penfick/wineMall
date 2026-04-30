<template>
  <text class="price-tag" :class="[size, { strike: strike }]">
    <text class="symbol">¥</text>
    <text class="value">{{ formatted }}</text>
  </text>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    value: number | string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    strike?: boolean;
  }>(),
  { size: 'md', strike: false },
);

const formatted = computed(() => {
  const n = Number(props.value || 0);
  // 千分位 + 两位小数（雅致风的标志之一）
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
});
</script>

<style lang="scss" scoped>
.price-tag {
  color: $color-price;
  font-family: $font-mono;
  font-feature-settings: 'tnum';
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.5rpx;
  .symbol {
    font-size: 0.55em;
    margin-right: 6rpx;
    font-weight: 400;
    vertical-align: 2rpx;
  }
  .value {
    font-weight: 500;
  }
}
.price-tag.sm { font-size: 24rpx; }
.price-tag.md { font-size: 32rpx; }
.price-tag.lg { font-size: 40rpx; }
.price-tag.xl { font-size: 52rpx; }
.price-tag.strike {
  color: $text-secondary;
  font-weight: 400;
  text-decoration: line-through;
  text-decoration-color: $text-placeholder;
  .symbol { color: $text-placeholder; }
}
</style>
