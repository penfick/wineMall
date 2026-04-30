/**
 * 应用层 store — 布局/主题/全局开关
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';

import { StorageKey } from '@/constants/storage-key';

export const useAppStore = defineStore(
  'app',
  () => {
    const sidebarCollapsed = ref(false);
    const fullscreenContent = ref(false);
    const pageLoading = ref(false);

    function toggleSidebar() {
      sidebarCollapsed.value = !sidebarCollapsed.value;
    }

    function toggleFullscreen() {
      fullscreenContent.value = !fullscreenContent.value;
    }

    return {
      sidebarCollapsed,
      fullscreenContent,
      pageLoading,
      toggleSidebar,
      toggleFullscreen,
    };
  },
  {
    persist: {
      key: StorageKey.SIDEBAR_COLLAPSED,
      storage: localStorage,
      paths: ['sidebarCollapsed'],
    },
  },
);
