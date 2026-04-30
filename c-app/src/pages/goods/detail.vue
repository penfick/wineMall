<template>
  <view class="detail-page">
    <Skeleton v-if="loading && !detail" :count="2" layout="lines" />
    <NetworkError v-else-if="error" @retry="load" />
    <template v-else-if="detail">
      <!-- Hero 全幅大图 -->
      <view class="hero">
        <swiper
          class="hero-swiper"
          indicator-dots
          autoplay
          circular
          :interval="4500"
          indicator-color="rgba(255,255,255,0.4)"
          indicator-active-color="#D4B57E"
        >
          <swiper-item v-for="(img, i) in detail.images" :key="i">
            <image :src="img" class="hero-img" mode="aspectFill" />
          </swiper-item>
        </swiper>
        <view class="hero-fade"></view>
      </view>

      <!-- 品名 / 价格 / 销量 -->
      <view class="title-block">
        <view class="title-divider">
          <view class="line"></view>
          <text class="diamond">◆</text>
          <view class="line"></view>
        </view>
        <text class="name serif">{{ detail.name }}</text>
        <text v-if="detail.tagText" class="sub serif">{{ detail.tagText }}</text>
        <view class="title-divider">
          <view class="line"></view>
          <text class="diamond">◆</text>
          <view class="line"></view>
        </view>

        <view class="price-row">
          <PriceTag :value="detail.price" size="xl" />
          <PriceTag
            v-if="detail.originalPrice && detail.originalPrice > detail.price"
            :value="detail.originalPrice"
            size="sm"
            strike
          />
        </view>
        <view class="meta-row">
          <text class="meta-item">已 售 {{ detail.sales }}</text>
          <text class="dot">·</text>
          <text class="meta-item">{{ stockText }}</text>
        </view>
      </view>

      <!-- 规格选择 -->
      <view class="select-row" @tap="openSku()">
        <text class="label serif">规 格</text>
        <text class="value">{{ pickedText || '请选择规格' }}</text>
        <text class="arrow">›</text>
      </view>

      <!-- 商品参数 -->
      <view v-if="detail.attributes?.length" class="card">
        <view class="card-head">
          <view class="bar"></view>
          <text class="card-title serif">品 鉴 参 数</text>
        </view>
        <view v-for="a in detail.attributes" :key="a.key" class="attr-row">
          <text class="attr-key">{{ a.key }}</text>
          <text class="attr-val">{{ a.value }}</text>
        </view>
      </view>

      <!-- 商品详情 -->
      <view class="card">
        <view class="card-head">
          <view class="bar"></view>
          <text class="card-title serif">详 情 介 绍</text>
        </view>
        <rich-text :nodes="formattedDetail" />
      </view>

      <view class="foot-mark serif">— 优 选 好 酒 · 品 鉴 生 活 —</view>

      <!-- 底部购买栏 -->
      <view class="footer safe-area-bottom">
        <view class="action" @tap="toggleFavorite">
          <view :class="['act-icon', 'icon-heart', { on: favored }]"></view>
          <text class="act-text">{{ favored ? '已藏' : '收藏' }}</text>
        </view>
        <view class="action" @tap="goCart">
          <view class="act-icon icon-cart"></view>
          <text class="act-text">购物车</text>
          <view v-if="cartStore.totalCount > 0" class="badge">
            {{ cartStore.totalCount > 99 ? '99+' : cartStore.totalCount }}
          </view>
        </view>
        <view class="btn-cart serif" @tap="openSku('cart')">加入购物车</view>
        <view class="btn-buy serif" @tap="openSku('buy')">立 即 购 买</view>
      </view>

      <SkuSelector
        v-if="detail"
        ref="skuRef"
        :skus="detail.skus"
        :cover="detail.cover"
        :default-price="detail.price"
        :mode="skuMode"
        @add-cart="onAddCart"
        @buy-now="onBuyNow"
      />
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import PriceTag from '@/components/PriceTag.vue';
import Skeleton from '@/components/Skeleton.vue';
import NetworkError from '@/components/NetworkError.vue';
import SkuSelector from '@/components/SkuSelector.vue';
import { goodsApi, favoriteApi, type GoodsDetail } from '@/api/goods';
import { useCartStore } from '@/store/cart';
import { useUserStore } from '@/store/user';
import { navTo } from '@/utils/nav';

const cartStore = useCartStore();
const userStore = useUserStore();

const goodsId = ref(0);
const detail = ref<GoodsDetail | null>(null);
const loading = ref(false);
const error = ref(false);
const favored = ref(false);
const skuMode = ref<'both' | 'cart' | 'buy'>('both');
const skuRef = ref<{ open(skuId?: number): void } | null>(null);

const pickedText = ref('');

const stockText = computed(() => {
  const s = detail.value?.stock ?? 0;
  if (s <= 0) return '虚位以待';
  if (s < 10) return `仅 余 ${s}`;
  return '现 货 充 足';
});

const formattedDetail = computed(() =>
  (detail.value?.detail || '')
    .replace(/<img([^>]*)>/gi, (_m, attrs) => {
      const cleaned = String(attrs).replace(/\s(width|height|style)="[^"]*"/gi, '');
      return `<img${cleaned} style="max-width:100%;height:auto;display:block;margin:8rpx 0;">`;
    })
    .replace(/<table/gi, '<table style="max-width:100%;border-collapse:collapse;"'),
);

async function load() {
  loading.value = true;
  error.value = false;
  try {
    detail.value = await goodsApi.detail(goodsId.value);
    if (userStore.isLogin) {
      favoriteApi
        .check(goodsId.value)
        .then((r) => (favored.value = r.favored))
        .catch(() => {});
    }
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function openSku(mode: 'both' | 'cart' | 'buy' = 'both') {
  if (!detail.value) return;
  skuMode.value = mode;
  skuRef.value?.open();
}

function ensureLogin(): boolean {
  if (!userStore.isLogin) {
    navTo('/pages/login/index');
    return false;
  }
  return true;
}

async function onAddCart(payload: { skuId: number; qty: number }) {
  if (!ensureLogin()) return;
  await cartStore.add(payload.skuId, payload.qty);
  uni.showToast({ title: '已加入购物车', icon: 'success' });
}

function onBuyNow(payload: { skuId: number; qty: number }) {
  if (!ensureLogin()) return;
  navTo(`/pages/order/confirm?source=goods&skuId=${payload.skuId}&qty=${payload.qty}`);
}

async function toggleFavorite() {
  if (!ensureLogin()) return;
  if (favored.value) {
    await favoriteApi.remove(goodsId.value);
    favored.value = false;
    uni.showToast({ title: '已取消收藏', icon: 'none' });
  } else {
    await favoriteApi.add(goodsId.value);
    favored.value = true;
    uni.showToast({ title: '收藏成功', icon: 'success' });
  }
}

function goCart() { navTo('/pages/cart/index'); }

onLoad((opts: Record<string, string>) => {
  goodsId.value = Number(opts.id || 0);
  if (goodsId.value) load();
  if (userStore.isLogin) cartStore.load().catch(() => {});
});
</script>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  background: $bg-page;
  padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
}

// === Hero 全幅 ===
.hero {
  position: relative;
  width: 100%;
  height: 750rpx;
  background: $bg-card;
}
.hero-swiper {
  width: 100%;
  height: 100%;
}
.hero-img {
  width: 100%;
  height: 100%;
  display: block;
}
// 底部渐隐到米白
.hero-fade {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 80rpx;
  background: linear-gradient(to bottom, rgba(248, 245, 238, 0) 0%, $bg-page 100%);
  pointer-events: none;
}

// === 品名块 ===
.title-block {
  padding: $space-lg $space-lg $space-md;
  background: $bg-page;
  text-align: center;
}
.title-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-md;
  margin: $space-sm 0;
  .line {
    width: 80rpx;
    height: 1rpx;
    background: $border-gold;
  }
  .diamond {
    color: $color-accent;
    font-size: 16rpx;
  }
}
.name {
  display: block;
  font-size: 40rpx;
  color: $color-primary-dark;
  letter-spacing: 4rpx;
  line-height: 1.5;
  margin: $space-xs 0;
}
.sub {
  display: block;
  font-size: $font-sm;
  color: $color-accent-deep;
  letter-spacing: 6rpx;
  margin-top: 4rpx;
}
.price-row {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: $space-md;
  margin-top: $space-md;
}
.meta-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: $space-sm;
  margin-top: $space-xs;
  font-size: $font-xs;
  color: $text-secondary;
  letter-spacing: 2rpx;
  .dot {
    color: $color-accent;
  }
}

// === 规格选择 ===
.select-row {
  display: flex;
  align-items: center;
  background: $bg-card;
  padding: $space-md $space-lg;
  margin: $space-md 0;
  min-height: 96rpx;
  border-top: 1rpx solid $border-light;
  border-bottom: 1rpx solid $border-light;
  .label {
    color: $color-primary;
    font-size: $font-base;
    width: 120rpx;
    letter-spacing: 4rpx;
  }
  .value {
    flex: 1;
    color: $text-primary;
    font-size: $font-base;
  }
  .arrow {
    color: $color-accent;
    font-size: 36rpx;
  }
}

// === 卡片 ===
.card {
  background: $bg-card;
  padding: $space-lg;
  margin-bottom: $space-md;
  border-top: 1rpx solid $border-light;
  border-bottom: 1rpx solid $border-light;
}
.card-head {
  display: flex;
  align-items: center;
  gap: $space-sm;
  margin-bottom: $space-md;
  .bar {
    width: 4rpx;
    height: 28rpx;
    background: $color-accent;
  }
  .card-title {
    font-size: $font-md;
    color: $color-primary-dark;
    letter-spacing: 4rpx;
  }
}
.attr-row {
  display: flex;
  padding: $space-sm 0;
  border-bottom: 1rpx dashed $border-light;
  font-size: $font-sm;
  &:last-child {
    border-bottom: 0;
  }
  .attr-key {
    width: 200rpx;
    color: $text-secondary;
    letter-spacing: 1rpx;
  }
  .attr-val {
    flex: 1;
    color: $text-primary;
  }
}

.foot-mark {
  text-align: center;
  font-size: $font-xs;
  color: $color-accent-deep;
  letter-spacing: 8rpx;
  padding: $space-lg 0;
}

// === 底部购买栏 ===
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  background: #ffffff;
  padding: $space-sm $space-md;
  border-top: 1rpx solid $border-light;
  box-shadow: 0 -4rpx 20rpx rgba(31, 58, 46, 0.04);
  z-index: 10;
}
.action {
  flex: 0 0 88rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  padding: $space-xs 0;
  .act-text {
    font-size: 20rpx;
    color: $text-secondary;
    margin-top: 4rpx;
    letter-spacing: 1rpx;
  }
  .badge {
    position: absolute;
    top: -2rpx;
    right: 8rpx;
    background: $color-accent;
    color: #ffffff;
    font-size: 18rpx;
    font-family: $font-mono;
    min-width: 28rpx;
    height: 28rpx;
    border-radius: 14rpx;
    padding: 0 6rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2rpx solid #ffffff;
    box-sizing: border-box;
  }
}
.act-icon {
  width: 40rpx;
  height: 40rpx;
  position: relative;
  color: $text-regular;
}
// 心形（描边）
.icon-heart {
  &::before {
    content: '';
    position: absolute;
    top: 8rpx;
    left: 6rpx;
    width: 14rpx;
    height: 22rpx;
    border: 2rpx solid currentColor;
    border-bottom: 0;
    border-radius: 14rpx 14rpx 0 0;
    transform: rotate(-45deg);
    transform-origin: bottom left;
  }
  &::after {
    content: '';
    position: absolute;
    top: 8rpx;
    right: 6rpx;
    width: 14rpx;
    height: 22rpx;
    border: 2rpx solid currentColor;
    border-bottom: 0;
    border-radius: 14rpx 14rpx 0 0;
    transform: rotate(45deg);
    transform-origin: bottom right;
  }
  &.on {
    color: $color-accent-deep;
    &::before, &::after {
      background: $color-accent-deep;
    }
  }
}
// 购物袋
.icon-cart {
  &::before {
    content: '';
    position: absolute;
    inset: 12rpx 4rpx 4rpx 4rpx;
    border: 2rpx solid currentColor;
    border-radius: 2rpx 2rpx 4rpx 4rpx;
  }
  &::after {
    content: '';
    position: absolute;
    top: 4rpx;
    left: 50%;
    width: 16rpx;
    height: 12rpx;
    border: 2rpx solid currentColor;
    border-bottom: 0;
    border-radius: 8rpx 8rpx 0 0;
    transform: translateX(-50%);
  }
}

// 主按钮
.btn-cart, .btn-buy {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-base;
  letter-spacing: 4rpx;
  margin-left: $space-sm;
}
// 描金边
.btn-cart {
  background: transparent;
  color: $color-primary-dark;
  border: 1rpx solid $color-accent;
  &:active {
    background: rgba(184, 149, 106, 0.08);
  }
}
// 墨绿实心
.btn-buy {
  background: $color-primary;
  color: $color-accent-light;
  &:active {
    background: $color-primary-dark;
  }
}
</style>
