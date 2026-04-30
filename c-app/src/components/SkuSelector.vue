<template>
  <uni-popup ref="popupRef" type="bottom" background-color="#fff">
    <view class="sku-panel">
      <view class="head">
        <image class="cover" :src="currentSku?.image || cover" mode="aspectFill" />
        <view class="info">
          <PriceTag :value="currentSku?.price ?? defaultPrice" size="xl" />
          <text class="stock">库存：{{ currentSku?.stock ?? 0 }}</text>
          <text class="picked">已选：{{ pickedText || '请选择规格' }}</text>
        </view>
        <text class="close" @tap="close">✕</text>
      </view>

      <scroll-view scroll-y class="body">
        <view v-for="group in specGroups" :key="group.key" class="group">
          <text class="group-name">{{ group.key }}</text>
          <view class="opts">
            <view
              v-for="opt in group.values"
              :key="opt"
              class="opt"
              :class="{ active: picked[group.key] === opt, disabled: !isAvailable(group.key, opt) }"
              @tap="onPick(group.key, opt)"
            >
              {{ opt }}
            </view>
          </view>
        </view>

        <view class="qty-row">
          <text class="label">数量</text>
          <view class="stepper">
            <view class="btn" :class="{ disabled: qty <= 1 }" @tap="changeQty(-1)">−</view>
            <input class="num" type="number" :value="qty" @input="onQtyInput" />
            <view class="btn" :class="{ disabled: qty >= maxQty }" @tap="changeQty(1)">+</view>
          </view>
        </view>
      </scroll-view>

      <view class="actions safe-area-bottom">
        <view v-if="mode === 'both' || mode === 'cart'" class="btn-cart" @tap="onAddCart">加入购物车</view>
        <view v-if="mode === 'both' || mode === 'buy'" class="btn-buy" @tap="onBuyNow">立即购买</view>
      </view>
    </view>
  </uni-popup>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import PriceTag from './PriceTag.vue';

interface SkuSpec { key: string; value: string }
interface Sku {
  id: number;
  price: number;
  stock: number;
  image?: string;
  specs: SkuSpec[];
}

const props = withDefaults(
  defineProps<{
    skus?: Sku[];
    cover: string;
    defaultPrice: number;
    mode?: 'both' | 'cart' | 'buy';
  }>(),
  { mode: 'both', skus: () => [] },
);

const skuList = computed<Sku[]>(() =>
  (props.skus ?? []).map((s) => ({
    ...s,
    specs: Array.isArray(s.specs) ? s.specs : [],
  })),
);

const emit = defineEmits<{
  (e: 'add-cart', payload: { skuId: number; qty: number }): void;
  (e: 'buy-now', payload: { skuId: number; qty: number }): void;
}>();

const popupRef = ref<{ open(): void; close(): void } | null>(null);
const picked = ref<Record<string, string>>({});
const qty = ref(1);

const specGroups = computed<Array<{ key: string; values: string[] }>>(() => {
  const map: Record<string, Set<string>> = {};
  for (const sku of skuList.value) {
    for (const s of sku.specs) {
      if (!map[s.key]) map[s.key] = new Set();
      map[s.key].add(s.value);
    }
  }
  return Object.entries(map).map(([key, set]) => ({ key, values: Array.from(set) }));
});

const currentSku = computed<Sku | undefined>(() => {
  if (Object.keys(picked.value).length !== specGroups.value.length) return undefined;
  return skuList.value.find((sku) =>
    sku.specs.every((s) => picked.value[s.key] === s.value),
  );
});

const maxQty = computed(() => currentSku.value?.stock ?? 99);

const pickedText = computed(() =>
  Object.entries(picked.value)
    .map(([k, v]) => `${k}:${v}`)
    .join('；'),
);

function isAvailable(key: string, value: string) {
  // 简化：以当前已选其他规格为前提，检查该选项是否有库存
  const next = { ...picked.value, [key]: value };
  return skuList.value.some((sku) =>
    sku.stock > 0 && sku.specs.every((s) => !next[s.key] || next[s.key] === s.value),
  );
}

function onPick(key: string, value: string) {
  if (!isAvailable(key, value)) return;
  if (picked.value[key] === value) {
    const { [key]: _omit, ...rest } = picked.value;
    picked.value = rest;
  } else {
    picked.value = { ...picked.value, [key]: value };
  }
}

function changeQty(delta: number) {
  const next = qty.value + delta;
  if (next < 1 || next > maxQty.value) return;
  qty.value = next;
}

function onQtyInput(e: { detail: { value: string } }) {
  const n = Number(e.detail.value || 1);
  qty.value = Math.max(1, Math.min(maxQty.value, n));
}

function ensureSku(): boolean {
  if (!currentSku.value) {
    uni.showToast({ title: '请先选择规格', icon: 'none' });
    return false;
  }
  if (currentSku.value.stock <= 0) {
    uni.showToast({ title: '库存不足', icon: 'none' });
    return false;
  }
  return true;
}

function onAddCart() {
  if (!ensureSku()) return;
  emit('add-cart', { skuId: currentSku.value!.id, qty: qty.value });
  close();
}

function onBuyNow() {
  if (!ensureSku()) return;
  emit('buy-now', { skuId: currentSku.value!.id, qty: qty.value });
  close();
}

function open(initSkuId?: number) {
  if (initSkuId) {
    const sku = skuList.value.find((s) => s.id === initSkuId);
    if (sku) {
      const init: Record<string, string> = {};
      sku.specs.forEach((s) => (init[s.key] = s.value));
      picked.value = init;
    }
  }
  popupRef.value?.open();
}

function close() {
  popupRef.value?.close();
}

defineExpose({ open, close });
</script>

<style lang="scss" scoped>
.sku-panel {
  display: flex;
  flex-direction: column;
  max-height: 80vh;
}
.head {
  display: flex;
  padding: $space-md;
  border-bottom: 1rpx solid $border-light;
  position: relative;
  .cover {
    width: 200rpx;
    height: 200rpx;
    border-radius: $radius-base;
    background: $border-light;
    margin-right: $space-md;
    margin-top: -40rpx;
    box-shadow: $shadow-md;
  }
  .info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .stock { font-size: $font-sm; color: $text-secondary; }
  .picked { font-size: $font-sm; color: $text-secondary; }
  .close {
    position: absolute;
    top: $space-sm;
    right: $space-md;
    width: 60rpx;
    height: 60rpx;
    line-height: 60rpx;
    text-align: center;
    color: $text-secondary;
  }
}
.body {
  flex: 1;
  padding: $space-md;
  max-height: 50vh;
}
.group { margin-bottom: $space-md; }
.group-name { font-size: $font-base; color: $text-primary; margin-bottom: $space-sm; display: block; }
.opts { display: flex; flex-wrap: wrap; gap: $space-sm; }
.opt {
  padding: 12rpx 24rpx;
  background: $border-light;
  color: $text-primary;
  border-radius: $radius-base;
  font-size: $font-sm;
  min-height: 60rpx;
  display: flex;
  align-items: center;
  &.active {
    background: lighten($color-primary, 45%);
    color: $color-primary;
    border: 2rpx solid $color-primary;
  }
  &.disabled { color: $text-disabled; opacity: 0.5; }
}
.qty-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $space-md 0;
  border-top: 1rpx solid $border-light;
  margin-top: $space-md;
  .label { font-size: $font-base; color: $text-primary; }
}
.stepper {
  display: flex;
  align-items: center;
  .btn {
    width: 60rpx;
    height: 60rpx;
    background: $border-light;
    border-radius: $radius-sm;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $font-md;
    &.disabled { color: $text-disabled; }
  }
  .num {
    width: 80rpx;
    height: 60rpx;
    text-align: center;
    margin: 0 $space-xs;
    font-size: $font-base;
    background: transparent;
  }
}
.actions {
  display: flex;
  gap: $space-sm;
  padding: $space-md;
  border-top: 1rpx solid $border-light;
  .btn-cart, .btn-buy {
    flex: 1;
    height: 88rpx;
    border-radius: 44rpx;
    color: #fff;
    font-size: $font-md;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .btn-cart { background: $color-accent; }
  .btn-buy { background: $color-primary; }
}
</style>
