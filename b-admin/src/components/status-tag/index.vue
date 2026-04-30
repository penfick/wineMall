<template>
  <el-tag :type="tagType" size="small" effect="light">
    <span class="status-dot" :class="`is-${tagType}`"></span>
    {{ text }}
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    /** 0/1/2... 通用：0=禁用 1=启用；自定义见 textMap */
    value: number | string | boolean;
    textMap?: Record<string, string>;
    typeMap?: Record<string, 'primary' | 'success' | 'info' | 'warning' | 'danger'>;
    inverted?: boolean; // 0=启用、1=禁用 反转语义
  }>(),
  {
    textMap: () => ({}),
    typeMap: () => ({}),
    inverted: false,
  },
);

const key = computed(() => String(Number(props.value)));

const text = computed(() => {
  if (props.textMap[key.value]) return props.textMap[key.value];
  if (typeof props.value === 'boolean') return props.value ? '启用' : '禁用';
  const enabled = props.inverted ? key.value === '0' : key.value === '1';
  return enabled ? '启用' : '禁用';
});

const tagType = computed(() => {
  if (props.typeMap[key.value]) return props.typeMap[key.value];
  const enabled = props.inverted ? key.value === '0' : key.value === '1';
  return enabled ? 'success' : 'info';
});
</script>

<style lang="scss" scoped>
.status-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
  background: var(--el-color-info);

  &.is-primary { background: var(--el-color-primary); }
  &.is-success { background: var(--el-color-success); }
  &.is-warning { background: var(--el-color-warning); }
  &.is-danger { background: var(--el-color-danger); }
}
</style>
