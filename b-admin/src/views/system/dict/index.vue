<template>
  <div class="page-container dict-layout">
    <!-- 左：字典分类 -->
    <div class="page-card aside">
      <div class="aside-header flex-between">
        <span>字典分类</span>
        <el-button link type="primary" :icon="Plus" @click="handleTypeCreate">新增</el-button>
      </div>
      <el-input
        v-model="typeKeyword"
        placeholder="搜索"
        clearable
        :prefix-icon="Search"
        size="small"
        style="margin-bottom: 12px"
      />
      <el-scrollbar style="height: calc(100vh - 220px)">
        <div
          v-for="t in filteredTypes"
          :key="t.id"
          class="type-item"
          :class="{ active: currentType?.code === t.code }"
          @click="selectType(t)"
        >
          <div class="type-name">{{ t.name }}</div>
          <div class="type-code mono">{{ t.code }}</div>
          <div class="type-actions" @click.stop>
            <el-button link type="primary" size="small" @click="handleTypeEdit(t)">编辑</el-button>
            <el-popconfirm title="确认删除？" @confirm="handleTypeRemove(t)">
              <template #reference>
                <el-button link type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>
      </el-scrollbar>
    </div>

    <!-- 右：字典项 -->
    <div class="page-card main">
      <div class="flex-between" style="margin-bottom: 16px">
        <div class="main-title">
          {{ currentType ? `${currentType.name} - 字典项` : '请先选择左侧字典分类' }}
        </div>
        <el-button type="primary" :icon="Plus" :disabled="!currentType" @click="handleItemCreate">
          新增字典项
        </el-button>
      </div>

      <el-table v-loading="itemsLoading" :data="items" border>
        <el-table-column prop="label" label="标签" min-width="140" />
        <el-table-column prop="value" label="值" min-width="140" class-name="mono" />
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column label="样式" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.cssClass" :type="row.cssClass" size="small" effect="light">
              {{ row.cssClass }}
            </el-tag>
            <span v-else class="text-placeholder">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="180" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <StatusTag :value="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleItemEdit(row)">编辑</el-button>
            <el-popconfirm title="确认删除？" @confirm="handleItemRemove(row)">
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 字典分类对话框 -->
    <el-dialog v-model="typeDialog.visible" :title="typeDialog.title" width="480px" destroy-on-close>
      <el-form ref="typeFormRef" :model="typeForm" :rules="typeRules" label-width="100px">
        <el-form-item label="编码" prop="code">
          <el-input v-model="typeForm.code" :disabled="!!typeDialog.id" maxlength="40" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="typeForm.name" maxlength="40" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="typeForm.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="typeForm.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="typeDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="typeSaving" @click="onSaveType">保存</el-button>
      </template>
    </el-dialog>

    <!-- 字典项对话框 -->
    <el-dialog v-model="itemDialog.visible" :title="itemDialog.title" width="480px" destroy-on-close>
      <el-form ref="itemFormRef" :model="itemForm" :rules="itemRules" label-width="100px">
        <el-form-item label="标签" prop="label">
          <el-input v-model="itemForm.label" maxlength="40" />
        </el-form-item>
        <el-form-item label="值" prop="value">
          <el-input v-model="itemForm.value" maxlength="40" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="itemForm.sort" :min="0" :precision="0" />
        </el-form-item>
        <el-form-item label="样式 class">
          <el-select v-model="itemForm.cssClass" placeholder="可选" clearable>
            <el-option value="primary" label="primary" />
            <el-option value="success" label="success" />
            <el-option value="warning" label="warning" />
            <el-option value="danger" label="danger" />
            <el-option value="info" label="info" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="itemForm.remark" maxlength="100" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="itemForm.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="itemDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="itemSaving" @click="onSaveItem">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Search, Plus } from '@element-plus/icons-vue';

import { dictApi, type DictType, type DictItem } from '@/api/dict';
import StatusTag from '@/components/status-tag/index.vue';

const types = ref<DictType[]>([]);
const typeKeyword = ref('');
const currentType = ref<DictType | null>(null);
const items = ref<DictItem[]>([]);
const itemsLoading = ref(false);

const filteredTypes = computed(() => {
  if (!typeKeyword.value) return types.value;
  const kw = typeKeyword.value.toLowerCase();
  return types.value.filter(
    (t) => t.name.toLowerCase().includes(kw) || t.code.toLowerCase().includes(kw),
  );
});

/* ============ 字典分类 ============ */
const typeDialog = reactive({ visible: false, title: '', id: null as number | null });
const typeFormRef = ref<FormInstance>();
const typeSaving = ref(false);
const typeForm = reactive<Partial<DictType>>({ code: '', name: '', description: '', status: 1 });

const typeRules: FormRules = {
  code: [{ required: true, message: '请输入编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
};

async function loadTypes() {
  const res = await dictApi.typePage({ page: 1, pageSize: 200 });
  types.value = res.list;
  if (!currentType.value && types.value.length) selectType(types.value[0]);
}

function selectType(t: DictType) {
  currentType.value = t;
  loadItems();
}

function resetTypeForm() {
  typeForm.code = '';
  typeForm.name = '';
  typeForm.description = '';
  typeForm.status = 1;
  typeDialog.id = null;
}

function handleTypeCreate() {
  resetTypeForm();
  typeDialog.title = '新增字典分类';
  typeDialog.visible = true;
}

function handleTypeEdit(t: DictType) {
  resetTypeForm();
  typeDialog.id = t.id;
  Object.assign(typeForm, t);
  typeDialog.title = '编辑字典分类';
  typeDialog.visible = true;
}

async function handleTypeRemove(t: DictType) {
  await dictApi.typeRemove(t.id);
  ElMessage.success('已删除');
  if (currentType.value?.id === t.id) {
    currentType.value = null;
    items.value = [];
  }
  loadTypes();
}

async function onSaveType() {
  if (!typeFormRef.value) return;
  await typeFormRef.value.validate(async (valid) => {
    if (!valid) return;
    typeSaving.value = true;
    try {
      if (typeDialog.id) {
        await dictApi.typeUpdate(typeDialog.id, typeForm);
      } else {
        await dictApi.typeCreate(typeForm);
      }
      ElMessage.success('保存成功');
      typeDialog.visible = false;
      loadTypes();
    } finally {
      typeSaving.value = false;
    }
  });
}

/* ============ 字典项 ============ */
const itemDialog = reactive({ visible: false, title: '', id: null as number | null });
const itemFormRef = ref<FormInstance>();
const itemSaving = ref(false);
const itemForm = reactive<Partial<DictItem>>({
  label: '',
  value: '',
  sort: 0,
  status: 1,
  cssClass: undefined,
  remark: '',
});

const itemRules: FormRules = {
  label: [{ required: true, message: '请输入标签', trigger: 'blur' }],
  value: [{ required: true, message: '请输入值', trigger: 'blur' }],
};

async function loadItems() {
  if (!currentType.value) return;
  itemsLoading.value = true;
  try {
    items.value = await dictApi.itemList(currentType.value.code);
  } finally {
    itemsLoading.value = false;
  }
}

function resetItemForm() {
  itemForm.label = '';
  itemForm.value = '';
  itemForm.sort = 0;
  itemForm.cssClass = undefined;
  itemForm.remark = '';
  itemForm.status = 1;
  itemDialog.id = null;
}

function handleItemCreate() {
  resetItemForm();
  itemDialog.title = '新增字典项';
  itemDialog.visible = true;
}

function handleItemEdit(row: DictItem) {
  resetItemForm();
  itemDialog.id = row.id;
  Object.assign(itemForm, row);
  itemDialog.title = '编辑字典项';
  itemDialog.visible = true;
}

async function handleItemRemove(row: DictItem) {
  await dictApi.itemRemove(row.id);
  ElMessage.success('已删除');
  loadItems();
}

async function onSaveItem() {
  if (!itemFormRef.value || !currentType.value) return;
  await itemFormRef.value.validate(async (valid) => {
    if (!valid) return;
    itemSaving.value = true;
    try {
      const payload = { ...itemForm, typeCode: currentType.value!.code };
      if (itemDialog.id) {
        await dictApi.itemUpdate(itemDialog.id, payload);
      } else {
        await dictApi.itemCreate(payload);
      }
      ElMessage.success('保存成功');
      itemDialog.visible = false;
      loadItems();
    } finally {
      itemSaving.value = false;
    }
  });
}

onMounted(loadTypes);
</script>

<style lang="scss" scoped>
.dict-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: $space-md;
  align-items: start;
}

.aside {
  position: sticky;
  top: 0;
  max-height: calc(100vh - var(--wm-header-height) - 32px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
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

.type-item {
  padding: 10px 12px;
  border-radius: $radius-sm;
  cursor: pointer;
  transition: background $transition-fast;
  position: relative;

  .type-name {
    font-size: 14px;
    color: $text-primary;
    font-weight: 500;
  }

  .type-code {
    font-size: 12px;
    color: $text-placeholder;
    margin-top: 2px;
  }

  .type-actions {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    opacity: 0;
    transition: opacity $transition-fast;
    background: #fff;
    padding: 0 4px;
  }

  &:hover {
    background: $bg-hover;

    .type-actions {
      opacity: 1;
    }
  }

  &.active {
    background: rgba(64, 158, 255, 0.1);

    .type-name {
      color: $color-primary;
    }
  }
}

.text-placeholder {
  color: $text-placeholder;
}
</style>
