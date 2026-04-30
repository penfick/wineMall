<template>
  <el-popover :width="320" trigger="click" placement="bottom-start">
    <template #reference>
      <div class="icon-select-trigger cursor-pointer">
        <el-icon v-if="modelValue" :size="18">
          <component :is="modelValue" />
        </el-icon>
        <span v-else class="text-placeholder">选择图标</span>
      </div>
    </template>
    <div class="icon-select">
      <el-input
        v-model="keyword"
        size="small"
        placeholder="搜索图标"
        clearable
        :prefix-icon="Search"
      />
      <el-scrollbar height="280px" class="icon-list">
        <div
          v-for="name in filtered"
          :key="name"
          class="icon-cell"
          :class="{ active: name === modelValue }"
          @click="select(name)"
        >
          <el-icon :size="20"><component :is="name" /></el-icon>
          <span class="icon-name">{{ name }}</span>
        </div>
      </el-scrollbar>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Search } from '@element-plus/icons-vue';
import * as ElementPlusIcons from '@element-plus/icons-vue';

withDefaults(defineProps<{ modelValue?: string }>(), { modelValue: '' });
const emit = defineEmits<{ (e: 'update:modelValue', val: string): void }>();

const keyword = ref('');

const allIcons = Object.keys(ElementPlusIcons).filter((n) => /^[A-Z]/.test(n));

const filtered = computed(() => {
  if (!keyword.value) return allIcons;
  const kw = keyword.value.toLowerCase();
  return allIcons.filter((n) => n.toLowerCase().includes(kw));
});

function select(name: string) {
  emit('update:modelValue', name);
}
</script>

<style lang="scss" scoped>
.icon-select-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid $border-base;
  border-radius: $radius-base;
  min-width: 100px;
  height: 32px;
  background: #fff;
  transition: border-color $transition-fast;

  &:hover {
    border-color: $color-primary;
  }

  .text-placeholder {
    color: $text-placeholder;
    font-size: 13px;
  }
}

.icon-list {
  margin-top: 8px;
}

.icon-cell {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 70px;
  padding: 8px 4px;
  border-radius: $radius-base;
  cursor: pointer;
  text-align: center;
  transition: background $transition-fast;

  &:hover {
    background: $bg-hover;
    color: $color-primary;
  }

  &.active {
    background: rgba(64, 158, 255, 0.1);
    color: $color-primary;
  }

  .icon-name {
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
  }
}
</style>
