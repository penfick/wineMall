<template>
  <el-tag v-if="label" :type="(item?.cssClass as any) || type" size="small" :effect="effect">
    {{ label }}
  </el-tag>
  <span v-else class="text-secondary">{{ value }}</span>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useDictStore } from '@/stores/dict';

const props = withDefaults(
  defineProps<{
    typeCode: string;
    value: string | number;
    type?: 'primary' | 'success' | 'info' | 'warning' | 'danger';
    effect?: 'light' | 'dark' | 'plain';
  }>(),
  {
    type: 'info',
    effect: 'light',
  },
);

const dict = useDictStore();

onMounted(() => {
  if (!dict.cache[props.typeCode]) dict.get(props.typeCode);
});

const item = computed(() =>
  dict.cache[props.typeCode]?.find((it) => String(it.value) === String(props.value)),
);

const label = computed(() => item.value?.label);
</script>
