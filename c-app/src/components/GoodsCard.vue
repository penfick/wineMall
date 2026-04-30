<template>
  <view class="goods-card" :class="layout" @tap="onTap">
    <view class="cover-wrap">
      <image class="cover" :src="goods.cover" mode="aspectFill" lazy-load />
      <SoldOutTag :show="goods.stock <= 0" />
      <view v-if="goods.tagText" class="tag">{{ goods.tagText }}</view>
    </view>
    <view class="info">
      <view class="name text-ellipsis-2">{{ goods.name }}</view>
      <view class="divider"></view>
      <view class="row">
        <PriceTag :value="goods.price" size="lg" />
        <PriceTag
          v-if="goods.originalPrice && goods.originalPrice > goods.price"
          :value="goods.originalPrice"
          size="sm"
          strike
        />
      </view>
      <view class="meta">
        <text class="sales">已售 {{ goods.sales }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import PriceTag from './PriceTag.vue';
import SoldOutTag from './SoldOutTag.vue';
import { navTo } from '@/utils/nav';

interface Goods {
  id: number;
  name: string;
  cover: string;
  price: number;
  originalPrice?: number;
  sales: number;
  stock: number;
  tagText?: string;
}

const props = withDefaults(
  defineProps<{
    goods: Goods;
    layout?: 'grid' | 'list';
    clickable?: boolean;
  }>(),
  { layout: 'grid', clickable: true },
);

const emit = defineEmits<{
  (e: 'click', goods: Goods): void;
}>();

function onTap() {
  if (!props.clickable) return;
  emit('click', props.goods);
  navTo(`/pages/goods/detail?id=${props.goods.id}`);
}
</script>

<style lang="scss" scoped>
.goods-card {
  background: $bg-card;
  border-radius: $radius-sm;
  overflow: hidden;
  border: 1rpx solid $border-light;
  box-shadow: $shadow-sm;
  transition: border-color 0.2s ease;
  &:active {
    border-color: $border-gold;
  }
}

// Grid 卡片（首页 / 列表 2 列）
.goods-card.grid {
  width: 100%;
  .cover-wrap {
    width: 100%;
    aspect-ratio: 1;
    position: relative;
    background: $bg-elevated;
    .cover { width: 100%; height: 100%; }
  }
  .info {
    padding: $space-md;
  }
  .name {
    font-family: $font-serif;
    font-size: $font-base;
    color: $text-primary;
    line-height: 1.4;
    min-height: 76rpx;
    letter-spacing: 1rpx;
  }
  .divider {
    width: 40rpx;
    height: 1rpx;
    background: $border-gold;
    margin: $space-sm 0;
  }
  .row {
    display: flex;
    align-items: baseline;
    gap: $space-sm;
    margin-bottom: 6rpx;
  }
  .meta {
    font-size: $font-xs;
    color: $text-secondary;
    letter-spacing: 1rpx;
  }
}

// List 横排（搜索/订单结果）
.goods-card.list {
  display: flex;
  padding: $space-md;
  .cover-wrap {
    width: 200rpx;
    height: 200rpx;
    flex-shrink: 0;
    margin-right: $space-md;
    position: relative;
    border-radius: $radius-sm;
    overflow: hidden;
    background: $bg-elevated;
    .cover { width: 100%; height: 100%; }
  }
  .info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .name {
    font-family: $font-serif;
    font-size: $font-md;
    color: $text-primary;
    line-height: 1.4;
    letter-spacing: 1rpx;
  }
  .divider {
    width: 40rpx;
    height: 1rpx;
    background: $border-gold;
    margin: $space-xs 0;
  }
  .row {
    display: flex;
    align-items: baseline;
    gap: $space-sm;
  }
  .meta {
    font-size: $font-xs;
    color: $text-secondary;
    letter-spacing: 1rpx;
  }
}

// 角标：用香槟金 + 墨绿字（不再是大红块）
.tag {
  position: absolute;
  top: $space-sm;
  left: $space-sm;
  background: $color-accent-light;
  color: $color-primary-dark;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  letter-spacing: 1rpx;
  font-family: $font-serif;
}
</style>
