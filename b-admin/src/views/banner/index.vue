<template>
  <div class="page-container">
    <div class="page-card">
      <el-form inline :model="query" class="table-filter" @submit.prevent>
        <el-form-item label="标题">
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
        <el-button type="primary" :icon="Plus" @click="handleCreate">新增 Banner</el-button>
      </div>

      <el-table v-loading="loading" :data="list" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="图片" width="160">
          <template #default="{ row }">
            <el-image :src="row.image" fit="cover" class="thumb" :preview-src-list="[row.image]" hide-on-click-modal />
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="180" />
        <el-table-column label="跳转" min-width="200">
          <template #default="{ row }">
            <el-tag size="small" effect="light">{{ JUMP_TEXT[row.jumpType] }}</el-tag>
            <span v-if="row.jumpTarget" class="text-secondary" style="margin-left: 6px">
              {{ row.jumpTarget }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column label="生效期" min-width="200">
          <template #default="{ row }">
            <div class="text-secondary">{{ row.startAt ? formatDate(row.startAt, 'YYYY-MM-DD') : '不限' }}</div>
            <div class="text-secondary">至 {{ row.endAt ? formatDate(row.endAt, 'YYYY-MM-DD') : '不限' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 1"
              @change="(v: unknown) => handleToggle(row, v ? 1 : 0)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-popconfirm title="确认删除该 Banner？" @confirm="handleDelete(row)">
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="640px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" maxlength="40" />
        </el-form-item>
        <el-form-item label="图片" prop="image">
          <ImageUpload v-model="form.image" prefix="banner" :hint="'建议 750x350'" />
        </el-form-item>
        <el-form-item label="跳转类型">
          <el-radio-group v-model="form.jumpType">
            <el-radio value="none">无跳转</el-radio>
            <el-radio value="goods">商品</el-radio>
            <el-radio value="category">分类</el-radio>
            <el-radio value="url">外链</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.jumpType !== 'none'" label="跳转目标">
          <el-input
            v-model="form.jumpTarget"
            :placeholder="
              form.jumpType === 'url' ? 'https://...' : form.jumpType === 'goods' ? '商品 ID' : '分类 ID'
            "
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :precision="0" />
        </el-form-item>
        <el-form-item label="生效期">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            value-format="YYYY-MM-DD HH:mm:ss"
            unlink-panels
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
          />
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
import { onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Search, RefreshRight, Plus } from '@element-plus/icons-vue';

import { bannerApi, type BannerItem } from '@/api/banner';
import ImageUpload from '@/components/image-upload/index.vue';
import Pagination from '@/components/pagination/index.vue';
import { formatDate } from '@/utils/format';

const JUMP_TEXT: Record<string, string> = {
  none: '无跳转',
  goods: '商品',
  category: '分类',
  url: '外链',
};

const list = ref<BannerItem[]>([]);
const total = ref(0);
const loading = ref(false);

const query = reactive({
  page: 1,
  pageSize: 20,
  keyword: '',
  status: undefined as number | undefined,
  position: 'home',
});

const dialogVisible = ref(false);
const dialogTitle = ref('');
const formRef = ref<FormInstance>();
const editingId = ref<number | null>(null);
const saving = ref(false);

const form = reactive<Partial<BannerItem>>({
  title: '',
  image: '',
  jumpType: 'none',
  jumpTarget: '',
  position: 'home',
  sort: 0,
  status: 1,
});

const dateRange = ref<[string, string] | null>(null);

watch(dateRange, (val) => {
  form.startAt = val?.[0];
  form.endAt = val?.[1];
});

const rules: FormRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  image: [{ required: true, message: '请上传图片', trigger: 'change' }],
};

async function loadData() {
  loading.value = true;
  try {
    const res = await bannerApi.page(query);
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
  form.title = '';
  form.image = '';
  form.jumpType = 'none';
  form.jumpTarget = '';
  form.position = 'home';
  form.sort = 0;
  form.status = 1;
  form.startAt = undefined;
  form.endAt = undefined;
  dateRange.value = null;
  editingId.value = null;
}

function handleCreate() {
  resetForm();
  dialogTitle.value = '新增 Banner';
  dialogVisible.value = true;
}

function handleEdit(row: BannerItem) {
  resetForm();
  editingId.value = row.id;
  Object.assign(form, row);
  if (row.startAt && row.endAt) dateRange.value = [row.startAt, row.endAt];
  dialogTitle.value = '编辑 Banner';
  dialogVisible.value = true;
}

async function handleDelete(row: BannerItem) {
  await bannerApi.remove(row.id);
  ElMessage.success('已删除');
  loadData();
}

async function handleToggle(row: BannerItem, status: 0 | 1) {
  await bannerApi.toggleStatus(row.id, status);
  row.status = status;
  ElMessage.success('已更新');
}

async function onSave() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    saving.value = true;
    try {
      if (editingId.value) {
        await bannerApi.update(editingId.value, form);
      } else {
        await bannerApi.create(form);
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
.thumb {
  width: 140px;
  height: 60px;
  border-radius: $radius-sm;
  background: $bg-hover;
}

.text-secondary {
  color: $text-placeholder;
  font-size: 12px;
}
</style>
