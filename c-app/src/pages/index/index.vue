<template>
  <view class="home page-container">
    <!-- 品牌头：宋体店名 + 搜索图标 -->
    <view class="brand-bar">
      <view class="brand">
        <text class="brand-mark">壹</text>
        <text class="brand-name serif">优 选 酒 坊</text>
      </view>
      <view class="search-icon-btn" @tap="goSearch">
        <view class="icon-search"></view>
      </view>
    </view>

    <!-- 顶部副标 -->
    <view class="brand-sub">
      <view class="line"></view>
      <text>一壶传家  瓶中千年</text>
      <view class="line"></view>
    </view>

    <!-- Hero Banner -->
    <swiper
      v-if="banners.length"
      class="banner"
      indicator-dots
      autoplay
      circular
      :interval="4000"
      indicator-color="rgba(255,255,255,0.4)"
      indicator-active-color="#D4B57E"
    >
      <swiper-item v-for="b in banners" :key="b.id" @tap="onBannerTap(b)">
        <view class="banner-frame">
          <image :src="b.image" class="banner-img" mode="aspectFill" />
        </view>
      </swiper-item>
    </swiper>

    <!-- 分类入口：菱形香槟金线框 -->
    <view v-if="homeCategories.length" class="cat-grid">
      <view
        v-for="c in homeCategories"
        :key="c.id"
        class="cat-item"
        @tap="goCategory(c)"
      >
        <view class="cat-diamond">
          <view class="cat-diamond-inner">
            <image v-if="c.icon" :src="c.icon" class="cat-icon" mode="aspectFit" />
            <text v-else class="cat-text serif">{{ c.name.slice(0, 1) }}</text>
          </view>
        </view>
        <text class="cat-name">{{ c.name }}</text>
      </view>
    </view>

    <!-- 热销榜单 -->
    <view v-if="hot.length" class="section">
      <view class="section-title"><text>品 鉴 推 荐</text></view>
      <scroll-view scroll-x class="hot-scroll" :enhanced="true" :show-scrollbar="false">
        <view v-for="g in hot" :key="g.id" class="hot-item" @tap="goDetail(g.id)">
          <view class="hot-cover-wrap">
            <image :src="g.cover" class="hot-cover" mode="aspectFill" />
          </view>
          <text class="hot-name text-ellipsis serif">{{ g.name }}</text>
          <PriceTag :value="g.price" size="md" />
        </view>
      </scroll-view>
      <view class="more-btn" @tap="goList({ sortBy: 'sales' })">
        <text>查看全部品鉴榜</text>
        <text class="arrow">›</text>
      </view>
    </view>

    <!-- 为你推荐 -->
    <view class="section">
      <view class="section-title"><text>月 度 精 选</text></view>
      <text class="section-desc">由侍酒师为您甄选</text>
      <Skeleton v-if="recLoading && !recommend.length" :count="4" layout="goods-grid" />
      <view v-else class="grid">
        <view v-for="g in recommend" :key="g.id" class="grid-cell">
          <GoodsCard :goods="g" />
        </view>
      </view>
      <EmptyState v-if="!recLoading && !recommend.length" title="暂无推荐" />
    </view>

    <!-- 页脚雅致小字 -->
    <view class="foot">
      <view class="foot-line"></view>
      <text>—  优选好酒  品鉴生活  —</text>
    </view>

    <CustomTabBar :current="0" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onPullDownRefresh } from '@dcloudio/uni-app';
import GoodsCard from '@/components/GoodsCard.vue';
import PriceTag from '@/components/PriceTag.vue';
import Skeleton from '@/components/Skeleton.vue';
import EmptyState from '@/components/EmptyState.vue';
import CustomTabBar from '@/components/CustomTabBar.vue';
import { useHideNativeTabBar } from '@/composables/useHideNativeTabBar';
import { bannerApi, categoryApi, goodsApi, type BannerItem, type CategoryNode, type GoodsItem } from '@/api/goods';
import { navTo } from '@/utils/nav';

useHideNativeTabBar();

const banners = ref<BannerItem[]>([]);
const homeCategories = ref<CategoryNode[]>([]);
const hot = ref<GoodsItem[]>([]);
const recommend = ref<GoodsItem[]>([]);
const recLoading = ref(false);

async function loadAll() {
  recLoading.value = true;
  try {
    const [b, c, h, r] = await Promise.all([
      bannerApi.home().catch(() => [] as BannerItem[]),
      categoryApi.homeCategories().catch(() => [] as CategoryNode[]),
      goodsApi.hot().catch(() => [] as GoodsItem[]),
      goodsApi.recommend().catch(() => [] as GoodsItem[]),
    ]);
    banners.value = b;
    homeCategories.value = c;
    hot.value = h;
    recommend.value = r;
  } finally {
    recLoading.value = false;
  }
}

function onBannerTap(b: BannerItem) {
  if (b.jumpType === 'goods') navTo(`/pages/goods/detail?id=${b.jumpTarget}`);
  else if (b.jumpType === 'category') navTo(`/pages/goods/list?categoryId=${b.jumpTarget}`);
  else if (b.jumpType === 'url') navTo(`/pages/webview/index?url=${encodeURIComponent(b.jumpTarget)}`);
}

function goCategory(c: CategoryNode) {
  navTo(`/pages/goods/list?categoryId=${c.id}&title=${encodeURIComponent(c.name)}`);
}
function goDetail(id: number) {
  navTo(`/pages/goods/detail?id=${id}`);
}
function goList(params: Record<string, string>) {
  const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  navTo(`/pages/goods/list?${qs}`);
}
function goSearch() {
  navTo('/pages/search/index');
}

onMounted(loadAll);
onPullDownRefresh(async () => {
  await loadAll();
  uni.stopPullDownRefresh();
});
</script>

<style lang="scss" scoped>
.home {
  padding: $space-lg $space-md calc(140rpx + env(safe-area-inset-bottom));
}

// === 品牌头 ===
.brand-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $space-xs;
}
.brand {
  display: flex;
  align-items: center;
  gap: $space-sm;
}
.brand-mark {
  width: 56rpx;
  height: 56rpx;
  line-height: 56rpx;
  text-align: center;
  background: $color-primary;
  color: $color-accent-light;
  font-family: $font-serif;
  font-size: 32rpx;
}
.brand-name {
  font-size: $font-lg;
  color: $color-primary-dark;
  letter-spacing: 4rpx;
}
.search-icon-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
// 纯 CSS 画放大镜（避免用 emoji）
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

.brand-sub {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-md;
  margin: $space-md 0 $space-lg;
  font-family: $font-serif;
  font-size: $font-sm;
  color: $color-accent-deep;
  letter-spacing: 6rpx;
  .line {
    width: 60rpx;
    height: 1rpx;
    background: $border-gold;
  }
}

// === Banner ===
.banner {
  width: 100%;
  height: 360rpx;
  margin-bottom: $space-lg;
}
.banner-frame {
  width: 100%;
  height: 100%;
  padding: 4rpx;
  background: linear-gradient(135deg, $color-accent-light 0%, $color-accent 100%);
}
.banner-img {
  width: 100%;
  height: 100%;
  display: block;
}

// === 分类入口（菱形）===
.cat-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: $space-md $space-sm;
  padding: $space-lg $space-sm;
  background: $bg-card;
  border-top: 1rpx solid $border-gold;
  border-bottom: 1rpx solid $border-gold;
  margin-bottom: $space-lg;
}
.cat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-sm;
}
.cat-diamond {
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid $color-accent;
  transform: rotate(45deg);
  position: relative;
}
.cat-diamond-inner {
  transform: rotate(-45deg);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  .cat-icon {
    width: 48rpx;
    height: 48rpx;
  }
  .cat-text {
    color: $color-primary;
    font-size: 32rpx;
    font-weight: 500;
  }
}
.cat-name {
  font-size: $font-xs;
  color: $text-regular;
  letter-spacing: 1rpx;
}

// === 区块 ===
.section {
  margin-bottom: $space-xl;
}
.section-desc {
  display: block;
  text-align: center;
  font-family: $font-serif;
  font-size: $font-xs;
  color: $color-accent-deep;
  letter-spacing: 4rpx;
  margin-bottom: $space-lg;
}

// 横向热销
.hot-scroll {
  white-space: nowrap;
  padding: 0 $space-xs;
}
.hot-item {
  display: inline-flex;
  flex-direction: column;
  width: 240rpx;
  margin-right: $space-md;
  vertical-align: top;
}
.hot-cover-wrap {
  width: 240rpx;
  height: 240rpx;
  background: $bg-card;
  border: 1rpx solid $border-light;
  padding: 4rpx;
  margin-bottom: $space-sm;
}
.hot-cover {
  width: 100%;
  height: 100%;
}
.hot-name {
  font-size: $font-sm;
  color: $text-primary;
  width: 240rpx;
  margin-bottom: 6rpx;
  letter-spacing: 1rpx;
}

.more-btn {
  margin: $space-lg auto 0;
  width: 360rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-sm;
  border: 1rpx solid $border-gold;
  color: $color-primary;
  font-family: $font-serif;
  font-size: $font-sm;
  letter-spacing: 4rpx;
  .arrow {
    font-family: $font-sans;
    color: $color-accent;
  }
  &:active {
    background: rgba(184, 149, 106, 0.06);
  }
}

// 商品网格
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-md;
}
.grid-cell { width: 100%; }

// 页脚
.foot {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: $space-xl;
  padding-bottom: $space-lg;
  font-family: $font-serif;
  font-size: $font-xs;
  color: $color-accent-deep;
  letter-spacing: 8rpx;
  .foot-line {
    width: 1rpx;
    height: 32rpx;
    background: $border-gold;
    margin-bottom: $space-md;
  }
}
</style>
