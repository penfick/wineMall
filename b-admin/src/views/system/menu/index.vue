<template>
  <div class="page-container">
    <div class="page-card">
      <div class="flex-between" style="margin-bottom: 16px">
        <el-input
          v-model="keyword"
          placeholder="搜索菜单名称"
          clearable
          style="width: 240px"
          :prefix-icon="Search"
        />
        <el-button type="primary" :icon="Plus" @click="handleCreate(undefined)">
          新增顶级菜单
        </el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="filtered"
        row-key="id"
        :default-expand-all="!!keyword"
        :tree-props="{ children: 'children' }"
        border
      >
        <el-table-column prop="name" label="菜单名称" min-width="240" />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="TYPE_TAG[row.type]" effect="light" size="small">
              {{ TYPE_TEXT[row.type] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="图标" width="80" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.icon" :size="18">
              <component :is="row.icon" />
            </el-icon>
            <span v-else class="text-secondary">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="path" label="路径" width="200">
          <template #default="{ row }"><span class="mono">{{ row.path || '—' }}</span></template>
        </el-table-column>
        <el-table-column prop="component" label="组件" width="240">
          <template #default="{ row }"><span class="mono">{{ row.component || '—' }}</span></template>
        </el-table-column>
        <el-table-column prop="permission" label="权限码" width="180">
          <template #default="{ row }"><span class="mono">{{ row.permission || '—' }}</span></template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column label="可见" width="80">
          <template #default="{ row }">
            <el-tag :type="row.visible === 1 ? 'success' : 'info'" effect="light" size="small">
              {{ row.visible === 1 ? '显示' : '隐藏' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.type !== 3" link type="primary" @click="handleCreate(row)">
              添加子项
            </el-button>
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-popconfirm title="确认删除？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 编辑/新增 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="父级">
          <el-input :model-value="parentName" disabled />
        </el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="form.type">
            <el-radio :value="1">目录</el-radio>
            <el-radio :value="2">页面</el-radio>
            <el-radio :value="3">按钮</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" maxlength="20" />
        </el-form-item>
        <el-form-item v-if="form.type !== 3" label="图标">
          <IconSelect v-model="form.icon" />
        </el-form-item>
        <el-form-item v-if="form.type !== 3" label="路径">
          <el-input v-model="form.path" placeholder="/example 或 example" />
        </el-form-item>
        <el-form-item v-if="form.type === 2" label="组件">
          <el-input v-model="form.component" placeholder="如 goods/index" />
        </el-form-item>
        <el-form-item v-if="form.type !== 1" label="权限码">
          <el-input v-model="form.permission" placeholder="如 goods:create" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :precision="0" />
        </el-form-item>
        <el-form-item v-if="form.type !== 3" label="是否显示">
          <el-radio-group v-model="form.visible">
            <el-radio :value="1">显示</el-radio>
            <el-radio :value="0">隐藏</el-radio>
          </el-radio-group>
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

import { menuApi, type CreateMenuDto } from '@/api/menu';
import type { MenuNode } from '@/api/auth';
import IconSelect from '@/components/icon-select/index.vue';

const loading = ref(false);
const tree = ref<MenuNode[]>([]);
const keyword = ref('');

const dialogVisible = ref(false);
const dialogTitle = ref('');
const formRef = ref<FormInstance>();
const editingId = ref<number | null>(null);
const parentNode = ref<MenuNode | null>(null);
const saving = ref(false);

const form = reactive<CreateMenuDto>({
  parentId: 0,
  name: '',
  type: 2,
  path: '',
  component: '',
  permission: '',
  icon: '',
  sort: 0,
  visible: 1,
  status: 1,
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
};

const TYPE_TEXT: Record<number, string> = { 1: '目录', 2: '页面', 3: '按钮' };
const TYPE_TAG: Record<number, 'info' | 'primary' | 'success'> = {
  1: 'info', 2: 'primary', 3: 'success',
};

const parentName = computed(() => parentNode.value?.name || '顶级');

function filterTree(nodes: MenuNode[], kw: string): MenuNode[] {
  if (!kw) return nodes;
  const result: MenuNode[] = [];
  for (const n of nodes) {
    const children = n.children ? filterTree(n.children, kw) : [];
    if (n.name.includes(kw) || children.length) {
      result.push({ ...n, children });
    }
  }
  return result;
}

const filtered = computed(() => filterTree(tree.value, keyword.value));

async function loadTree() {
  loading.value = true;
  try {
    tree.value = await menuApi.tree();
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  Object.assign(form, {
    parentId: 0,
    name: '',
    type: 2,
    path: '',
    component: '',
    permission: '',
    icon: '',
    sort: 0,
    visible: 1,
    status: 1,
  });
  editingId.value = null;
  parentNode.value = null;
}

function handleCreate(parent?: MenuNode) {
  resetForm();
  parentNode.value = parent || null;
  form.parentId = parent?.id || 0;
  if (parent?.type === 2) form.type = 3;
  dialogTitle.value = parent ? `添加 [${parent.name}] 的子项` : '新增顶级菜单';
  dialogVisible.value = true;
}

function handleEdit(row: MenuNode) {
  resetForm();
  editingId.value = row.id;
  Object.assign(form, row);
  dialogTitle.value = '编辑菜单';
  dialogVisible.value = true;
}

async function handleDelete(row: MenuNode) {
  await menuApi.remove(row.id);
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
        await menuApi.update(editingId.value, form);
      } else {
        await menuApi.create(form);
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
