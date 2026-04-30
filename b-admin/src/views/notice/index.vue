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
        <el-form-item label="类型">
          <el-select v-model="query.type" placeholder="全部" clearable style="width: 120px">
            <el-option value="notice" label="公告" />
            <el-option value="news" label="资讯" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 120px">
            <el-option :value="1" label="发布" />
            <el-option :value="0" label="草稿" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="reload">查询</el-button>
          <el-button :icon="RefreshRight" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <div style="margin-bottom: 12px">
        <el-button type="primary" :icon="Plus" @click="handleCreate">新增公告</el-button>
      </div>

      <el-table v-loading="loading" :data="list" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="封面" width="100">
          <template #default="{ row }">
            <el-image
              v-if="row.cover"
              :src="row.cover"
              fit="cover"
              class="thumb"
              :preview-src-list="[row.cover]"
              hide-on-click-modal
            />
            <span v-else class="text-placeholder">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="220">
          <template #default="{ row }">
            <el-tag v-if="row.isTop" type="danger" size="small" effect="light" style="margin-right: 6px">
              置顶
            </el-tag>
            {{ row.title }}
          </template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.type === 'notice' ? 'warning' : 'primary'" effect="light">
              {{ row.type === 'notice' ? '公告' : '资讯' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="views" label="浏览量" width="100" align="right" />
        <el-table-column label="发布时间" width="170">
          <template #default="{ row }">
            {{ row.publishedAt ? formatDate(row.publishedAt) : '—' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" effect="light">
              {{ row.status === 1 ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="warning" @click="handleToggleTop(row)">
              {{ row.isTop ? '取消置顶' : '置顶' }}
            </el-button>
            <el-popconfirm title="确认删除该公告？" @confirm="handleDelete(row)">
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="900px" destroy-on-close top="5vh">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" maxlength="60" />
        </el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="form.type">
            <el-radio value="notice">公告</el-radio>
            <el-radio value="news">资讯</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="封面">
          <ImageUpload v-model="form.cover" prefix="notice" :hint="'选填，建议 750x420'" />
        </el-form-item>
        <el-form-item label="正文" prop="content">
          <RichTextEditor v-model="form.content" height="380px" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :precision="0" />
        </el-form-item>
        <el-form-item label="置顶">
          <el-switch v-model="topBool" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">发布</el-radio>
            <el-radio :value="0">草稿</el-radio>
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
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Search, RefreshRight, Plus } from '@element-plus/icons-vue';

import { noticeApi, type NoticeItem } from '@/api/notice';
import ImageUpload from '@/components/image-upload/index.vue';
import RichTextEditor from '@/components/rich-text-editor/index.vue';
import Pagination from '@/components/pagination/index.vue';
import { formatDate } from '@/utils/format';

const list = ref<NoticeItem[]>([]);
const total = ref(0);
const loading = ref(false);

const query = reactive({
  page: 1,
  pageSize: 20,
  keyword: '',
  type: undefined as string | undefined,
  status: undefined as number | undefined,
});

const dialogVisible = ref(false);
const dialogTitle = ref('');
const formRef = ref<FormInstance>();
const editingId = ref<number | null>(null);
const saving = ref(false);

const form = reactive<Partial<NoticeItem>>({
  title: '',
  type: 'notice',
  cover: '',
  content: '',
  isTop: 0,
  sort: 0,
  status: 1,
});

const topBool = computed({
  get: () => form.isTop === 1,
  set: (v: boolean) => (form.isTop = v ? 1 : 0),
});

const rules: FormRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入正文', trigger: 'change' }],
};

async function loadData() {
  loading.value = true;
  try {
    const res = await noticeApi.page(query);
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
  query.type = undefined;
  query.status = undefined;
  reload();
}

function resetForm() {
  form.title = '';
  form.type = 'notice';
  form.cover = '';
  form.content = '';
  form.isTop = 0;
  form.sort = 0;
  form.status = 1;
  editingId.value = null;
}

function handleCreate() {
  resetForm();
  dialogTitle.value = '新增公告';
  dialogVisible.value = true;
}

function handleEdit(row: NoticeItem) {
  resetForm();
  editingId.value = row.id;
  Object.assign(form, row);
  dialogTitle.value = '编辑公告';
  dialogVisible.value = true;
}

async function handleDelete(row: NoticeItem) {
  await noticeApi.remove(row.id);
  ElMessage.success('已删除');
  loadData();
}

async function handleToggleTop(row: NoticeItem) {
  const next: 0 | 1 = row.isTop === 1 ? 0 : 1;
  await noticeApi.toggleTop(row.id, next);
  row.isTop = next;
  ElMessage.success('已更新');
}

async function onSave() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    saving.value = true;
    try {
      if (editingId.value) {
        await noticeApi.update(editingId.value, form);
      } else {
        await noticeApi.create(form);
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
  width: 80px;
  height: 50px;
  border-radius: $radius-sm;
  background: $bg-hover;
}

.text-placeholder {
  color: $text-placeholder;
}
</style>
