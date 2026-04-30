<template>
  <div v-if="crumbs.length" class="breadcrumb">
    <el-breadcrumb separator="/">
      <el-breadcrumb-item v-for="(c, i) in crumbs" :key="i">
        {{ c }}
      </el-breadcrumb-item>
    </el-breadcrumb>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const crumbs = computed(() =>
  route.matched
    .filter((m) => m.meta?.title)
    .map((m) => m.meta.title as string),
);
</script>

<style lang="scss" scoped>
.breadcrumb {
  padding: 0 $space-md;
  height: $breadcrumb-height;
  display: flex;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid $border-lighter;
  font-size: $font-size-sm;
}
</style>
