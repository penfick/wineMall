<template>
  <div class="page-container">
    <div class="page-card">
      <el-form inline :model="query" class="table-filter" @submit.prevent>
        <el-form-item label="名称/编码">
          <el-input
            v-model="query.keyword"
            placeholder="请输入"
            clearable
            style="width: 200px"
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
        <el-button type="primary" :icon="Plus" @click="handleCreate">新增物流公司</el-button>
      </div>

      <el-table v-loading="loading" :data="list" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="code" label="编码" width="140" />
        <el-table-column prop="name" label="公司名称" min-width="160" />
        <el-table-column prop="contact" label="联系人" width="120" />
        <el-table-column prop="phone" label="联系电话" width="140" />
        <el-table-column label="查询地址" min-width="220">
          <template #default="{ row }">
            <el-link v-if="row.trackUrl" type="primary" :href="row.trackUrl" target="_blank">
              {{ row.trackUrl }}
            </el-link>
            <span v-else class="text-placeholder">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <StatusTag :value="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-popconfirm title="确认删除？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <Pagination
        v-model:page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        @change="loadData"
      />
    </div>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="编码" prop="code">
          <el-input v-model="form.code" maxlength="30" placeholder="如 SF / YTO" />
        </el-form-item>
        <el-form-item label="公司名称" prop="name">
          <el-input v-model="form.name" maxlength="30" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="form.contact" maxlength="20" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.phone" maxlength="20" />
        </el-form-item>
        <el-form-item label="查询地址">
          <el-input v-model="form.trackUrl" placeholder="https://..." />
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Search, RefreshRight, Plus } from '@element-plus/icons-vue';

import { logisticsApi, type LogisticsCompany } from '@/api/logistics';
import StatusTag from '@/components/status-tag/index.vue';
import Pagination from '@/components/pagination/index.vue';

const list = ref<LogisticsCompany[]>([]);
const total = ref(0);
const loading = ref(false);

const query = reactive({
  page: 1,
  pageSize: 20,
  keyword: '',
  status: undefined as number | undefined,
});

const dialogVisible = ref(false);
const dialogTitle = ref('');
const formRef = ref<FormInstance>();
const editingId = ref<number | null>(null);
const saving = ref(false);

const form = reactive<Partial<LogisticsCompany>>({
  code: '',
  name: '',
  contact: '',
  phone: '',
  trackUrl: '',
  sort: 0,
  status: 1,
});

const rules: FormRules = {
  code: [{ required: true, message: '请输入编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
};

async function loadData() {
  loading.value = true;
  try {
    const res = await logisticsApi.companyPage(query);
    list.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function reload() {
  query.page = 1;
  loadData();
}

function resetQuery() {
  query.keyword = '';
  query.status = undefined;
  reload();
}

function resetForm() {
  form.code = '';
  form.name = '';
  form.contact = '';
  form.phone = '';
  form.trackUrl = '';
  form.sort = 0;
  form.status = 1;
  editingId.value = null;
}

function handleCreate() {
  resetForm();
  dialogTitle.value = '新增物流公司';
  dialogVisible.value = true;
}

function handleEdit(row: LogisticsCompany) {
  resetForm();
  editingId.value = row.id;
  Object.assign(form, row);
  dialogTitle.value = '编辑物流公司';
  dialogVisible.value = true;
}

async function handleDelete(row: LogisticsCompany) {
  await logisticsApi.companyRemove(row.id);
  ElMessage.success('已删除');
  loadData();
}

async function onSave() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    saving.value = true;
    try {
      if (editingId.value) {
        await logisticsApi.companyUpdate(editingId.value, form);
      } else {
        await logisticsApi.companyCreate(form);
      }
      ElMessage.success('保存成功');
      dialogVisible.value = false;
      loadData();
    } finally {
      saving.value = false;
    }
  });
}

onMounted(loadData);
</script>

<style lang="scss" scoped>
.text-placeholder {
  color: $text-placeholder;
}
</style>
