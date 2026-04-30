<template>
  <div class="error-page">
    <div class="error-content">
      <h1>404</h1>
      <p>抱歉，您访问的页面不存在</p>
      <el-button type="primary" @click="back">返回首页</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();
const back = () => router.push('/');
</script>

<style lang="scss" scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $bg-page;
}
.error-content {
  text-align: center;
  h1 {
    font-size: 96px;
    color: $color-primary;
    margin: 0;
    font-family: $font-family-mono;
    font-weight: 600;
  }
  p {
    color: $text-secondary;
    margin: 16px 0 24px;
  }
}
</style>
