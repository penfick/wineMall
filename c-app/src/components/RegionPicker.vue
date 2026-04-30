<template>
  <view>
    <view class="region-trigger" @tap="open">
      <text v-if="display" class="value">{{ display }}</text>
      <text v-else class="placeholder">{{ placeholder }}</text>
      <text class="arrow">›</text>
    </view>

    <uni-popup ref="popupRef" type="bottom" background-color="#fff">
      <view class="picker-panel">
        <view class="header">
          <text class="title">选择地区</text>
          <text class="close" @tap="close">✕</text>
        </view>
        <view class="tabs">
          <view
            v-for="(t, i) in tabs"
            :key="i"
            class="tab"
            :class="{ active: i === activeTab }"
            @tap="switchTab(i)"
          >
            {{ t || '请选择' }}
          </view>
        </view>
        <scroll-view scroll-y class="list">
          <view
            v-for="node in currentList"
            :key="node.code"
            class="item"
            :class="{ selected: selected[activeTab]?.code === node.code }"
            @tap="onSelect(node)"
          >
            <text>{{ node.name }}</text>
            <text v-if="selected[activeTab]?.code === node.code" class="check">✓</text>
          </view>
        </scroll-view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { regionApi, type RegionNode } from '@/api/region';

const props = withDefaults(
  defineProps<{
    modelValue?: string[]; // [provinceCode, cityCode, districtCode]
    placeholder?: string;
  }>(),
  { placeholder: '请选择省/市/区' },
);

const emit = defineEmits<{
  (e: 'update:modelValue', val: string[]): void;
  (e: 'change', val: { codes: string[]; names: string[] }): void;
}>();

const popupRef = ref<{ open(): void; close(): void } | null>(null);
const tree = ref<RegionNode[]>([]);
const selected = ref<RegionNode[]>([]);
const activeTab = ref(0);

const tabs = computed(() => {
  const arr = selected.value.map((n) => n.name);
  if (arr.length < 3) arr.push('请选择');
  return arr;
});

const display = computed(() => {
  if (!props.modelValue?.length) return '';
  const names: string[] = [];
  let list = tree.value;
  for (const code of props.modelValue) {
    const node = list.find((n) => n.code === code);
    if (!node) break;
    names.push(node.name);
    list = node.children || [];
  }
  return names.join(' / ');
});

const currentList = computed<RegionNode[]>(() => {
  if (activeTab.value === 0) return tree.value;
  const parent = selected.value[activeTab.value - 1];
  return parent?.children || [];
});

async function ensureTree() {
  if (tree.value.length) return;
  tree.value = await regionApi.tree();
}

async function open() {
  await ensureTree();
  selected.value = [];
  activeTab.value = 0;
  popupRef.value?.open();
}

function close() {
  popupRef.value?.close();
}

function switchTab(i: number) {
  if (i > selected.value.length) return; // 必须按顺序
  activeTab.value = i;
}

function onSelect(node: RegionNode) {
  selected.value = [...selected.value.slice(0, activeTab.value), node];
  if (node.children?.length && activeTab.value < 2) {
    activeTab.value += 1;
  } else {
    const codes = selected.value.map((n) => n.code);
    const names = selected.value.map((n) => n.name);
    emit('update:modelValue', codes);
    emit('change', { codes, names });
    close();
  }
}

onMounted(ensureTree);
</script>

<style lang="scss" scoped>
.region-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: $bg-card;
  border-radius: $radius-base;
  min-height: 88rpx;
  .value { color: $text-primary; }
  .placeholder { color: $text-placeholder; }
  .arrow { color: $text-placeholder; transform: rotate(90deg); font-size: 32rpx; }
}
.picker-panel {
  height: 70vh;
  display: flex;
  flex-direction: column;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $space-md;
  border-bottom: 1rpx solid $border-light;
  .title { font-size: $font-md; font-weight: 600; }
  .close { width: 60rpx; height: 60rpx; line-height: 60rpx; text-align: center; color: $text-secondary; }
}
.tabs {
  display: flex;
  border-bottom: 1rpx solid $border-light;
  .tab {
    padding: $space-md;
    color: $text-secondary;
    font-size: $font-base;
    &.active {
      color: $color-primary;
      border-bottom: 4rpx solid $color-primary;
      font-weight: 600;
    }
  }
}
.list { flex: 1; }
.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $space-md;
  font-size: $font-base;
  min-height: 88rpx;
  border-bottom: 1rpx solid $border-light;
  &.selected { color: $color-primary; }
  .check { color: $color-primary; font-weight: 600; }
}
</style>
