<template>
  <!-- 目录（带子菜单）-->
  <el-sub-menu v-if="hasChildren" :index="subMenuIndex">
    <template #title>
      <el-icon v-if="item.icon">
        <component :is="item.icon" />
      </el-icon>
      <span>{{ item.name }}</span>
    </template>
    <SidebarItem
      v-for="child in childMenus"
      :key="child.id"
      :item="child"
      :base-path="resolvePath(item.path)"
    />
  </el-sub-menu>

  <!-- 叶子菜单 -->
  <el-menu-item v-else :index="resolvePath(item.path)">
    <el-icon v-if="item.icon">
      <component :is="item.icon" />
    </el-icon>
    <template #title>{{ item.name }}</template>
  </el-menu-item>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MenuNode } from '@/api/auth';

const props = defineProps<{
  item: MenuNode;
  basePath: string;
}>();

const childMenus = computed(
  () =>
    props.item.children?.filter(
      (c) => c.type !== 3 && c.visible !== 0 && c.status !== 0,
    ) ?? [],
);

const hasChildren = computed(() => childMenus.value.length > 0);

const subMenuIndex = computed(() => {
  const p = resolvePath(props.item.path);
  return p || `__menu_${props.item.id}`;
});

function resolvePath(path?: string) {
  if (!path) return '';
  if (/^https?:/.test(path)) return path;
  if (path.startsWith('/')) return path;
  if (!props.basePath) return `/${path}`;
  return `${props.basePath.replace(/\/$/, '')}/${path}`.replace(/\/+/g, '/');
}
</script>
