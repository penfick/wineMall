<template>
  <div class="page-container">
    <div class="page-card">
      <h2 class="page-title">修改密码</h2>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px" style="max-width: 480px">
        <el-form-item label="当前密码" prop="oldPassword">
          <el-input v-model="form.oldPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="form.newPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="form.confirmPassword" type="password" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="onSubmit">保存修改</el-button>
        </el-form-item>
        <el-alert type="info" :closable="false">
          密码至少 8 位，须包含大写字母、小写字母、数字、特殊符号中的至少 3 类
        </el-alert>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';

import { authApi } from '@/api/auth';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const user = useUserStore();

const formRef = ref<FormInstance>();
const saving = ref(false);

const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const rules: FormRules = {
  oldPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 8, max: 32, message: '密码长度 8-32 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_, value, callback) => {
        if (value !== form.newPassword) callback(new Error('两次密码不一致'));
        else callback();
      },
      trigger: 'blur',
    },
  ],
};

async function onSubmit() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    saving.value = true;
    try {
      await authApi.changePassword({
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
      });
      ElMessage.success('密码修改成功，请重新登录');
      await user.logout();
      router.replace('/login');
    } finally {
      saving.value = false;
    }
  });
}
</script>

<style lang="scss" scoped>
.page-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 24px;
  color: $text-primary;
}
</style>
