<template>
  <view class="order-list-page">
    <view class="tabs">
      <view
        v-for="t in tabs"
        :key="t.value"
        class="tab serif"
        :class="{ active: activeTab === t.value }"
        @tap="switchTab(t.value)"
      >
        <text>{{ t.label }}</text>
      </view>
    </view>

    <scroll-view scroll-y class="content" @scrolltolower="loadMore">
      <Skeleton v-if="loading && !list.length" :count="3" layout="goods-list" />
      <EmptyState v-else-if="!list.length" icon="📦" title="暂无订单" />
      <view v-else>
        <view v-for="o in list" :key="o.id" class="order-card" @tap="goDetail(o.id)">
          <view class="order-head">
            <text class="order-no">订单号：{{ o.orderNo }}</text>
            <text class="status">{{ o.statusText }}</text>
          </view>
          <view v-for="item in o.items" :key="item.id" class="goods-row">
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
          <view class="amount-row">
            <text>共 {{ o.items.length }} 件，实付：</text>
            <PriceTag :value="o.payAmount" size="md" />
          </view>
          <view class="action-row">
            <CountDown
              v-if="o.status === 0 && o.countdown"
              :seconds="o.countdown"
              prefix="剩"
              @finish="reload"
            />
            <view class="btns">
              <view v-if="o.status === 0" class="btn ghost" @tap.stop="onCancel(o)">取消</view>
              <view v-if="o.status === 0" class="btn primary" @tap.stop="onPay(o)">立即付款</view>
              <view v-if="o.status === 2" class="btn ghost" @tap.stop="goLogistics(o)">查看物流</view>
              <view v-if="o.status === 2" class="btn primary" @tap.stop="onConfirm(o)">确认收货</view>
              <view v-if="o.status === 3" class="btn ghost" @tap.stop="onRebuy(o)">再次购买</view>
            </view>
          </view>
        </view>
        <LoadMore :status="moreStatus" @retry="loadMore" />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import PriceTag from '@/components/PriceTag.vue';
import Skeleton from '@/components/Skeleton.vue';
import EmptyState from '@/components/EmptyState.vue';
import LoadMore from '@/components/LoadMore.vue';
import CountDown from '@/components/CountDown.vue';
import { orderApi, type OrderInfo } from '@/api/order';
import { navTo } from '@/utils/nav';

const tabs = [
  { label: '全 部', value: -1 },
  { label: '待付款', value: 0 },
  { label: '待发货', value: 1 },
  { label: '待收货', value: 2 },
  { label: '已完成', value: 3 },
];

const activeTab = ref<number>(-1);
const list = ref<OrderInfo[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);

const moreStatus = computed<'more' | 'loading' | 'noMore'>(() => {
  if (loading.value) return 'loading';
  if (list.value.length >= total.value) return 'noMore';
  return 'more';
});

async function loadData(reset = false) {
  if (loading.value) return;
  if (reset) {
    page.value = 1;
    list.value = [];
  }
  loading.value = true;
  try {
    const res = await orderApi.list({
      status: activeTab.value === -1 ? undefined : activeTab.value,
      page: page.value,
      pageSize: 10,
    });
    list.value = reset ? res.list : [...list.value, ...res.list];
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function switchTab(v: number) {
  activeTab.value = v;
  loadData(true);
}

function loadMore() {
  if (moreStatus.value === 'noMore') return;
  page.value += 1;
  loadData();
}

function reload() { loadData(true); }

function goDetail(id: number) { navTo(`/pages/order/detail?id=${id}`); }
function goLogistics(o: OrderInfo) { navTo(`/pages/logistics/index?orderId=${o.id}`); }

async function onCancel(o: OrderInfo) {
  const res = await uni.showModal({ title: '取消订单', content: '确认取消该订单？' });
  if (!res.confirm) return;
  await orderApi.cancel(o.id);
  uni.showToast({ title: '已取消', icon: 'success' });
  reload();
}

async function onPay(o: OrderInfo) {
  await orderApi.payMock(o.id);
  uni.showToast({ title: '支付成功', icon: 'success' });
  reload();
}

async function onConfirm(o: OrderInfo) {
  const res = await uni.showModal({ title: '确认收货', content: '确认已收到商品？' });
  if (!res.confirm) return;
  await orderApi.confirm(o.id);
  uni.showToast({ title: '已确认', icon: 'success' });
  reload();
}

function onRebuy(o: OrderInfo) {
  if (o.items[0]) navTo(`/pages/goods/detail?id=${o.items[0].goodsId}`);
}

onLoad((opts: Record<string, string>) => {
  if (opts.status !== undefined) activeTab.value = Number(opts.status);
});

onShow(() => loadData(true));
</script>

<style lang="scss" scoped>
.order-list-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: $bg-page;
}

.tabs {
  display: flex;
  background: $bg-card;
  border-bottom: 1rpx solid $border-light;
}
.tab {
  flex: 1;
  position: relative;
  text-align: center;
  padding: $space-sm 0;
  font-size: $font-sm;
  color: $text-regular;
  min-height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 2rpx;
  &.active {
    color: $color-primary-dark;
    &::after {
      content: '';
      position: absolute;
      bottom: 6rpx;
      left: 50%;
      transform: translateX(-50%);
      width: 48rpx;
      height: 2rpx;
      background: $color-accent;
    }
  }
}

.content {
  flex: 1;
  padding: $space-md;
}

.order-card {
  background: $bg-card;
  padding: $space-md $space-lg;
  margin-bottom: $space-md;
  border: 1rpx solid $border-light;
}
.order-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: $space-sm;
  border-bottom: 1rpx dashed $border-light;
  .order-no {
    font-size: $font-xs;
    color: $text-secondary;
    font-family: $font-mono;
  }
  .status {
    color: $color-primary-dark;
    font-size: $font-sm;
    font-family: $font-serif;
    letter-spacing: 2rpx;
  }
}
.goods-row {
  display: flex;
  padding: $space-md 0;
  .cover {
    width: 140rpx;
    height: 140rpx;
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
    font-size: $font-sm;
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
  .qty {
    font-size: $font-xs;
    color: $text-secondary;
    font-family: $font-mono;
  }
}
.amount-row {
  display: flex;
  justify-content: flex-end;
  align-items: baseline;
  padding: $space-sm 0;
  font-size: $font-xs;
  color: $text-secondary;
  border-top: 1rpx dashed $border-light;
  letter-spacing: 1rpx;
}
.action-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: $space-sm;
  border-top: 1rpx dashed $border-light;
}
.btns {
  display: flex;
  gap: $space-sm;
  margin-left: auto;
}
.btn {
  padding: 0 $space-md;
  height: 60rpx;
  font-size: $font-xs;
  font-family: $font-serif;
  letter-spacing: 2rpx;
  display: flex;
  align-items: center;
  &.ghost {
    background: transparent;
    color: $text-primary;
    border: 1rpx solid $border-base;
  }
  &.primary {
    background: $color-primary;
    color: $color-accent-light;
  }
}
</style>
