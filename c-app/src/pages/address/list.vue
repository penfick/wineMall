<template>
  <view class="addr-list">
    <Skeleton v-if="addrStore.loading && !addrStore.list.length" :count="3" layout="lines" />
    <EmptyState
      v-else-if="!addrStore.list.length"
      icon="📍"
      title="还没有收货地址"
      action-text="新增地址"
      @action="goAdd"
    />
    <scroll-view v-else scroll-y class="list">
      <view v-for="a in addrStore.list" :key="a.id" class="addr-card">
        <view class="info" @tap="onSelect(a)">
          <view class="head">
            <text class="name">{{ a.name }}</text>
            <text class="phone">{{ a.phone }}</text>
            <text v-if="a.isDefault === 1" class="default-tag">默认</text>
          </view>
          <text class="detail">{{ fullAddress(a) }}</text>
        </view>
        <view class="actions">
          <view class="action" @tap="setDefault(a)">
            <view class="check-box" :class="{ active: a.isDefault === 1 }">
              <text v-if="a.isDefault === 1">✓</text>
            </view>
            <text>设为默认</text>
          </view>
          <view class="action right">
            <text @tap="goEdit(a.id)">编辑</text>
            <text class="del" @tap="onRemove(a)">删除</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="footer safe-area-bottom">
      <view class="btn-add" @tap="goAdd">+ 新增地址</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow, onLoad } from '@dcloudio/uni-app';
import { ref } from 'vue';
import Skeleton from '@/components/Skeleton.vue';
import EmptyState from '@/components/EmptyState.vue';
import { useAddressStore, type Address } from '@/store/address';
import { navTo, navBack } from '@/utils/nav';

const addrStore = useAddressStore();
const isSelectMode = ref(false);

function fullAddress(a: Address) {
  return `${a.provinceName}${a.cityName}${a.districtName}${a.detail}`;
}

function goAdd() { navTo('/pages/address/edit'); }
function goEdit(id: number) { navTo(`/pages/address/edit?id=${id}`); }

async function setDefault(a: Address) {
  if (a.isDefault === 1) return;
  await addrStore.setDefault(a.id);
  uni.showToast({ title: '已设为默认', icon: 'success' });
}

async function onRemove(a: Address) {
  const res = await uni.showModal({ title: '删除地址', content: '确认删除该地址？' });
  if (!res.confirm) return;
  await addrStore.remove(a.id);
  uni.showToast({ title: '已删除', icon: 'success' });
}

function onSelect(a: Address) {
  if (!isSelectMode.value) return;
  uni.setStorageSync('selected_address_id', a.id);
  navBack();
}

onLoad((opts: Record<string, string>) => {
  isSelectMode.value = opts.mode === 'select';
});

onShow(() => addrStore.load());
</script>

<style lang="scss" scoped>
.addr-list {
  height: 100vh;
  background: $bg-page;
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
.list { flex: 1; height: 0; padding: $space-md; box-sizing: border-box; }

.addr-card {
  background: $bg-card;
  padding: $space-md $space-lg;
  margin-bottom: $space-md;
  border: 1rpx solid $border-light;
  border-top: 2rpx solid $color-accent;
}
.info {
  padding-bottom: $space-sm;
  border-bottom: 1rpx dashed $border-light;
}
.head {
  display: flex;
  align-items: center;
  gap: $space-md;
  margin-bottom: $space-xs;
}
.head .name {
  font-family: $font-serif;
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
  font-family: $font-serif;
  letter-spacing: 2rpx;
}
.detail {
  font-size: $font-sm;
  color: $text-secondary;
  line-height: 1.5;
  display: block;
  letter-spacing: 1rpx;
}

.actions {
  display: flex;
  justify-content: space-between;
  padding-top: $space-sm;
  font-size: $font-xs;
}
.action {
  display: flex;
  align-items: center;
  gap: $space-xs;
  color: $text-regular;
  min-height: 60rpx;
  letter-spacing: 1rpx;
}
.action.right { gap: $space-md; }
.check-box {
  width: 32rpx;
  height: 32rpx;
  border: 1rpx solid $border-base;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $color-accent-light;
  font-size: 20rpx;
  background: $bg-card;
  &.active {
    background: $color-primary;
    border-color: $color-primary;
  }
}
.del { color: $color-accent-deep; }

.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
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
  font-family: $font-serif;
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
