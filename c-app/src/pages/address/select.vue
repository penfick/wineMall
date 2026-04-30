<template>
  <view class="addr-select">
    <Skeleton v-if="addrStore.loading && !addrStore.list.length" :count="3" layout="lines" />
    <EmptyState
      v-else-if="!addrStore.list.length"
      icon="📍"
      title="还没有收货地址"
      action-text="新增地址"
      @action="goAdd"
    />
    <scroll-view v-else scroll-y class="list">
      <view v-for="a in addrStore.list" :key="a.id" class="card" @tap="onPick(a.id)">
        <view class="addr-marker"></view>
        <view class="info">
          <view class="head">
            <text class="name serif">{{ a.name }}</text>
            <text class="phone">{{ a.phone }}</text>
            <text v-if="a.isDefault === 1" class="default-tag serif">默 认</text>
          </view>
          <text class="detail">{{ a.provinceName }}{{ a.cityName }}{{ a.districtName }}{{ a.detail }}</text>
        </view>
        <text class="check serif" @tap.stop="goEdit(a.id)">编 辑</text>
      </view>
    </scroll-view>

    <view class="footer safe-area-bottom">
      <view class="btn-add serif" @tap="goAdd">+ 新 增 地 址</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import Skeleton from '@/components/Skeleton.vue';
import EmptyState from '@/components/EmptyState.vue';
import { useAddressStore } from '@/store/address';
import { navTo, navBack } from '@/utils/nav';

const addrStore = useAddressStore();

function goAdd() { navTo('/pages/address/edit'); }
function goEdit(id: number) { navTo(`/pages/address/edit?id=${id}`); }

function onPick(id: number) {
  uni.setStorageSync('selected_address_id', id);
  navBack();
}

onShow(() => addrStore.load());
</script>

<style lang="scss" scoped>
.addr-select {
  height: 100vh;
  background: $bg-page;
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
.list { flex: 1; height: 0; padding: $space-md; box-sizing: border-box; }

.card {
  background: $bg-card;
  padding: $space-md $space-lg;
  margin-bottom: $space-md;
  display: flex;
  align-items: center;
  gap: $space-md;
  border: 1rpx solid $border-light;
  border-top: 2rpx solid $color-accent;
  &:active { background: rgba(184, 149, 106, 0.04); }
}
.addr-marker {
  width: 24rpx;
  height: 24rpx;
  border: 2rpx solid $color-accent;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  position: relative;
  flex-shrink: 0;
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
.info { flex: 1; }
.head {
  display: flex;
  align-items: center;
  gap: $space-md;
  margin-bottom: $space-xs;
}
.head .name {
  font-size: $font-md;
  color: $color-primary-dark;
  letter-spacing: 2rpx;
}
.head .phone {
  font-size: $font-sm;
  color: $text-regular;
  font-family: $font-mono;
}
.default-tag {
  background: transparent;
  color: $color-accent-deep;
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border: 1rpx solid $color-accent;
  letter-spacing: 2rpx;
}
.detail {
  font-size: $font-sm;
  color: $text-secondary;
  line-height: 1.5;
  display: block;
  letter-spacing: 1rpx;
}
.check {
  color: $color-accent-deep;
  font-size: $font-xs;
  padding: $space-xs $space-sm;
  border: 1rpx solid $border-gold;
  letter-spacing: 2rpx;
}

.footer {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: #ffffff;
  padding: $space-sm $space-md;
  border-top: 1rpx solid $border-light;
  box-shadow: 0 -4rpx 20rpx rgba(31, 58, 46, 0.04);
}
.btn-add {
  height: 88rpx;
  background: $color-primary;
  color: $color-accent-light;
  border: 1rpx solid $color-accent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-md;
  letter-spacing: 6rpx;
  position: relative;
  &::before {
    content: '';
    position: absolute;
    inset: 4rpx;
    border: 1rpx solid rgba(184, 149, 106, 0.3);
    pointer-events: none;
  }
  &:active { background: $color-primary-dark; }
}
</style>
