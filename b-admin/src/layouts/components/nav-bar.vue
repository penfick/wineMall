<template>
  <div class="nav-bar">
    <div class="nav-left">
      <el-icon class="collapse-btn" :size="20" @click="appStore.toggleSidebar">
        <Fold v-if="!appStore.sidebarCollapsed" />
        <Expand v-else />
      </el-icon>
    </div>

    <div class="nav-right">
      <el-tooltip content="刷新">
        <el-icon class="nav-icon" :size="18" @click="reload">
          <Refresh />
        </el-icon>
      </el-tooltip>

      <el-tooltip content="全屏">
        <el-icon class="nav-icon" :size="18" @click="toggleFullScreen">
          <FullScreen />
        </el-icon>
      </el-tooltip>

      <el-dropdown trigger="click" @command="onCommand">
        <div class="user-info cursor-pointer">
          <el-avatar :size="28" :src="user.profile?.avatar">
            {{ user.profile?.nickname?.[0] }}
          </el-avatar>
          <span class="nickname">{{ user.profile?.nickname || user.profile?.username }}</span>
          <el-icon><ArrowDown /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">
              <el-icon><User /></el-icon>个人信息
            </el-dropdown-item>
            <el-dropdown-item command="password">
              <el-icon><Key /></el-icon>修改密码
            </el-dropdown-item>
            <el-dropdown-item command="logout" divided>
              <el-icon><SwitchButton /></el-icon>退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ElMessageBox } from 'element-plus';
import {
  Fold,
  Expand,
  Refresh,
  FullScreen,
  ArrowDown,
  User,
  Key,
  SwitchButton,
} from '@element-plus/icons-vue';

import { useAppStore } from '@/stores/app';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const appStore = useAppStore();
const user = useUserStore();

function reload() {
  location.reload();
}

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

async function onCommand(cmd: string) {
  if (cmd === 'profile') return router.push('/profile');
  if (cmd === 'password') return router.push('/change-password');
  if (cmd === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' });
      await user.logout();
      router.replace('/login');
    } catch {
      /* 取消 */
    }
  }
}
</script>

<style lang="scss" scoped>
.nav-bar {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-left {
  display: flex;
  align-items: center;
}

.collapse-btn {
  cursor: pointer;
  padding: 6px;
  border-radius: $radius-base;
  transition: background $transition-fast;

  &:hover {
    background: $bg-hover;
  }
}

.nav-right {
  display: flex;
  align-items: center;
  gap: $space-md;
}

.nav-icon {
  cursor: pointer;
  padding: 6px;
  border-radius: $radius-base;
  color: $text-regular;
  transition: background $transition-fast;

  &:hover {
    background: $bg-hover;
    color: $color-primary;
  }
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: $radius-base;
  transition: background $transition-fast;

  &:hover {
    background: $bg-hover;
  }

  .nickname {
    font-size: 14px;
    color: $text-primary;
  }
}
</style>
