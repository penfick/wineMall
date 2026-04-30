<template>
  <view class="fav-page">
    <Skeleton v-if="loading && !list.length" :count="4" layout="goods-list" />
    <EmptyState
      v-else-if="!list.length"
      icon="❤️"
      title="还没有收藏"
      description="去逛逛，发现喜欢的好物"
      action-text="去逛逛"
      @action="goHome"
    />
    <scroll-view v-else scroll-y class="list" @scrolltolower="loadMore">
      <view class="head-mark serif">— 我 的 雅 藏 —</view>
      <view v-for="g in list" :key="g.id" class="row">
        <GoodsCard :goods="g" layout="list" />
        <view class="del" @tap="onRemove(g.id)">
          <view class="del-icon"></view>
        </view>
      </view>
      <LoadMore :status="moreStatus" @retry="loadMore" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import GoodsCard from '@/components/GoodsCard.vue';
import Skeleton from '@/components/Skeleton.vue';
import EmptyState from '@/components/EmptyState.vue';
import LoadMore from '@/components/LoadMore.vue';
import { favoriteApi, type GoodsItem } from '@/api/goods';
import { reLaunchTo } from '@/utils/nav';

const list = ref<GoodsItem[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);

const moreStatus = computed<'more' | 'loading' | 'noMore'>(() => {
  if (loading.value) return 'loading';
  if (list.value.length >= total.value) return 'noMore';
  return 'more';
});

async function load(reset = false) {
  if (loading.value) return;
  if (reset) {
    page.value = 1;
    list.value = [];
  }
  loading.value = true;
  try {
    const res = await favoriteApi.list({ page: page.value, pageSize: 20 });
    list.value = reset ? res.list : [...list.value, ...res.list];
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function loadMore() {
  if (moreStatus.value === 'noMore') return;
  page.value += 1;
  load();
}

async function onRemove(id: number) {
  const res = await uni.showModal({ title: '取消收藏', content: '确认取消收藏？' });
  if (!res.confirm) return;
  await favoriteApi.remove(id);
  list.value = list.value.filter((g) => g.id !== id);
  uni.showToast({ title: '已取消', icon: 'none' });
}

function goHome() { reLaunchTo('/pages/index/index'); }

onMounted(() => load(true));
</script>

<style lang="scss" scoped>
.fav-page { height: 100vh; background: $bg-page; display: flex; flex-direction: column; }
.list { flex: 1; height: 0; padding: $space-md; box-sizing: border-box; }

.head-mark {
  text-align: center;
  font-size: $font-sm;
  color: $color-accent-deep;
  letter-spacing: 8rpx;
  padding: $space-md 0 $space-lg;
}

.row {
  position: relative;
  margin-bottom: $space-md;
}

.del {
  position: absolute;
  top: $space-sm;
  right: $space-sm;
  width: 64rpx;
  height: 64rpx;
  background: rgba(248, 245, 238, 0.9);
  border: 1rpx solid $color-accent;
  display: flex;
  align-items: center;
  justify-content: center;
  &:active { background: rgba(184, 149, 106, 0.15); }
}
.del-icon {
  width: 28rpx;
  height: 28rpx;
  position: relative;
  &::before, &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 28rpx;
    height: 2rpx;
    background: $color-accent-deep;
    transform-origin: center;
  }
  &::before { transform: translate(-50%, -50%) rotate(45deg); }
  &::after { transform: translate(-50%, -50%) rotate(-45deg); }
}
</style>
