<template>
  <div class="page-container attr-layout">
    <!-- 左：分类树 -->
    <div class="page-card aside">
      <div class="aside-header">分类</div>
      <el-input
        v-model="filterText"
        placeholder="搜索分类"
        clearable
        :prefix-icon="Search"
        size="small"
      />
      <el-tree
        ref="treeRef"
        :data="tree"
        :props="{ label: 'name', children: 'children' }"
        node-key="id"
        :filter-node-method="filterNode"
        highlight-current
        style="margin-top: 12px"
        @node-click="onSelect"
      />
    </div>

    <!-- 右：属性列表 -->
    <div class="page-card main">
      <div class="flex-between" style="margin-bottom: 16px">
        <div class="main-title">
          {{ currentCategory ? currentCategory.name + ' - 属性' : '请先选择左侧分类' }}
        </div>
        <el-button type="primary" :icon="Plus" :disabled="!currentCategory" @click="handleAdd">
          新增属性
        </el-button>
      </div>

      <el-table v-loading="loading" :data="attrs" border>
        <el-table-column prop="name" label="属性名称" min-width="160" />
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="row.type === 'sku' ? 'success' : 'info'" effect="light">
              {{ row.type === 'sku' ? 'SKU' : '展示' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="录入方式" width="100">
          <template #default="{ row }">
            {{ row.inputType === 'select' ? '下拉' : '输入' }}
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column label="必填" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.required" type="warning" effect="light" size="small">必填</el-tag>
            <span v-else class="text-secondary">否</span>
          </template>
        </el-table-column>
        <el-table-column label="可选值" min-width="280">
          <template #default="{ row }">
            <el-tag
              v-for="v in row.values || []"
              :key="v.id"
              closable
              size="small"
              style="margin: 2px 4px 2px 0"
              @close="removeValue(v.id)"
            >
              {{ v.value }}
            </el-tag>
            <el-input
              v-if="addingFor === row.id"
              v-model="newValueText"
              size="small"
              placeholder="按回车添加"
              style="width: 120px"
              @keyup.enter="confirmAddValue(row)"
              @blur="addingFor = null"
            />
            <el-button
              v-else
              link
              type="primary"
              size="small"
              :icon="Plus"
              @click="addingFor = row.id"
            >
              添加
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-popconfirm title="确认删除该属性？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="480px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="属性名" prop="name">
          <el-input v-model="form.name" maxlength="20" />
        </el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="form.type">
            <el-radio value="sku">SKU 属性</el-radio>
            <el-radio value="normal">展示属性</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="录入方式">
          <el-radio-group v-model="form.inputType">
            <el-radio value="select">下拉</el-radio>
            <el-radio value="input">输入</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :precision="0" />
        </el-form-item>
        <el-form-item label="必填">
          <el-switch v-model="requiredBool" />
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
import { computed, onMounted, reactive, ref, watch, nextTick } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Search, Plus } from '@element-plus/icons-vue';

import { categoryApi, type CategoryNode } from '@/api/category';
import { categoryAttrApi, type CategoryAttrItem } from '@/api/category-attr';

const treeRef = ref();
const tree = ref<CategoryNode[]>([]);
const filterText = ref('');
const currentCategory = ref<CategoryNode | null>(null);
const attrs = ref<CategoryAttrItem[]>([]);
const loading = ref(false);

const dialogVisible = ref(false);
const dialogTitle = ref('');
const formRef = ref<FormInstance>();
const editingId = ref<number | null>(null);
const saving = ref(false);

const addingFor = ref<number | null>(null);
const newValueText = ref('');

const form = reactive<Partial<CategoryAttrItem>>({
  name: '',
  type: 'sku',
  inputType: 'select',
  required: 0,
  sort: 0,
});

const requiredBool = computed({
  get: () => form.required === 1,
  set: (v: boolean) => (form.required = v ? 1 : 0),
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入属性名', trigger: 'blur' }],
};

watch(filterText, (val) => treeRef.value?.filter(val));

function filterNode(value: string, data: { name?: string }) {
  return !value || (data.name?.includes(value) ?? false);
}

async function onSelect(node: CategoryNode) {
  if (node.children?.length) {
    ElMessage.info('请选择叶子分类（最末级）配置属性');
    return;
  }
  currentCategory.value = node;
  await loadAttrs();
}

async function loadAttrs() {
  if (!currentCategory.value) return;
  loading.value = true;
  try {
    attrs.value = await categoryAttrApi.listByCategory(currentCategory.value.id);
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.name = '';
  form.type = 'sku';
  form.inputType = 'select';
  form.required = 0;
  form.sort = 0;
  editingId.value = null;
}

function handleAdd() {
  resetForm();
  dialogTitle.value = '新增属性';
  dialogVisible.value = true;
}

function handleEdit(row: CategoryAttrItem) {
  resetForm();
  editingId.value = row.id;
  Object.assign(form, row);
  dialogTitle.value = '编辑属性';
  dialogVisible.value = true;
}

async function handleDelete(row: CategoryAttrItem) {
  await categoryAttrApi.remove(row.id);
  ElMessage.success('已删除');
  loadAttrs();
}

async function onSave() {
  if (!formRef.value || !currentCategory.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    saving.value = true;
    try {
      const payload = { ...form, categoryId: currentCategory.value!.id };
      if (editingId.value) {
        await categoryAttrApi.update(editingId.value, payload);
      } else {
        await categoryAttrApi.create(payload);
      }
      ElMessage.success('保存成功');
      dialogVisible.value = false;
      loadAttrs();
    } finally {
      saving.value = false;
    }
  });
}

async function confirmAddValue(row: CategoryAttrItem) {
  const value = newValueText.value.trim();
  if (!value) {
    addingFor.value = null;
    return;
  }
  await categoryAttrApi.valueCreate({ attrId: row.id, value, sort: 0 });
  newValueText.value = '';
  await loadAttrs();
  await nextTick();
  addingFor.value = row.id;
}

async function removeValue(id: number) {
  await categoryAttrApi.valueRemove(id);
  loadAttrs();
}

onMounted(async () => {
  tree.value = await categoryApi.tree();
});
</script>

<style lang="scss" scoped>
.attr-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: $space-md;
  align-items: start;
}

.aside {
  position: sticky;
  top: 0;
  max-height: calc(100vh - var(--wm-header-height) - 32px);
  overflow: auto;
}

.aside-header {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: $text-primary;
}

.main-title {
  font-size: 16px;
  font-weight: 600;
  color: $text-primary;
}

.text-secondary {
  color: $text-placeholder;
}
</style>
