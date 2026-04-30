<template>
  <div class="page-container">
    <div class="page-card">
      <el-form inline :model="query" class="table-filter" @submit.prevent>
        <el-form-item label="关键字">
          <el-input
            v-model="query.keyword"
            placeholder="用户名/昵称"
            clearable
            style="width: 200px"
            @keyup.enter="reload"
          />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="query.roleId" placeholder="全部" clearable style="width: 160px">
            <el-option v-for="r in roles" :key="r.id" :value="r.id" :label="r.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 120px">
            <el-option :value="1" label="启用" />
            <el-option :value="0" label="禁用" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="reload">查询</el-button>
          <el-button :icon="RefreshRight" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <div style="margin-bottom: 12px">
        <el-button type="primary" :icon="Plus" @click="handleCreate">新增管理员</el-button>
      </div>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="头像" width="80">
          <template #default="{ row }">
            <el-avatar :src="row.avatar" :size="36">{{ row.nickname?.[0] }}</el-avatar>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="用户名" width="140" />
        <el-table-column prop="nickname" label="昵称" width="140" />
        <el-table-column label="角色" min-width="200">
          <template #default="{ row }">
            <el-tag
              v-for="r in row.roles"
              :key="r.id"
              size="small"
              effect="light"
              style="margin-right: 4px"
            >
              {{ r.name }}
            </el-tag>
            <el-tag v-if="row.isSuper" type="danger" size="small" effect="light">超管</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="联系" min-width="200">
          <template #default="{ row }">
            <div class="text-secondary">{{ row.email || '—' }}</div>
            <div class="text-secondary tabular-nums">{{ row.phone || '—' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="最近登录" width="170">
          <template #default="{ row }">
            <div>{{ row.lastLoginAt ? formatDate(row.lastLoginAt) : '—' }}</div>
            <div class="text-secondary mono">{{ row.lastLoginIp || '' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <StatusTag :value="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="warning" @click="handleResetPwd(row)">重置密码</el-button>
            <el-button
              link
              :type="row.status === 1 ? 'danger' : 'success'"
              :disabled="row.isSuper"
              @click="onToggle(row)"
            >
              {{ row.status === 1 ? '禁用' : '启用' }}
            </el-button>
            <el-popconfirm title="确认删除？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button link type="danger" :disabled="row.isSuper">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <Pagination
        :total="total"
        :page="query.page!"
        :page-size="query.pageSize!"
        @update:page="(v) => (query.page = v)"
        @update:page-size="(v) => (query.pageSize = v)"
        @change="loadList"
      />
    </div>

    <!-- 新增/编辑 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item v-if="!editingId" label="用户名" prop="username">
          <el-input v-model="form.username" maxlength="20" />
        </el-form-item>
        <el-form-item v-if="!editingId" label="初始密码" prop="password">
          <el-input v-model="form.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="form.nickname" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item label="手机">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="角色" prop="roleIds">
          <el-select v-model="form.roleIds" multiple placeholder="请选择角色" style="width: 100%">
            <el-option v-for="r in roles" :key="r.id" :value="r.id" :label="r.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Search, RefreshRight, Plus } from '@element-plus/icons-vue';

import { adminApi, type AdminItem, type AdminQuery, type CreateAdminDto } from '@/api/admin';
import { roleApi, type RoleItem } from '@/api/role';
import StatusTag from '@/components/status-tag/index.vue';
import Pagination from '@/components/pagination/index.vue';
import { formatDate } from '@/utils/format';

const loading = ref(false);
const list = ref<AdminItem[]>([]);
const total = ref(0);
const roles = ref<RoleItem[]>([]);

const query = reactive<AdminQuery>({
  page: 1,
  pageSize: 20,
  keyword: '',
  roleId: undefined,
  status: undefined,
});

const dialogVisible = ref(false);
const dialogTitle = ref('');
const formRef = ref<FormInstance>();
const editingId = ref<number | null>(null);
const saving = ref(false);

const form = reactive<CreateAdminDto>({
  username: '',
  password: '',
  nickname: '',
  email: '',
  phone: '',
  status: 1,
  roleIds: [],
});

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, min: 8, message: '至少 8 位', trigger: 'blur' }],
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  roleIds: [
    { required: true, type: 'array', min: 1, message: '至少选择一个角色', trigger: 'change' },
  ],
};

async function loadList() {
  loading.value = true;
  try {
    const res = await adminApi.page(query);
    list.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function reload() {
  query.page = 1;
  loadList();
}

function resetQuery() {
  query.keyword = '';
  query.roleId = undefined;
  query.status = undefined;
  reload();
}

function resetForm() {
  form.username = '';
  form.password = '';
  form.nickname = '';
  form.email = '';
  form.phone = '';
  form.status = 1;
  form.roleIds = [];
  editingId.value = null;
}

function handleCreate() {
  resetForm();
  dialogTitle.value = '新增管理员';
  dialogVisible.value = true;
}

function handleEdit(row: AdminItem) {
  resetForm();
  editingId.value = row.id;
  form.nickname = row.nickname;
  form.email = row.email || '';
  form.phone = row.phone || '';
  form.status = row.status;
  form.roleIds = row.roles.map((r) => r.id);
  dialogTitle.value = '编辑管理员';
  dialogVisible.value = true;
}

async function handleResetPwd(row: AdminItem) {
  const { value: pwd } = await ElMessageBox.prompt('请输入新密码（至少 8 位）', '重置密码', {
    inputType: 'password',
    inputValidator: (v: string) => (v.length >= 8 ? true : '密码至少 8 位'),
  });
  await adminApi.resetPassword(row.id, { newPassword: pwd });
  ElMessage.success('密码已重置');
}

async function onToggle(row: AdminItem) {
  const next = (row.status === 1 ? 0 : 1) as 0 | 1;
  await adminApi.toggleStatus(row.id, next);
  ElMessage.success('已更新');
  loadList();
}

async function handleDelete(row: AdminItem) {
  await adminApi.remove(row.id);
  ElMessage.success('已删除');
  loadList();
}

async function onSave() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    saving.value = true;
    try {
      if (editingId.value) {
        await adminApi.update(editingId.value, {
          nickname: form.nickname,
          email: form.email,
          phone: form.phone,
          status: form.status,
          roleIds: form.roleIds,
        });
      } else {
        await adminApi.create(form);
      }
      ElMessage.success('保存成功');
      dialogVisible.value = false;
      loadList();
    } finally {
      saving.value = false;
    }
  });
}

onMounted(async () => {
  roles.value = await roleApi.all();
  loadList();
});
</script>

<style lang="scss" scoped>
.text-secondary {
  color: $text-placeholder;
  font-size: 12px;
}
</style>
