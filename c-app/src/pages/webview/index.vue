<template>
  <view class="webview-page">
    <!-- H5 外链通过 web-view -->
    <web-view v-if="externalUrl" :src="externalUrl" />
    <!-- 富文本 / 协议 / 公告 -->
    <view v-else class="content">
      <view class="title-block" v-if="title">
        <text class="title">{{ title }}</text>
        <text v-if="subtitle" class="subtitle">{{ subtitle }}</text>
      </view>
      <Skeleton v-if="loading" :count="3" layout="lines" />
      <rich-text v-else :nodes="formattedContent" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import Skeleton from '@/components/Skeleton.vue';
import { noticeApi } from '@/api/goods';
import { http } from '@/utils/request';
import { formatDate } from '@/utils/format';

const externalUrl = ref('');
const type = ref('');
const id = ref(0);
const title = ref('');
const subtitle = ref('');
const content = ref('');
const loading = ref(false);

// 让富文本里的 img / video 自适应宽度，去除内联宽高
const formattedContent = computed(() =>
  (content.value || '')
    .replace(/<img([^>]*)>/gi, (_m, attrs) => {
      const cleaned = String(attrs).replace(/\s(width|height|style)="[^"]*"/gi, '');
      return `<img${cleaned} style="max-width:100%;height:auto;display:block;margin:8rpx 0;">`;
    })
    .replace(/<video/gi, '<video style="max-width:100%;"')
    .replace(/<table/gi, '<table style="max-width:100%;border-collapse:collapse;"'),
);

onLoad((opts: Record<string, string>) => {
  if (opts.url) {
    externalUrl.value = decodeURIComponent(opts.url);
    return;
  }
  type.value = opts.type || '';
  id.value = Number(opts.id || 0);
});

onMounted(async () => {
  if (externalUrl.value) return;
  loading.value = true;
  try {
    if (type.value === 'notice' && id.value) {
      const data = await noticeApi.detail(id.value);
      title.value = data.title;
      subtitle.value = formatDate(data.publishedAt);
      content.value = data.content;
      uni.setNavigationBarTitle({ title: '公告详情' });
    } else if (type.value === 'terms') {
      title.value = '用户协议';
      content.value = await http.get<string>('/system/agreement/terms', undefined, { auth: false }).catch(() =>
        '<p>用户协议（占位文案）</p>',
      );
      uni.setNavigationBarTitle({ title: '用户协议' });
    } else if (type.value === 'privacy') {
      title.value = '隐私政策';
      content.value = await http.get<string>('/system/agreement/privacy', undefined, { auth: false }).catch(() =>
        '<p>隐私政策（占位文案）</p>',
      );
      uni.setNavigationBarTitle({ title: '隐私政策' });
    } else if (type.value === 'about') {
      title.value = '关于我们';
      content.value = '<p>优选商城 — 好货好价，一键直达。</p><p>Version 1.0.0</p>';
      uni.setNavigationBarTitle({ title: '关于我们' });
    }
  } finally {
    loading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.webview-page { min-height: 100vh; background: $bg-card; }
.content { padding: $space-md; }
.title-block { padding: $space-md 0; border-bottom: 1rpx solid $border-light; margin-bottom: $space-md; }
.title { display: block; font-size: $font-lg; font-weight: 700; color: $text-primary; margin-bottom: $space-xs; }
.subtitle { font-size: $font-sm; color: $text-secondary; }
</style>
