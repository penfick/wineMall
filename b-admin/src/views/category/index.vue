<template>
  <div class="page-container">
    <div class="page-card">
      <div class="flex-between" style="margin-bottom: 16px">
        <el-input
          v-model="keyword"
          placeholder="搜索分类名称"
          clearable
          style="width: 260px"
          :prefix-icon="Search"
          @input="onSearch"
        />
        <el-button type="primary" :icon="Plus" @click="handleCreate(undefined)">新增一级分类</el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="filtered"
        row-key="id"
        :default-expand-all="!!keyword"
        :tree-props="{ children: 'children' }"
        border
      >
        <el-table-column prop="name" label="分类名称" min-width="240" />
        <el-table-column label="层级" width="80">
          <template #default="{ row }">L{{ row.level }}</template>
        </el-table-column>
        <el-table-column label="图标" width="80">
          <template #default="{ row }">
            <el-image
              v-if="row.icon"
              :src="row.icon"
              fit="cover"
              style="width: 32px; height: 32px; border-radius: 4px"
            />
            <span v-else class="text-secondary">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <StatusTag :value="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.level < 3" link type="primary" @click="handleCreate(row)">
              添加子分类
            </el-button>
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-popconfirm title="确认删除该分类？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 编辑/新增对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="520px"
      destroy-on-close
      align-center
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="父级">
          <el-input :model-value="parentName" disabled />
        </el-form-item>
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="form.name" maxlength="32" show-word-limit />
        </el-form-item>
        <el-form-item label="图标">
          <ImageUpload v-model="form.icon" prefix="category/icon" />
        </el-form-item>
        <el-form-item label="Banner">
          <ImageUpload v-model="form.banner" prefix="category/banner" />
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
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Search, Plus } from '@element-plus/icons-vue';

import { categoryApi, type CategoryNode, type CreateCategoryDto } from '@/api/category';
import StatusTag from '@/components/status-tag/index.vue';
import ImageUpload from '@/components/image-upload/index.vue';

const loading = ref(false);
const tree = ref<CategoryNode[]>([]);
const keyword = ref('');

const dialogVisible = ref(false);
const dialogTitle = ref('');
const formRef = ref<FormInstance>();
const editingId = ref<number | null>(null);
const parentNode = ref<CategoryNode | null>(null);
const saving = ref(false);

const form = reactive<CreateCategoryDto>({
  parentId: 0,
  name: '',
  icon: '',
  banner: '',
  sort: 0,
  status: 1,
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
};

const parentName = computed(() => parentNode.value?.name || '顶级分类');

function filterTree(nodes: CategoryNode[], kw: string): CategoryNode[] {
  if (!kw) return nodes;
  const result: CategoryNode[] = [];
  for (const n of nodes) {
    const children = n.children ? filterTree(n.children, kw) : [];
    if (n.name.includes(kw) || children.length) {
      result.push({ ...n, children });
    }
  }
  return result;
}

const filtered = computed(() => filterTree(tree.value, keyword.value));

let searchTimer: ReturnType<typeof setTimeout> | null = null;
function onSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    /* computed 自动响应 */
  }, 200);
}

async function loadTree() {
  loading.value = true;
  try {
    tree.value = await categoryApi.tree();
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.parentId = 0;
  form.name = '';
  form.icon = '';
  form.banner = '';
  form.sort = 0;
  form.status = 1;
  editingId.value = null;
  parentNode.value = null;
}

function handleCreate(parent?: CategoryNode) {
  resetForm();
  parentNode.value = parent || null;
  form.parentId = parent?.id || 0;
  dialogTitle.value = parent ? `添加 [${parent.name}] 的子分类` : '新增一级分类';
  dialogVisible.value = true;
}

function handleEdit(row: CategoryNode) {
  resetForm();
  editingId.value = row.id;
  Object.assign(form, {
    parentId: row.parentId,
    name: row.name,
    icon: row.icon || '',
    banner: row.banner || '',
    sort: row.sort,
    status: row.status,
  });
  dialogTitle.value = '编辑分类';
  dialogVisible.value = true;
}

async function handleDelete(row: CategoryNode) {
  await categoryApi.remove(row.id);
  ElMessage.success('已删除');
  loadTree();
}

async function onSave() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    saving.value = true;
    try {
      if (editingId.value) {
        await categoryApi.update(editingId.value, form);
      } else {
        await categoryApi.create(form);
      }
      ElMessage.success('保存成功');
      dialogVisible.value = false;
      loadTree();
    } finally {
      saving.value = false;
    }
  });
}

onMounted(loadTree);
</script>

<style lang="scss" scoped>
.text-secondary {
  color: $text-placeholder;
}
</style>
