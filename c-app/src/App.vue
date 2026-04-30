<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/user';
import { useDictStore } from '@/store/dict';

onLaunch(() => {
  // #ifdef MP-WEIXIN
  // 启动即隐藏原生 tabBar，避免 switchTab 切页时它先闪一帧再被自定义栏遮住
  uni.hideTabBar({ animation: false });
  // #endif

  // 启动时尝试预热常用字典
  const userStore = useUserStore();
  const dictStore = useDictStore();
  if (userStore.isLogin) {
    userStore.refreshUserInfo().catch(() => {
      // 静默失败：token 可能已过期，业务接口触发后会跳登录
    });
  }
  dictStore.load(['order_status', 'logistics_company']).catch(() => {});
});

onShow(() => {
  // foreground
});

onHide(() => {
  // background
});
</script>

<style lang="scss">
@import '@/styles/index.scss';
</style>
