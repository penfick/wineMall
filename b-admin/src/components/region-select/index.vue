<template>
  <el-cascader
    :model-value="modelValue"
    :options="options"
    :props="cascaderProps"
    :placeholder="placeholder"
    :disabled="disabled"
    :clearable="clearable"
    :style="{ width: '100%' }"
    @update:model-value="handleChange"
  />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { regionApi, type RegionNode } from '@/api/region';

const props = withDefaults(
  defineProps<{
    modelValue: string[];
    placeholder?: string;
    disabled?: boolean;
    clearable?: boolean;
  }>(),
  {
    placeholder: '请选择省/市/区',
    clearable: true,
    disabled: false,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', val: string[]): void;
  (e: 'change', val: string[], nodes: RegionNode[]): void;
}>();

const options = ref<RegionNode[]>([]);

const cascaderProps = {
  value: 'code',
  label: 'name',
  children: 'children',
  emitPath: true,
  checkStrictly: false,
};

onMounted(async () => {
  options.value = await regionApi.tree();
});

function handleChange(val: unknown) {
  const result = Array.isArray(val) ? (val as string[]) : [];
  emit('update:modelValue', result);
  emit('change', result, []);
}
</script>
