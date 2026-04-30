<template>
  <view class="list-page">
    <!-- 搜索框：金边 + 米白底 -->
    <view class="filter-bar">
      <view class="search-input" @tap="goSearch">
        <view class="icon-search"></view>
        <text v-if="query.keyword" class="kw">{{ query.keyword }}</text>
        <text v-else class="ph">搜索佳酿</text>
      </view>
    </view>

    <!-- 排序栏：宋体 + 选中底部金线 -->
    <view class="sort-bar">
      <view
        v-for="s in sortOptions"
        :key="s.value"
        class="sort-item"
        :class="{ active: isActive(s.value) }"
        @tap="changeSort(s.value)"
      >
        <text class="serif">{{ s.label }}</text>
        <text v-if="s.arrow" class="arrow">{{ s.arrow }}</text>
        <view class="under-line"></view>
      </view>
    </view>

    <scroll-view scroll-y class="content" @scrolltolower="loadMore">
      <Skeleton v-if="loading && !list.length" :count="6" layout="goods-list" />
      <EmptyState v-else-if="!list.length" title="暂无佳酿" />
      <view v-else class="grid">
        <view v-for="g in list" :key="g.id" class="cell">
          <GoodsCard :goods="g" />
        </view>
      </view>
      <LoadMore v-if="list.length" :status="moreStatus" @retry="loadMore" />
      <view v-if="list.length && moreStatus === 'noMore'" class="end-mark serif">
        — 已 至 卷 末 —
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app';
import GoodsCard from '@/components/GoodsCard.vue';
import Skeleton from '@/components/Skeleton.vue';
import EmptyState from '@/components/EmptyState.vue';
import LoadMore from '@/components/LoadMore.vue';
import { goodsApi, type GoodsItem, type GoodsListQuery } from '@/api/goods';
import { navTo } from '@/utils/nav';

type SortVal = NonNullable<GoodsListQuery['sortBy']>;

const list = ref<GoodsItem[]>([]);
const total = ref(0);
const loading = ref(false);

const query = reactive<GoodsListQuery>({
  page: 1,
  pageSize: 20,
  keyword: '',
  categoryId: undefined,
  sortBy: 'default',
});

const sortOptions = computed(() => {
  const priceArrow =
    query.sortBy === 'price-asc' ? '↑' : query.sortBy === 'price-desc' ? '↓' : '';
  return [
    { label: '综 合', value: 'default' as SortVal, arrow: '' },
    { label: '销 量', value: 'sales' as SortVal, arrow: '' },
    { label: '新 品', value: 'newest' as SortVal, arrow: '' },
    { label: '价 格', value: 'price-toggle' as 'price-toggle', arrow: priceArrow },
  ];
});

const moreStatus = computed<'more' | 'loading' | 'noMore'>(() => {
  if (loading.value) return 'loading';
  if (list.value.length >= total.value) return 'noMore';
  return 'more';
});

function isActive(v: SortVal | 'price-toggle') {
  if (v === 'price-toggle') return query.sortBy === 'price-asc' || query.sortBy === 'price-desc';
  return query.sortBy === v;
}

async function loadData(reset = false) {
  if (loading.value) return;
  if (reset) {
    query.page = 1;
    list.value = [];
  }
  loading.value = true;
  try {
    const res = await goodsApi.list(query);
    list.value = reset ? res.list : [...list.value, ...res.list];
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function loadMore() {
  if (moreStatus.value === 'noMore') return;
  query.page = (query.page || 1) + 1;
  loadData();
}

function changeSort(val: SortVal | 'price-toggle') {
  if (val === 'price-toggle') {
    query.sortBy = query.sortBy === 'price-asc' ? 'price-desc' : 'price-asc';
  } else {
    query.sortBy = val;
  }
  loadData(true);
}

function goSearch() {
  navTo(`/pages/search/index?keyword=${encodeURIComponent(query.keyword || '')}`);
}

onLoad((opts: Record<string, string>) => {
  if (opts.categoryId) query.categoryId = Number(opts.categoryId);
  if (opts.keyword) query.keyword = opts.keyword;
  if (opts.sortBy) query.sortBy = opts.sortBy as SortVal;
  if (opts.title) uni.setNavigationBarTitle({ title: decodeURIComponent(opts.title) });
});

onMounted(() => loadData(true));
onPullDownRefresh(async () => {
  await loadData(true);
  uni.stopPullDownRefresh();
});
</script>

<style lang="scss" scoped>
.list-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: $bg-page;
}

// === 搜索条 ===
.filter-bar {
  padding: $space-sm $space-md;
  background: $bg-page;
}
.search-input {
  display: flex;
  align-items: center;
  background: $bg-card;
  border: 1rpx solid $border-gold;
  padding: 0 $space-md;
  height: 64rpx;
  gap: $space-sm;
  .kw {
    color: $text-primary;
    font-size: $font-sm;
  }
  .ph {
    color: $text-placeholder;
    font-size: $font-sm;
    letter-spacing: 2rpx;
  }
}
.icon-search {
  width: 24rpx;
  height: 24rpx;
  border: 2rpx solid $color-primary;
  border-radius: 50%;
  position: relative;
  &::after {
    content: '';
    position: absolute;
    right: -10rpx;
    bottom: -10rpx;
    width: 14rpx;
    height: 2rpx;
    background: $color-primary;
    transform: rotate(45deg);
    transform-origin: left center;
  }
}

// === 排序栏 ===
.sort-bar {
  display: flex;
  background: $bg-card;
  border-top: 1rpx solid $border-light;
  border-bottom: 1rpx solid $border-light;
}
.sort-item {
  flex: 1;
  position: relative;
  padding: $space-sm 0;
  font-size: $font-sm;
  color: $text-regular;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4rpx;
  min-height: 80rpx;
  letter-spacing: 2rpx;
  .arrow {
    margin-left: 2rpx;
    font-size: $font-xs;
    color: $color-accent;
  }
  .under-line {
    position: absolute;
    bottom: 8rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 2rpx;
    background: $color-accent;
    transition: width 0.25s ease;
  }
  &.active {
    color: $color-primary-dark;
    .under-line {
      width: 48rpx;
    }
  }
}

.content {
  flex: 1;
  padding: $space-md;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-md;
}
.cell { width: 100%; }

.end-mark {
  text-align: center;
  font-size: $font-xs;
  color: $color-accent-deep;
  letter-spacing: 8rpx;
  padding: $space-lg 0;
}
</style>
