<template>
  <el-scrollbar class="sidebar-scroll">
    <el-menu
      :default-active="activePath"
      :collapse="appStore.sidebarCollapsed"
      :collapse-transition="false"
      background-color="#001428"
      text-color="#bfcbd9"
      active-text-color="#ffffff"
      router
      unique-opened
      class="sidebar-menu"
      style="--el-menu-base-level-padding: 20px; --el-menu-level-padding: 20px;"
    >
      <SidebarItem
        v-for="item in visibleMenus"
        :key="item.id"
        :item="item"
        :base-path="''"
      />
    </el-menu>
  </el-scrollbar>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import SidebarItem from './sidebar-item.vue';
import { useAppStore } from '@/stores/app';
import { usePermissionStore } from '@/stores/permission';

const route = useRoute();
const appStore = useAppStore();
const permission = usePermissionStore();

const activePath = computed(() => (route.meta?.activeMenu as string | undefined) || route.path);

const visibleMenus = computed(() =>
  permission.menuTree.filter((m) => m.type !== 3 && m.visible !== 0 && m.status !== 0),
);
</script>

<style lang="scss" scoped>
.sidebar-scroll {
  flex: 1;
  height: calc(100vh - var(--wm-header-height));
}

.sidebar-menu {
  border-right: none;
  width: var(--wm-sidebar-width);

  &.el-menu--collapse {
    width: var(--wm-sidebar-collapsed-width);
  }
}
</style>

<style lang="scss">
// 注意：菜单内部的嵌套 ul/li 不带 scoped data-v 属性，
// 必须用全局样式才能稳定命中。
.sidebar-menu {
  .el-menu-item,
  .el-sub-menu__title {
    height: 44px !important;
    line-height: 44px !important;
  }

  // 父菜单有图标占位（约 24px），子菜单没图标。
  // 为了视觉对齐 + 拉开层级感，子菜单的 padding-left 要在父级基础上 +24px（图标补偿）+ 缩进量。

  // 一级 sub-menu 标题（有图标）= 20px
  .el-sub-menu > .el-sub-menu__title {
    padding-left: 20px !important;
  }
  // 一级菜单项（无子菜单的叶子，自带图标）= 20px
  & > .el-menu-item {
    padding-left: 20px !important;
  }

  // 二级（一级 sub-menu 内部的叶子）= 父 padding 20 + 图标补偿 24 + 缩进 20 ≈ 64px
  .el-sub-menu .el-menu-item,
  .el-sub-menu .el-sub-menu > .el-sub-menu__title {
    padding-left: 64px !important;
  }

  // 三级 = 64 + 缩进 20 = 84px（如果出现）
  .el-sub-menu .el-sub-menu .el-menu-item,
  .el-sub-menu .el-sub-menu .el-sub-menu > .el-sub-menu__title {
    padding-left: 84px !important;
  }

  // 二级及以下背景比一级深
  .el-menu .el-menu {
    background: #000c17 !important;
  }

  .el-menu-item.is-active {
    background: #1890ff !important;
  }

  .el-menu-item:hover,
  .el-sub-menu__title:hover {
    background: #00203f !important;
  }
}
</style>
