<template>
  <view class="category-page">
    <!-- 顶部品牌副标 + 搜索 -->
    <view class="top-bar">
      <view class="brand-sub">
        <view class="line"></view>
        <text class="serif">百 味 入 喉  自 有 章 法</text>
        <view class="line"></view>
      </view>
      <view class="search-bar" @tap="goSearch">
        <view class="icon-search"></view>
        <text class="search-ph serif">寻 觅 佳 酿</text>
      </view>
    </view>

    <view class="layout">
      <!-- 左侧一级分类 -->
      <scroll-view scroll-y class="aside">
        <view
          v-for="cat in tree"
          :key="cat.id"
          class="aside-item"
          :class="{ active: cat.id === activeId }"
          @tap="setActive(cat.id)"
        >
          <text class="serif">{{ cat.name }}</text>
        </view>
      </scroll-view>

      <!-- 右侧主区 -->
      <scroll-view scroll-y class="main" @scrolltolower="loadMore">
        <Skeleton v-if="loading && !tree.length" :count="3" layout="lines" />
        <EmptyState v-else-if="!current" title="暂无分类" />
        <template v-else>
          <!-- 子分类横滑 -->
          <scroll-view
            v-if="subList.length > 1"
            scroll-x
            class="sub-bar"
            :show-scrollbar="false"
          >
            <view class="sub-bar-inner">
              <view
                v-for="sub in subList"
                :key="sub.id"
                class="sub-chip serif"
                :class="{ active: sub.id === activeSubId }"
                @tap="setActiveSub(sub.id)"
              >
                {{ sub.name }}
              </view>
            </view>
          </scroll-view>

          <!-- 当前分类标题印 -->
          <view class="cat-mark serif">
            <view class="mark-line"></view>
            <text>{{ currentSubName }}</text>
            <view class="mark-line"></view>
          </view>

          <!-- 商品列表（单列横排，更适合窄面板） -->
          <Skeleton v-if="goodsLoading && !goodsList.length" :count="4" layout="goods-list" />
          <EmptyState
            v-else-if="!goodsList.length"
            icon="🍶"
            title="此 类 暂 无 佳 酿"
            description="换一类逛逛"
          />
          <view v-else class="goods-list">
            <view v-for="g in goodsList" :key="g.id" class="goods-cell">
              <GoodsCard :goods="g" layout="list" />
            </view>
          </view>

          <LoadMore v-if="goodsList.length" :status="moreStatus" @retry="loadMore" />
        </template>
      </scroll-view>
    </view>
    <CustomTabBar :current="1" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import Skeleton from '@/components/Skeleton.vue';
import EmptyState from '@/components/EmptyState.vue';
import LoadMore from '@/components/LoadMore.vue';
import GoodsCard from '@/components/GoodsCard.vue';
import CustomTabBar from '@/components/CustomTabBar.vue';
import { useHideNativeTabBar } from '@/composables/useHideNativeTabBar';
import { categoryApi, goodsApi, type CategoryNode, type GoodsItem } from '@/api/goods';
import { navTo } from '@/utils/nav';

useHideNativeTabBar();

const tree = ref<CategoryNode[]>([]);
const activeId = ref<number>(0);
const activeSubId = ref<number>(0); // 0 = 全部
const loading = ref(false);

const goodsList = ref<GoodsItem[]>([]);
const goodsTotal = ref(0);
const page = ref(1);
const goodsLoading = ref(false);

const current = computed(() => tree.value.find((t) => t.id === activeId.value));

const subList = computed<Array<{ id: number; name: string }>>(() => {
  if (!current.value) return [];
  const children = current.value.children || [];
  return [{ id: 0, name: '全 部' }, ...children.map((c) => ({ id: c.id, name: c.name }))];
});

const currentSubName = computed(() => {
  if (!current.value) return '';
  if (activeSubId.value === 0) return current.value.name;
  const sub = (current.value.children || []).find((c) => c.id === activeSubId.value);
  return sub?.name || current.value.name;
});

const moreStatus = computed<'more' | 'loading' | 'noMore'>(() => {
  if (goodsLoading.value) return 'loading';
  if (goodsList.value.length >= goodsTotal.value) return 'noMore';
  return 'more';
});

function setActive(id: number) {
  if (activeId.value === id) return;
  activeId.value = id;
  activeSubId.value = 0;
}

function setActiveSub(id: number) {
  if (activeSubId.value === id) return;
  activeSubId.value = id;
}

async function loadGoods(reset = true) {
  if (!activeId.value) return;
  if (goodsLoading.value) return;
  if (reset) {
    page.value = 1;
    goodsList.value = [];
    goodsTotal.value = 0;
  }
  goodsLoading.value = true;
  try {
    const categoryId = activeSubId.value || activeId.value;
    const res = await goodsApi.list({ categoryId, page: page.value, pageSize: 20 });
    goodsList.value = reset ? res.list : [...goodsList.value, ...res.list];
    goodsTotal.value = res.total;
  } finally {
    goodsLoading.value = false;
  }
}

function loadMore() {
  if (moreStatus.value === 'noMore') return;
  page.value += 1;
  loadGoods(false);
}

function goSearch() {
  navTo('/pages/search/index');
}

watch([activeId, activeSubId], () => loadGoods(true));

onMounted(async () => {
  loading.value = true;
  try {
    tree.value = await categoryApi.tree();
    if (tree.value.length && !activeId.value) {
      activeId.value = tree.value[0].id;
    }
  } finally {
    loading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.category-page {
  height: calc(100vh - 100rpx - env(safe-area-inset-bottom));
  background: $bg-page;
  display: flex;
  flex-direction: column;
}

// === 顶部 ===
.top-bar {
  background: $bg-page;
  padding-bottom: $space-sm;
  border-bottom: 1rpx solid $border-light;
}
.brand-sub {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-md;
  padding: $space-sm 0;
  font-family: $font-serif;
  font-size: $font-xs;
  color: $color-accent-deep;
  letter-spacing: 6rpx;
  .line {
    width: 48rpx;
    height: 1rpx;
    background: $border-gold;
  }
}
.search-bar {
  margin: 0 $space-md;
  height: 64rpx;
  border: 1rpx solid $color-accent;
  display: flex;
  align-items: center;
  padding: 0 $space-md;
  gap: $space-xs;
  background: transparent;
  .icon-search {
    width: 24rpx;
    height: 24rpx;
    position: relative;
    flex-shrink: 0;
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 16rpx;
      height: 16rpx;
      border: 2rpx solid $color-accent-deep;
      border-radius: 50%;
    }
    &::after {
      content: '';
      position: absolute;
      bottom: 2rpx;
      right: 0;
      width: 8rpx;
      height: 2rpx;
      background: $color-accent-deep;
      transform: rotate(45deg);
      transform-origin: right center;
    }
  }
  .search-ph {
    font-size: $font-xs;
    color: $text-placeholder;
    letter-spacing: 4rpx;
  }
}

.layout {
  flex: 1;
  display: flex;
  min-height: 0;
}

// === 左侧（关键：用 border-left 而非伪元素 / 子节点动画） ===
.aside {
  width: 180rpx;
  background: $bg-card;
  height: 100%;
  border-right: 1rpx solid $border-light;
  flex-shrink: 0;
}
.aside-item {
  position: relative;
  padding: $space-md $space-sm;
  text-align: center;
  font-size: $font-base;
  color: $text-regular;
  min-height: 120rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 4rpx;
  border-left: 4rpx solid transparent;
  box-sizing: border-box;
  &.active {
    color: $color-primary-dark;
    background: $bg-page;
    border-left-color: $color-accent;
  }
}

// === 右侧 ===
.main {
  flex: 1;
  height: 100%;
  background: $bg-page;
  min-width: 0;
}

.sub-bar {
  background: $bg-page;
  padding: $space-sm $space-md;
  border-bottom: 1rpx dashed $border-light;
  white-space: nowrap;
}
.sub-bar-inner {
  display: inline-flex;
  gap: $space-sm;
}
.sub-chip {
  display: inline-flex;
  align-items: center;
  padding: 8rpx 24rpx;
  min-height: 52rpx;
  border: 1rpx solid $border-base;
  font-size: $font-xs;
  color: $text-regular;
  letter-spacing: 2rpx;
  background: transparent;
  &.active {
    color: $color-accent-light;
    background: $color-primary;
    border-color: $color-primary;
  }
}

.cat-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-sm;
  padding: $space-md 0 $space-sm;
  font-size: $font-sm;
  color: $color-primary-dark;
  letter-spacing: 6rpx;
  .mark-line {
    width: 32rpx;
    height: 1rpx;
    background: $color-accent;
  }
  text { padding-left: 6rpx; }
}

.goods-list {
  padding: 0 $space-sm $space-md;
}
.goods-cell {
  margin-bottom: $space-sm;
}
</style>
