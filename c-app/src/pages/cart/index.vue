<template>
  <view class="cart-page">
    <view v-if="!userStore.isLogin" class="login-tip">
      <EmptyState
        icon="🔒"
        title="请先登录"
        description="登录后查看您的购物车"
        action-text="去登录"
        @action="goLogin"
      />
    </view>

    <template v-else>
      <view v-if="editMode" class="bar">
        <text @tap="exitEdit">完成</text>
      </view>
      <view v-else class="bar">
        <text class="count">共 {{ cartStore.totalCount }} 件商品</text>
        <text class="edit-btn" @tap="enterEdit">编辑</text>
      </view>

      <Skeleton v-if="cartStore.loading && !cartStore.list.length" :count="3" layout="goods-list" />
      <EmptyState
        v-else-if="!cartStore.list.length"
        icon="🛒"
        title="购物车空空如也"
        description="去逛逛挑些好物吧"
        action-text="去逛逛"
        @action="goHome"
      />
      <scroll-view v-else scroll-y class="list">
        <view v-for="item in cartStore.list" :key="item.id" class="cart-item" :class="{ invalid: item.invalid }">
          <view class="check" @tap="cartStore.toggleSelect(item.id)">
            <view class="check-box" :class="{ active: item.selected }">
              <text v-if="item.selected">✓</text>
            </view>
          </view>
          <image :src="item.cover" class="cover" mode="aspectFill" />
          <view class="info">
            <view class="name-row">
              <text class="name text-ellipsis-2">{{ item.goodsName }}</text>
              <text v-if="item.invalid" class="invalid-tag">已失效</text>
            </view>
            <text class="sku">{{ item.skuText || '默认规格' }}</text>
            <view class="bottom">
              <PriceTag :value="item.price" size="md" />
              <view v-if="!item.invalid" class="stepper">
                <view class="btn" :class="{ disabled: item.qty <= 1 }" @tap="changeQty(item, -1)">−</view>
                <text class="num tabular-nums">{{ item.qty }}</text>
                <view class="btn" :class="{ disabled: item.qty >= item.stock }" @tap="changeQty(item, 1)">+</view>
              </view>
              <text v-else class="remove" @tap="removeOne(item.id)">删除</text>
            </view>
          </view>
        </view>
      </scroll-view>

      <view v-if="cartStore.list.length" class="footer safe-area-bottom">
        <view class="check-all" @tap="cartStore.toggleAll(!cartStore.allSelected)">
          <view class="check-box" :class="{ active: cartStore.allSelected }">
            <text v-if="cartStore.allSelected">✓</text>
          </view>
          <text>全选</text>
        </view>
        <view class="amount-area">
          <template v-if="!editMode">
            <text class="label">合计：</text>
            <PriceTag :value="cartStore.selectedAmount" size="lg" />
          </template>
        </view>
        <view v-if="!editMode" class="btn-checkout" @tap="onCheckout">
          结算 ({{ cartStore.selectedItems.length }})
        </view>
        <view v-else class="btn-remove" @tap="onBatchRemove">删除</view>
      </view>
    </template>
    <CustomTabBar :current="2" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import PriceTag from '@/components/PriceTag.vue';
import Skeleton from '@/components/Skeleton.vue';
import EmptyState from '@/components/EmptyState.vue';
import CustomTabBar from '@/components/CustomTabBar.vue';
import { useHideNativeTabBar } from '@/composables/useHideNativeTabBar';
import { useCartStore, type CartItem } from '@/store/cart';
import { useUserStore } from '@/store/user';
import { navTo, reLaunchTo } from '@/utils/nav';

useHideNativeTabBar();

const cartStore = useCartStore();
const userStore = useUserStore();
const editMode = ref(false);

function enterEdit() { editMode.value = true; }
function exitEdit() { editMode.value = false; }

async function changeQty(item: CartItem, delta: number) {
  const next = item.qty + delta;
  if (next < 1 || next > item.stock) return;
  await cartStore.updateQty(item.id, next);
}

async function removeOne(id: number) {
  await cartStore.remove([id]);
  uni.showToast({ title: '已删除', icon: 'none' });
}

async function onBatchRemove() {
  const ids = cartStore.selectedItems.map((i) => i.id);
  if (!ids.length) {
    uni.showToast({ title: '请选择商品', icon: 'none' });
    return;
  }
  const res = await uni.showModal({ title: '确认删除', content: `删除选中 ${ids.length} 件商品？` });
  if (!res.confirm) return;
  await cartStore.remove(ids);
  uni.showToast({ title: '已删除', icon: 'success' });
}

function onCheckout() {
  if (!cartStore.selectedItems.length) {
    uni.showToast({ title: '请选择商品', icon: 'none' });
    return;
  }
  const ids = cartStore.selectedItems.map((i) => i.id).join(',');
  navTo(`/pages/order/confirm?source=cart&cartIds=${ids}`);
}

function goLogin() { navTo('/pages/login/index'); }
function goHome() { reLaunchTo('/pages/index/index'); }

onShow(() => {
  if (userStore.isLogin) cartStore.load();
});
</script>

<style lang="scss" scoped>
.cart-page {
  height: 100vh;
  background: $bg-page;
  display: flex;
  flex-direction: column;
  padding-bottom: calc(220rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}
.login-tip { padding-top: 100rpx; }

.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $space-md;
  background: $bg-page;
  font-size: $font-sm;
  color: $color-accent-deep;
  font-family: $font-serif;
  letter-spacing: 4rpx;
  border-bottom: 1rpx solid $border-light;
  .count { letter-spacing: 4rpx; }
  .edit-btn {
    color: $color-primary;
    padding: $space-xs $space-sm;
    border: 1rpx solid $border-gold;
    font-size: $font-xs;
    letter-spacing: 4rpx;
  }
}

.list {
  flex: 1;
  height: 0;
  padding: $space-md;
  box-sizing: border-box;
}

.cart-item {
  display: flex;
  background: $bg-card;
  padding: $space-md;
  margin-bottom: $space-md;
  border: 1rpx solid $border-light;
  &.invalid { opacity: 0.5; }
}

// === 自定义勾选 ===
.check {
  display: flex;
  align-items: center;
  margin-right: $space-sm;
  min-width: 60rpx;
  min-height: 60rpx;
  justify-content: center;
}
.check-box {
  width: 36rpx;
  height: 36rpx;
  border: 1rpx solid $border-base;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $color-accent-light;
  font-size: 22rpx;
  background: $bg-card;
  &.active {
    background: $color-primary;
    border-color: $color-primary;
  }
}

.cover {
  width: 180rpx;
  height: 180rpx;
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
.name-row {
  display: flex;
  align-items: flex-start;
  gap: $space-xs;
}
.name {
  font-family: $font-serif;
  font-size: $font-base;
  color: $text-primary;
  flex: 1;
  line-height: 1.4;
  letter-spacing: 1rpx;
}
.invalid-tag {
  background: transparent;
  color: $text-secondary;
  border: 1rpx solid $border-base;
  font-size: 18rpx;
  padding: 2rpx 8rpx;
  letter-spacing: 1rpx;
}
.sku {
  font-size: $font-xs;
  color: $text-secondary;
  margin-top: 4rpx;
  letter-spacing: 1rpx;
}
.bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: $space-xs;
}

.stepper {
  display: flex;
  align-items: center;
  border: 1rpx solid $border-base;
  .btn {
    width: 52rpx;
    height: 52rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $font-md;
    color: $color-primary;
    &.disabled { color: $text-placeholder; }
    &:active:not(.disabled) { background: rgba(184, 149, 106, 0.08); }
  }
  .num {
    width: 60rpx;
    text-align: center;
    font-size: $font-sm;
    color: $text-primary;
    border-left: 1rpx solid $border-base;
    border-right: 1rpx solid $border-base;
    line-height: 52rpx;
  }
}

.remove {
  color: $color-accent-deep;
  font-size: $font-sm;
  padding: $space-xs $space-sm;
  border: 1rpx solid $border-gold;
  letter-spacing: 2rpx;
}

// === 底部结算栏 ===
.footer {
  position: fixed;
  bottom: calc(100rpx + env(safe-area-inset-bottom));
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  background: #ffffff;
  padding: $space-sm $space-md;
  border-top: 1rpx solid $border-light;
  box-shadow: 0 -4rpx 20rpx rgba(31, 58, 46, 0.04);
  z-index: 50;
}
.check-all {
  display: flex;
  align-items: center;
  gap: $space-xs;
  font-size: $font-sm;
  color: $text-regular;
  margin-right: $space-md;
  letter-spacing: 2rpx;
}
.amount-area {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: $space-xs;
  .label {
    color: $text-secondary;
    font-size: $font-xs;
    font-family: $font-serif;
    letter-spacing: 4rpx;
  }
}
.btn-checkout, .btn-remove {
  height: 72rpx;
  padding: 0 $space-lg;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-base;
  font-family: $font-serif;
  letter-spacing: 4rpx;
  min-width: 200rpx;
}
.btn-checkout {
  background: $color-primary;
  color: $color-accent-light;
  &:active { background: $color-primary-dark; }
}
.btn-remove {
  background: transparent;
  color: $color-primary-dark;
  border: 1rpx solid $color-accent;
  &:active { background: rgba(184, 149, 106, 0.06); }
}
</style>
