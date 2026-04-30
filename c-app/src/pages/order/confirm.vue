<template>
  <view class="confirm-page" v-if="preview">
    <!-- 收货地址 -->
    <view class="addr-card" @tap="goSelectAddress">
      <view class="addr-marker"></view>
      <template v-if="preview.address">
        <view class="addr-info">
          <view class="addr-top">
            <text class="name serif">{{ preview.address.name }}</text>
            <text class="phone">{{ preview.address.phone }}</text>
          </view>
          <text class="addr-detail">{{ preview.address.fullAddress }}</text>
        </view>
        <text class="arrow">›</text>
      </template>
      <template v-else>
        <text class="addr-empty serif">请 选 择 收 货 地 址</text>
        <text class="arrow">›</text>
      </template>
    </view>

    <!-- 商品列表 -->
    <view class="goods-card">
      <view v-for="item in preview.items" :key="item.id" class="goods-item">
        <image :src="item.cover" class="cover" mode="aspectFill" />
        <view class="info">
          <text class="name text-ellipsis-2">{{ item.goodsName }}</text>
          <text class="sku">{{ item.skuText || '默认规格' }}</text>
          <view class="row">
            <PriceTag :value="item.price" size="md" />
            <text class="qty">x{{ item.qty }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 备注 -->
    <view class="remark-card">
      <text class="label serif">订单备注</text>
      <input class="input" v-model="remark" placeholder="选填，请输入备注" maxlength="100" />
    </view>

    <!-- 金额明细 -->
    <view class="amount-card">
      <view class="row">
        <text>商品总额</text>
        <PriceTag :value="preview.goodsAmount" size="md" />
      </view>
      <view class="row">
        <text>运费</text>
        <PriceTag :value="preview.freightAmount" size="md" />
      </view>
      <view v-if="preview.discountAmount > 0" class="row">
        <text>优惠</text>
        <text class="discount">-¥{{ preview.discountAmount.toFixed(2) }}</text>
      </view>
    </view>

    <view class="footer safe-area-bottom">
      <view class="pay-amount">
        <text class="label serif">实 付</text>
        <PriceTag :value="preview.payAmount" size="xl" />
      </view>
      <view class="btn-submit serif" :class="{ disabled: !preview.address }" @tap="onSubmit">提 交 订 单</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import PriceTag from '@/components/PriceTag.vue';
import { orderApi, type PreviewDto, type PreviewResult } from '@/api/order';
import { useAddressStore } from '@/store/address';
import { navTo, redirectTo } from '@/utils/nav';

const preview = ref<PreviewResult | null>(null);
const remark = ref('');
const params = reactive<PreviewDto>({ source: 'cart' });
const addressStore = useAddressStore();
const selectedAddressId = ref<number | undefined>(undefined);

async function loadPreview() {
  preview.value = await orderApi.preview({ ...params, addressId: selectedAddressId.value });
}

function goSelectAddress() {
  navTo('/pages/address/select');
}

async function onSubmit() {
  if (!preview.value?.address) {
    uni.showToast({ title: '请选择收货地址', icon: 'none' });
    return;
  }
  const res = await orderApi.create({
    ...params,
    addressId: preview.value.address.id,
    remark: remark.value,
  });
  redirectTo(`/pages/order/result?orderId=${res.orderId}&payAmount=${res.payAmount}`);
}

onLoad((opts: Record<string, string>) => {
  if (opts.source === 'cart') {
    params.source = 'cart';
    params.cartIds = (opts.cartIds || '').split(',').map(Number).filter(Boolean);
  } else if (opts.source === 'goods') {
    params.source = 'goods';
    params.skuId = Number(opts.skuId);
    params.qty = Number(opts.qty || 1);
  }
});

onShow(async () => {
  // 检查是否有从 select 返回的地址
  const addrId = uni.getStorageSync('selected_address_id');
  if (addrId) {
    selectedAddressId.value = Number(addrId);
    uni.removeStorageSync('selected_address_id');
  } else if (!selectedAddressId.value) {
    // 默认地址
    await addressStore.load().catch(() => {});
    selectedAddressId.value = addressStore.getDefault()?.id;
  }
  loadPreview().catch(() => {
    uni.showToast({ title: '加载失败', icon: 'none' });
  });
});
</script>

<style lang="scss" scoped>
.confirm-page {
  min-height: 100vh;
  background: $bg-page;
  padding: $space-md;
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
}

// === 地址卡 ===
.addr-card {
  background: $bg-card;
  padding: $space-md $space-lg;
  display: flex;
  align-items: center;
  margin-bottom: $space-md;
  min-height: 140rpx;
  border: 1rpx solid $border-light;
  border-top: 2rpx solid $color-accent;
  gap: $space-md;
}
.addr-marker {
  width: 24rpx;
  height: 24rpx;
  border: 2rpx solid $color-accent;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  position: relative;
  &::after {
    content: '';
    position: absolute;
    top: 6rpx;
    left: 6rpx;
    width: 8rpx;
    height: 8rpx;
    background: $color-accent;
    border-radius: 50%;
  }
}
.addr-info { flex: 1; }
.addr-top {
  display: flex;
  gap: $space-md;
  margin-bottom: $space-xs;
  align-items: baseline;
}
.addr-top .name {
  font-size: $font-md;
  color: $color-primary-dark;
  letter-spacing: 2rpx;
}
.addr-top .phone {
  color: $text-regular;
  font-size: $font-sm;
  font-family: $font-mono;
}
.addr-detail {
  font-size: $font-sm;
  color: $text-secondary;
  line-height: 1.5;
}
.addr-empty {
  flex: 1;
  color: $text-placeholder;
  font-size: $font-base;
  letter-spacing: 4rpx;
}
.arrow {
  color: $color-accent;
  font-size: 36rpx;
}

// === 商品 ===
.goods-card,
.remark-card,
.amount-card {
  background: $bg-card;
  padding: $space-md $space-lg;
  margin-bottom: $space-md;
  border: 1rpx solid $border-light;
}
.goods-item {
  display: flex;
  padding: $space-sm 0;
  border-bottom: 1rpx dashed $border-light;
  &:last-child { border-bottom: 0; }
}
.cover {
  width: 160rpx;
  height: 160rpx;
  background: $bg-elevated;
  margin-right: $space-md;
  border: 1rpx solid $border-light;
}
.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.name {
  font-family: $font-serif;
  font-size: $font-base;
  color: $text-primary;
  line-height: 1.4;
  letter-spacing: 1rpx;
}
.sku {
  font-size: $font-xs;
  color: $text-secondary;
  letter-spacing: 1rpx;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.row .qty {
  color: $text-secondary;
  font-size: $font-sm;
  font-family: $font-mono;
}

// === 备注 ===
.remark-card {
  display: flex;
  align-items: center;
  .label {
    color: $color-primary;
    font-size: $font-base;
    width: 160rpx;
    letter-spacing: 4rpx;
  }
  .input {
    flex: 1;
    font-size: $font-sm;
    color: $text-primary;
  }
}

// === 金额 ===
.amount-card .row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $space-sm 0;
  font-size: $font-sm;
  color: $text-regular;
  border-bottom: 1rpx dashed $border-light;
  letter-spacing: 1rpx;
  &:last-child { border-bottom: 0; }
  .discount {
    color: $color-accent-deep;
    font-family: $font-mono;
  }
}

// === 底部 ===
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  display: flex;
  align-items: center;
  padding: $space-sm $space-md;
  border-top: 1rpx solid $border-light;
  box-shadow: 0 -4rpx 20rpx rgba(31, 58, 46, 0.04);
}
.pay-amount {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: $space-xs;
  .label {
    color: $color-primary;
    font-size: $font-xs;
    letter-spacing: 4rpx;
  }
}
.btn-submit {
  height: 80rpx;
  min-width: 240rpx;
  padding: 0 $space-lg;
  background: $color-primary;
  color: $color-accent-light;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-md;
  letter-spacing: 4rpx;
  &.disabled { opacity: 0.5; }
  &:active:not(.disabled) { background: $color-primary-dark; }
}
</style>
