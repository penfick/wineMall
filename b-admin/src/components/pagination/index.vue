<template>
  <el-pagination
    class="wm-pagination"
    background
    :current-page="page ?? 1"
    :page-size="pageSize ?? 20"
    :total="total"
    :page-sizes="pageSizes"
    layout="total, sizes, prev, pager, next, jumper"
    @update:current-page="onPage"
    @update:page-size="onSize"
  />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    page?: number;
    pageSize?: number;
    total: number;
    pageSizes?: number[];
  }>(),
  {
    page: 1,
    pageSize: 20,
    pageSizes: () => [10, 20, 50, 100],
  },
);

const emit = defineEmits<{
  (e: 'update:page', val: number): void;
  (e: 'update:pageSize', val: number): void;
  (e: 'change'): void;
}>();

function onPage(val: number) {
  emit('update:page', val);
  emit('change');
}

function onSize(val: number) {
  emit('update:pageSize', val);
  // 改 size 时回到第一页
  emit('update:page', 1);
  emit('change');
}
</script>

<style lang="scss" scoped>
.wm-pagination {
  justify-content: flex-end;
}
</style>
