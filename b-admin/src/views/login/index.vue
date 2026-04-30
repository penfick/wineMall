<template>
  <div class="login-page">
    <div class="login-bg"></div>
    <div class="login-card">
      <div class="login-brand">
        <div class="brand-logo">优</div>
        <h1 class="brand-title">优选商城后台</h1>
        <p class="brand-subtitle">运营管理 · 商品 · 订单 · 数据</p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        size="large"
        @keyup.enter="onSubmit"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="用户名"
            :prefix-icon="User"
            clearable
            autocomplete="username"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            :prefix-icon="Lock"
            show-password
            autocomplete="current-password"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            class="submit-btn"
            @click="onSubmit"
          >
            登 录
          </el-button>
        </el-form-item>
      </el-form>

      <p class="login-hint">默认账号 admin / Init@123456 （首次登录请尽快修改密码）</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { User, Lock } from '@element-plus/icons-vue';

import { useUserStore } from '@/stores/user';
import { usePermissionStore } from '@/stores/permission';

const router = useRouter();
const route = useRoute();
const user = useUserStore();
const permission = usePermissionStore();

const formRef = ref<FormInstance>();
const loading = ref(false);

const form = reactive({
  username: 'admin',
  password: '',
});

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 32, message: '密码长度 6-32 位', trigger: 'blur' },
  ],
};

async function onSubmit() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    loading.value = true;
    try {
      await user.login(form);
      // 触发动态路由重新加载
      permission.reset();
      ElMessage.success('登录成功');
      const redirect = (route.query.redirect as string) || '/';
      await router.replace(redirect);
    } finally {
      loading.value = false;
    }
  });
}
</script>

<style lang="scss" scoped>
.login-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(135deg, #001428 0%, #003a8c 50%, #001428 100%);
}

.login-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 30%, rgba(64, 158, 255, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(249, 115, 22, 0.1) 0%, transparent 50%);
  pointer-events: none;
}

.login-card {
  position: relative;
  width: 380px;
  padding: 40px 36px 32px;
  background: #fff;
  border-radius: $radius-lg;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.25);
}

.login-brand {
  text-align: center;
  margin-bottom: 28px;

  .brand-logo {
    width: 56px;
    height: 56px;
    border-radius: $radius-md;
    background: $color-primary;
    color: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    font-weight: 700;
    margin-bottom: 12px;
  }

  .brand-title {
    font-size: 20px;
    margin: 0;
    color: $text-primary;
    font-weight: 600;
  }

  .brand-subtitle {
    font-size: 13px;
    color: $text-secondary;
    margin: 6px 0 0;
  }
}

.submit-btn {
  width: 100%;
  height: 44px;
  font-size: 15px;
  letter-spacing: 4px;
}

.login-hint {
  text-align: center;
  font-size: 12px;
  color: $text-secondary;
  margin: 8px 0 0;
}
</style>
