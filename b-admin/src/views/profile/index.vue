<template>
  <div class="page-container">
    <div class="page-card">
      <h2 class="page-title">个人信息</h2>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px" style="max-width: 520px">
        <el-form-item label="头像">
          <ImageUpload v-model="form.avatar" prefix="avatar" />
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="form.username" disabled />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="form.nickname" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="可选" />
        </el-form-item>
        <el-form-item label="手机" prop="phone">
          <el-input v-model="form.phone" placeholder="可选" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';

import ImageUpload from '@/components/image-upload/index.vue';
import { authApi } from '@/api/auth';
import { useUserStore } from '@/stores/user';

const user = useUserStore();
const formRef = ref<FormInstance>();
const saving = ref(false);

const form = reactive({
  username: '',
  nickname: '',
  avatar: '',
  email: '',
  phone: '',
});

const rules: FormRules = {
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }],
};

onMounted(async () => {
  const data = await authApi.profile();
  Object.assign(form, {
    username: data.username,
    nickname: data.nickname || '',
    avatar: data.avatar || '',
    email: data.email || '',
    phone: data.phone || '',
  });
});

async function onSave() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    saving.value = true;
    try {
      await authApi.updateProfile({
        nickname: form.nickname,
        avatar: form.avatar,
        email: form.email,
        phone: form.phone,
      });
      await user.fetchProfile();
      ElMessage.success('保存成功');
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
