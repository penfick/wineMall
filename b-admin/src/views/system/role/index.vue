<template>
  <div class="page-container">
    <div class="page-card">
      <el-form inline :model="query" class="table-filter" @submit.prevent>
        <el-form-item label="关键字">
          <el-input
            v-model="query.keyword"
            placeholder="角色名/编码"
            clearable
            style="width: 240px"
            @keyup.enter="reload"
          />
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
        <el-button type="primary" :icon="Plus" @click="handleCreate">新增角色</el-button>
      </div>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="角色名" width="160" />
        <el-table-column prop="code" label="编码" width="160">
          <template #default="{ row }"><span class="mono">{{ row.code }}</span></template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="240" show-overflow-tooltip />
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <StatusTag :value="row.status" />
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="success" @click="openMenuDialog(row)">分配权限</el-button>
            <el-popconfirm title="确认删除？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button link type="danger">删除</el-button>
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

    <!-- 编辑/新增 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="480px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="角色名" prop="name">
          <el-input v-model="form.name" maxlength="20" />
        </el-form-item>
        <el-form-item label="编码" prop="code">
          <el-input v-model="form.code" :disabled="!!editingId" placeholder="如 marketing_manager" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :precision="0" />
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

    <!-- 分配菜单 -->
    <el-dialog v-model="menuDialogVisible" title="分配菜单权限" width="540px" destroy-on-close>
      <div v-loading="menuLoading">
        <el-tree
          ref="menuTreeRef"
          :data="menuTree"
          :props="{ label: 'name', children: 'children' }"
          node-key="id"
          show-checkbox
          default-expand-all
          :default-checked-keys="checkedMenus"
        >
          <template #default="{ data }">
            <span>
              {{ data.name }}
              <el-tag v-if="data.type === 3" type="info" size="small" effect="light" style="margin-left: 8px">按钮</el-tag>
              <el-tag v-else-if="data.type === 2" type="primary" size="small" effect="light" style="margin-left: 8px">页面</el-tag>
            </span>
          </template>
        </el-tree>
      </div>
      <template #footer>
        <el-button @click="menuDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="onAssignMenus">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Search, RefreshRight, Plus } from '@element-plus/icons-vue';

import { roleApi, type RoleItem, type RoleQuery, type CreateRoleDto } from '@/api/role';
import { menuApi } from '@/api/menu';
import type { MenuNode } from '@/api/auth';
import StatusTag from '@/components/status-tag/index.vue';
import Pagination from '@/components/pagination/index.vue';
import { formatDate } from '@/utils/format';

const loading = ref(false);
const list = ref<RoleItem[]>([]);
const total = ref(0);

const query = reactive<RoleQuery>({
  page: 1,
  pageSize: 20,
  keyword: '',
  status: undefined,
});

const dialogVisible = ref(false);
const dialogTitle = ref('');
const formRef = ref<FormInstance>();
const editingId = ref<number | null>(null);
const saving = ref(false);

const form = reactive<CreateRoleDto>({
  name: '',
  code: '',
  description: '',
  sort: 0,
  status: 1,
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入角色名', trigger: 'blur' }],
  code: [
    { required: true, message: '请输入编码', trigger: 'blur' },
    { pattern: /^[a-z0-9_]+$/, message: '小写字母/数字/下划线', trigger: 'blur' },
  ],
};

// 菜单分配
const menuDialogVisible = ref(false);
const menuLoading = ref(false);
const menuTree = ref<MenuNode[]>([]);
const checkedMenus = ref<number[]>([]);
const assigningRoleId = ref<number | null>(null);
const menuTreeRef = ref();

async function loadList() {
  loading.value = true;
  try {
    const res = await roleApi.page(query);
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
  query.status = undefined;
  reload();
}

function resetForm() {
  form.name = '';
  form.code = '';
  form.description = '';
  form.sort = 0;
  form.status = 1;
  editingId.value = null;
}

function handleCreate() {
  resetForm();
  dialogTitle.value = '新增角色';
  dialogVisible.value = true;
}

function handleEdit(row: RoleItem) {
  resetForm();
  editingId.value = row.id;
  Object.assign(form, {
    name: row.name,
    code: row.code,
    description: row.description || '',
    sort: row.sort,
    status: row.status,
  });
  dialogTitle.value = '编辑角色';
  dialogVisible.value = true;
}

async function handleDelete(row: RoleItem) {
  await roleApi.remove(row.id);
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
        await roleApi.update(editingId.value, form);
      } else {
        await roleApi.create(form);
      }
      ElMessage.success('保存成功');
      dialogVisible.value = false;
      loadList();
    } finally {
      saving.value = false;
    }
  });
}

async function openMenuDialog(row: RoleItem) {
  assigningRoleId.value = row.id;
  menuDialogVisible.value = true;
  menuLoading.value = true;
  try {
    const [tree, detail] = await Promise.all([
      menuApi.tree(),
      roleApi.detail(row.id),
    ]);
    menuTree.value = tree;
    checkedMenus.value = detail.menuIds || [];
  } finally {
    menuLoading.value = false;
  }
}

async function onAssignMenus() {
  if (!assigningRoleId.value || !menuTreeRef.value) return;
  const checked = menuTreeRef.value.getCheckedKeys() as number[];
  const halfChecked = menuTreeRef.value.getHalfCheckedKeys() as number[];
  const allIds = [...checked, ...halfChecked];
  saving.value = true;
  try {
    await roleApi.assignMenus(assigningRoleId.value, { menuIds: allIds });
    ElMessage.success('已保存');
    menuDialogVisible.value = false;
  } finally {
    saving.value = false;
  }
}

onMounted(loadList);
</script>
