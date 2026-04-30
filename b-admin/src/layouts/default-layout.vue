<template>
  <el-container class="app-layout">
    <!-- 左侧 -->
    <el-aside
      class="app-aside"
      :width="appStore.sidebarCollapsed ? 'var(--wm-sidebar-collapsed-width)' : 'var(--wm-sidebar-width)'"
    >
      <SidebarLogo :collapsed="appStore.sidebarCollapsed" />
      <SidebarMenu />
    </el-aside>

    <!-- 右侧 -->
    <el-container>
      <el-header class="app-header" height="56px">
        <NavBar />
      </el-header>
      <Breadcrumb />
      <el-main class="app-main">
        <router-view v-slot="{ Component, route }">
          <transition name="fade-slide" mode="out-in">
            <keep-alive :include="cachedViews">
              <component :is="Component" :key="route.fullPath" />
            </keep-alive>
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import SidebarLogo from './components/sidebar-logo.vue';
import SidebarMenu from './components/sidebar-menu.vue';
import NavBar from './components/nav-bar.vue';
import Breadcrumb from './components/breadcrumb.vue';
import { useAppStore } from '@/stores/app';

const appStore = useAppStore();
// MVP 不做 keep-alive 白名单管理，预留口子
const cachedViews = ref<string[]>([]);
</script>

<style lang="scss" scoped>
.app-layout {
  height: 100vh;
}

.app-aside {
  background: #001428;
  transition: width $transition-slow;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: #fff;
  box-shadow: $shadow-sm;
  padding: 0 $space-md;
  z-index: $z-header;
}

.app-main {
  background: $bg-page;
  padding: 0;
  overflow: auto;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity $transition-base, transform $transition-base;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
