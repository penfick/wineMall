<template>
  <div class="sidebar-logo" :class="{ collapsed }">
    <div class="logo">优</div>
    <span v-if="!collapsed" class="title">优选商城后台</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ collapsed: boolean }>();
</script>

<style lang="scss" scoped>
.sidebar-logo {
  height: var(--wm-header-height);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  background: #001428;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);

  .logo {
    width: 32px;
    height: 32px;
    border-radius: $radius-base;
    background: $color-primary;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    flex-shrink: 0;
  }

  .title {
    font-size: 15px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
  }

  &.collapsed {
    padding: 0;
    justify-content: center;
  }
}
</style>
