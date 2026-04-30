<template>
  <view class="detail-page" v-if="order">
    <!-- 状态横幅 -->
    <view class="status-banner" :class="statusClass">
      <text class="status-text serif">{{ order.statusText }}</text>
      <CountDown
        v-if="order.status === 0 && order.countdown"
        :seconds="order.countdown"
        prefix="余"
        @finish="load"
      />
    </view>

    <!-- 收货信息 -->
    <view class="addr-card">
      <view class="addr-marker"></view>
      <view class="addr-info">
        <view class="addr-top">
          <text class="name serif">{{ order.receiverName }}</text>
          <text class="phone">{{ order.receiverPhone }}</text>
        </view>
        <text class="addr-detail">{{ order.receiverAddress }}</text>
      </view>
    </view>

    <!-- 物流（仅已发货后显示） -->
    <view v-if="order.status >= 2 && order.trackingNo" class="logistics-card" @tap="goLogistics">
      <view>
        <text class="ll">{{ order.logisticsCompany }}</text>
        <text class="lt">{{ order.trackingNo }}</text>
      </view>
      <text class="arrow">›</text>
    </view>

    <!-- 商品 -->
    <view class="goods-card">
      <view v-for="item in order.items" :key="item.id" class="goods-row">
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

    <!-- 金额明细 -->
    <view class="amount-card">
      <view class="row"><text>商品总额</text><PriceTag :value="order.goodsAmount" size="md" /></view>
      <view class="row"><text>运费</text><PriceTag :value="order.freightAmount" size="md" /></view>
      <view v-if="order.discountAmount > 0" class="row"><text>优惠</text><text class="discount">-¥{{ order.discountAmount.toFixed(2) }}</text></view>
      <view class="row total"><text>实付</text><PriceTag :value="order.payAmount" size="lg" /></view>
    </view>

    <!-- 订单信息 -->
    <view class="meta-card">
      <view class="row"><text>订单号</text><text class="val">{{ order.orderNo }}</text></view>
      <view class="row"><text>下单时间</text><text class="val">{{ formatDate(order.createdAt) }}</text></view>
      <view v-if="order.payAt" class="row"><text>支付时间</text><text class="val">{{ formatDate(order.payAt) }}</text></view>
      <view v-if="order.shipAt" class="row"><text>发货时间</text><text class="val">{{ formatDate(order.shipAt) }}</text></view>
      <view v-if="order.finishAt" class="row"><text>完成时间</text><text class="val">{{ formatDate(order.finishAt) }}</text></view>
      <view v-if="order.remark" class="row"><text>备注</text><text class="val">{{ order.remark }}</text></view>
    </view>

    <view class="footer safe-area-bottom" v-if="actionBtns.length">
      <view
        v-for="b in actionBtns"
        :key="b.text"
        class="btn"
        :class="b.type"
        @tap="b.action()"
      >{{ b.text }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import PriceTag from '@/components/PriceTag.vue';
import CountDown from '@/components/CountDown.vue';
import { orderApi, type OrderInfo } from '@/api/order';
import { formatDate } from '@/utils/format';
import { navTo } from '@/utils/nav';

const orderId = ref(0);
const order = ref<OrderInfo | null>(null);

const statusClass = computed(() => {
  if (!order.value) return '';
  return ['pending-pay', 'pending-ship', 'shipped', 'completed', 'canceled', 'refunding'][order.value.status] || '';
});

const actionBtns = computed(() => {
  if (!order.value) return [] as Array<{ text: string; type: 'ghost' | 'primary'; action: () => void }>;
  const o = order.value;
  switch (o.status) {
    case 0:
      return [
        { text: '取消订单', type: 'ghost' as const, action: () => onCancel() },
        { text: '立即付款', type: 'primary' as const, action: () => onPay() },
      ];
    case 2:
      return [
        { text: '查看物流', type: 'ghost' as const, action: () => goLogistics() },
        { text: '确认收货', type: 'primary' as const, action: () => onConfirm() },
      ];
    case 3:
      return [{ text: '再次购买', type: 'ghost' as const, action: () => onRebuy() }];
    default:
      return [];
  }
});

async function load() {
  order.value = await orderApi.detail(orderId.value);
}

async function onCancel() {
  const res = await uni.showModal({ title: '取消订单', content: '确认取消？' });
  if (!res.confirm) return;
  await orderApi.cancel(orderId.value);
  uni.showToast({ title: '已取消', icon: 'success' });
  load();
}

async function onPay() {
  await orderApi.payMock(orderId.value);
  uni.showToast({ title: '支付成功', icon: 'success' });
  load();
}

async function onConfirm() {
  const res = await uni.showModal({ title: '确认收货', content: '确认已收到？' });
  if (!res.confirm) return;
  await orderApi.confirm(orderId.value);
  uni.showToast({ title: '已确认', icon: 'success' });
  load();
}

function onRebuy() {
  if (order.value?.items[0]) navTo(`/pages/goods/detail?id=${order.value.items[0].goodsId}`);
}

function goLogistics() { navTo(`/pages/logistics/index?orderId=${orderId.value}`); }

onLoad((opts: Record<string, string>) => {
  orderId.value = Number(opts.id || 0);
});

onShow(() => {
  if (orderId.value) load();
});
</script>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  background: $bg-page;
  padding: $space-md;
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
}

// === 状态横幅 ===
.status-banner {
  background: linear-gradient(135deg, $color-primary-dark 0%, $color-primary 100%);
  color: $color-accent-light;
  padding: $space-lg;
  margin-bottom: $space-md;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1rpx solid $color-accent;
  position: relative;
  &::before {
    content: '';
    position: absolute;
    top: 6rpx;
    left: 6rpx;
    right: 6rpx;
    bottom: 6rpx;
    border: 1rpx solid rgba(184, 149, 106, 0.3);
    pointer-events: none;
  }
  .status-text {
    font-size: $font-lg;
    letter-spacing: 6rpx;
    color: $color-accent-light;
  }
  &.completed, &.canceled {
    background: linear-gradient(135deg, #4a4a4a 0%, #6b6b6b 100%);
  }
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

// === 物流卡 ===
.logistics-card {
  background: $bg-card;
  padding: $space-md $space-lg;
  margin-bottom: $space-md;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1rpx solid $border-light;
  .ll {
    font-size: $font-sm;
    color: $color-primary-dark;
    font-family: $font-serif;
    letter-spacing: 2rpx;
  }
  .lt {
    font-size: $font-xs;
    color: $text-secondary;
    margin-left: $space-sm;
    font-family: $font-mono;
  }
  .arrow {
    color: $color-accent;
    transform: rotate(90deg);
    font-size: 32rpx;
  }
}

// === 通用卡片 ===
.goods-card, .amount-card, .meta-card {
  background: $bg-card;
  padding: $space-md $space-lg;
  margin-bottom: $space-md;
  border: 1rpx solid $border-light;
}

.goods-row {
  display: flex;
  padding: $space-sm 0;
  border-bottom: 1rpx dashed $border-light;
  &:last-child { border-bottom: 0; }
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
  .row { display: flex; justify-content: space-between; align-items: baseline; }
  .qty {
    font-size: $font-xs;
    color: $text-secondary;
    font-family: $font-mono;
  }
}

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
  &.total {
    padding-top: $space-md;
    margin-top: $space-xs;
    border-top: 1rpx solid $border-gold;
    border-bottom: 0;
    color: $color-primary-dark;
    font-family: $font-serif;
    letter-spacing: 4rpx;
  }
  .discount {
    color: $color-accent-deep;
    font-family: $font-mono;
  }
}

.meta-card .row {
  display: flex;
  justify-content: space-between;
  padding: $space-sm 0;
  font-size: $font-xs;
  color: $text-secondary;
  border-bottom: 1rpx dashed $border-light;
  letter-spacing: 1rpx;
  &:last-child { border-bottom: 0; }
  .val {
    color: $text-primary;
    font-family: $font-mono;
  }
}

// === 底部操作 ===
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  display: flex;
  justify-content: flex-end;
  gap: $space-sm;
  padding: $space-sm $space-md;
  border-top: 1rpx solid $border-light;
  box-shadow: 0 -4rpx 20rpx rgba(31, 58, 46, 0.04);
  .btn {
    padding: 0 $space-lg;
    height: 72rpx;
    min-width: 180rpx;
    font-size: $font-sm;
    font-family: $font-serif;
    letter-spacing: 4rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    &.ghost {
      background: transparent;
      color: $color-primary-dark;
      border: 1rpx solid $color-accent;
      &:active { background: rgba(184, 149, 106, 0.06); }
    }
    &.primary {
      background: $color-primary;
      color: $color-accent-light;
      &:active { background: $color-primary-dark; }
    }
  }
}
</style>
