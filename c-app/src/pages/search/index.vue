<template>
  <view class="search-page">
    <view class="search-bar">
      <view class="input-wrap">
        <view class="icon-search"></view>
        <input
          class="input"
          v-model="keyword"
          placeholder="寻 觅 佳 酿"
          confirm-type="search"
          focus
          @confirm="onSearch"
        />
        <text v-if="keyword" class="clear" @tap="keyword = ''">✕</text>
      </view>
      <text class="cancel serif" @tap="onCancel">取 消</text>
    </view>

    <template v-if="!submitted">
      <view v-if="history.length" class="block">
        <view class="block-head">
          <view class="bar"></view>
          <text class="title serif">搜 索 历 史</text>
          <text class="clear-all" @tap="clearHistory">清 空</text>
        </view>
        <view class="tags">
          <view v-for="(h, i) in history" :key="i" class="tag" @tap="onTagTap(h)">{{ h }}</view>
        </view>
      </view>
      <view class="block">
        <view class="block-head">
          <view class="bar"></view>
          <text class="title serif">雅 集 推 荐</text>
        </view>
        <view class="tags">
          <view v-for="(h, i) in hotKeywords" :key="i" class="tag hot" @tap="onTagTap(h)">{{ h }}</view>
        </view>
      </view>
    </template>

    <scroll-view v-else scroll-y class="result" @scrolltolower="loadMore">
      <Skeleton v-if="loading && !list.length" :count="4" layout="goods-list" />
      <EmptyState v-else-if="!list.length" icon="🔍" title="没有找到相关商品" :description="`未找到「${keyword}」相关商品`" />
      <view v-else>
        <view v-for="g in list" :key="g.id" class="cell">
          <GoodsCard :goods="g" layout="list" />
        </view>
        <LoadMore :status="moreStatus" @retry="loadMore" />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import GoodsCard from '@/components/GoodsCard.vue';
import Skeleton from '@/components/Skeleton.vue';
import EmptyState from '@/components/EmptyState.vue';
import LoadMore from '@/components/LoadMore.vue';
import { goodsApi, type GoodsItem } from '@/api/goods';
import { getStorage, setStorage } from '@/utils/storage';
import { navBack } from '@/utils/nav';

const HISTORY_KEY = 'search_history';
const keyword = ref('');
const submitted = ref(false);
const history = ref<string[]>(getStorage<string[]>(HISTORY_KEY) || []);
const hotKeywords = ['白酒', '红酒', '啤酒', '威士忌', '茅台', '五粮液', '青岛', '长城'];

const list = ref<GoodsItem[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);

const moreStatus = computed<'more' | 'loading' | 'noMore'>(() => {
  if (loading.value) return 'loading';
  if (list.value.length >= total.value) return 'noMore';
  return 'more';
});

async function search(reset = true) {
  if (!keyword.value.trim()) return;
  if (loading.value) return;
  if (reset) {
    page.value = 1;
    list.value = [];
    submitted.value = true;
  }
  loading.value = true;
  try {
    const res = await goodsApi.list({
      keyword: keyword.value,
      page: page.value,
      pageSize: 20,
    });
    list.value = reset ? res.list : [...list.value, ...res.list];
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function loadMore() {
  if (moreStatus.value === 'noMore') return;
  page.value += 1;
  search(false);
}

function onSearch() {
  if (!keyword.value.trim()) return;
  // 记录历史
  const next = [keyword.value, ...history.value.filter((h) => h !== keyword.value)].slice(0, 10);
  history.value = next;
  setStorage(HISTORY_KEY, next);
  search(true);
}

function onTagTap(t: string) {
  keyword.value = t;
  onSearch();
}

function clearHistory() {
  history.value = [];
  setStorage(HISTORY_KEY, []);
}

function onCancel() {
  if (submitted.value) {
    submitted.value = false;
    keyword.value = '';
  } else {
    navBack();
  }
}

onLoad((opts: Record<string, string>) => {
  if (opts.keyword) {
    keyword.value = opts.keyword;
    onSearch();
  }
});
</script>

<style lang="scss" scoped>
.search-page {
  height: 100vh;
  background: $bg-page;
  display: flex;
  flex-direction: column;
}

.search-bar {
  display: flex;
  align-items: center;
  padding: $space-sm $space-md;
  background: $bg-card;
  gap: $space-md;
  border-bottom: 1rpx solid $border-light;
  .input-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    background: transparent;
    border: 1rpx solid $color-accent;
    padding: 0 $space-sm;
    height: 68rpx;
    gap: $space-xs;
  }
  .icon-search {
    width: 28rpx;
    height: 28rpx;
    position: relative;
    margin-left: $space-xs;
    flex-shrink: 0;
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 18rpx;
      height: 18rpx;
      border: 2rpx solid $color-accent-deep;
      border-radius: 50%;
    }
    &::after {
      content: '';
      position: absolute;
      bottom: 2rpx;
      right: 0;
      width: 10rpx;
      height: 2rpx;
      background: $color-accent-deep;
      transform: rotate(45deg);
      transform-origin: right center;
    }
  }
  .input {
    flex: 1;
    font-size: $font-sm;
    height: 64rpx;
    color: $text-primary;
    letter-spacing: 2rpx;
  }
  .clear {
    padding: 0 $space-xs;
    color: $color-accent-deep;
    font-size: $font-sm;
  }
  .cancel {
    color: $color-primary-dark;
    font-size: $font-sm;
    padding: $space-xs $space-sm;
    letter-spacing: 4rpx;
  }
}

.block {
  padding: $space-md $space-lg;
  background: $bg-card;
  margin: $space-md;
  border: 1rpx solid $border-light;
}
.block-head {
  display: flex;
  align-items: center;
  gap: $space-sm;
  margin-bottom: $space-md;
  padding-bottom: $space-sm;
  border-bottom: 1rpx dashed $border-light;
  .bar {
    width: 4rpx;
    height: 24rpx;
    background: $color-accent;
  }
  .title {
    font-size: $font-base;
    color: $color-primary-dark;
    letter-spacing: 6rpx;
    flex: 1;
  }
  .clear-all {
    color: $text-secondary;
    font-size: $font-xs;
    letter-spacing: 2rpx;
  }
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: $space-sm;
}
.tag {
  padding: 8rpx 24rpx;
  background: transparent;
  border: 1rpx solid $border-base;
  font-size: $font-sm;
  color: $text-regular;
  font-family: $font-serif;
  min-height: 56rpx;
  display: flex;
  align-items: center;
  letter-spacing: 2rpx;
  &.hot {
    border-color: $color-accent;
    color: $color-accent-deep;
  }
  &:active {
    background: rgba(184, 149, 106, 0.08);
  }
}

.result {
  flex: 1;
  height: 0;
  padding: $space-md;
  box-sizing: border-box;
}
.cell { margin-bottom: $space-md; }
</style>
