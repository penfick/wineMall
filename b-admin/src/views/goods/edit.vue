<template>
  <div class="page-container">
    <div class="page-card">
      <h2 class="page-title">{{ isEdit ? '编辑商品' : '新增商品' }}</h2>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        style="max-width: 920px"
      >
        <el-divider content-position="left">基础信息</el-divider>

        <el-form-item label="商品名称" prop="name">
          <el-input v-model="form.name" maxlength="80" show-word-limit />
        </el-form-item>

        <el-form-item label="副标题">
          <el-input v-model="form.subTitle" maxlength="120" show-word-limit />
        </el-form-item>

        <el-form-item label="商品分类" prop="categoryId">
          <el-cascader
            v-model="categoryPath"
            :options="categoryTree"
            :props="cascaderProps"
            placeholder="请选择分类"
            style="width: 360px"
            @change="onCategoryChange"
          />
        </el-form-item>

        <el-form-item label="主图" prop="mainImage">
          <ImageUpload v-model="form.mainImage" prefix="goods/main" />
        </el-form-item>

        <el-form-item label="商品轮播图">
          <ImageUpload
            :model-value="form.images || []"
            prefix="goods/album"
            multiple
            :limit="6"
            @update:model-value="(v: string | string[]) => (form.images = Array.isArray(v) ? v : [v].filter(Boolean))"
          />
          <div class="form-tip">最多 6 张，建议尺寸 800x800</div>
        </el-form-item>

        <el-form-item label="单位">
          <el-input v-model="form.unit" placeholder="件 / 瓶 / 箱" style="width: 200px" />
        </el-form-item>

        <el-divider content-position="left">价格 & 库存</el-divider>

        <el-form-item label="销售价" prop="price">
          <el-input-number
            v-model="form.price"
            :min="0"
            :precision="2"
            :controls="false"
            style="width: 200px"
          />
          <span class="form-tip">单位：元</span>
        </el-form-item>

        <el-form-item label="市场价">
          <el-input-number
            v-model="form.marketPrice"
            :min="0"
            :precision="2"
            :controls="false"
            style="width: 200px"
          />
        </el-form-item>

        <el-form-item label="成本价">
          <el-input-number
            v-model="form.costPrice"
            :min="0"
            :precision="2"
            :controls="false"
            style="width: 200px"
          />
        </el-form-item>

        <el-form-item label="库存" prop="stock">
          <el-input-number
            v-model="form.stock"
            :min="0"
            :precision="0"
            style="width: 200px"
          />
        </el-form-item>

        <el-form-item label="库存预警">
          <el-input-number
            v-model="form.stockWarning"
            :min="0"
            :precision="0"
            style="width: 200px"
          />
          <span class="form-tip">库存低于此值时仪表盘提示</span>
        </el-form-item>

        <el-divider content-position="left">SKU 规格</el-divider>

        <el-form-item label="SKU 列表">
          <div style="width: 100%">
            <el-button :icon="Plus" @click="addSpec">添加规格</el-button>
            <el-table
              :data="form.specs"
              border
              size="small"
              style="margin-top: 12px"
              empty-text="暂无 SKU，按销售价 / 总库存计算"
            >
              <el-table-column label="规格描述" min-width="200">
                <template #default="{ row }">
                  <el-input v-model="row.attrText" placeholder="如：红色|XL" />
                </template>
              </el-table-column>
              <el-table-column label="SKU 编码" width="160">
                <template #default="{ row }">
                  <el-input v-model="row.skuCode" placeholder="选填" />
                </template>
              </el-table-column>
              <el-table-column label="价格" width="130">
                <template #default="{ row }">
                  <el-input-number
                    v-model="row.price"
                    :min="0"
                    :precision="2"
                    :controls="false"
                    style="width: 100%"
                  />
                </template>
              </el-table-column>
              <el-table-column label="库存" width="110">
                <template #default="{ row }">
                  <el-input-number
                    v-model="row.stock"
                    :min="0"
                    :precision="0"
                    :controls="false"
                    style="width: 100%"
                  />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80" fixed="right">
                <template #default="{ $index }">
                  <el-button link type="danger" @click="removeSpec($index)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-form-item>

        <el-divider content-position="left">商品详情</el-divider>

        <el-form-item label="详情">
          <RichTextEditor v-model="form.detail" height="400px" />
        </el-form-item>

        <el-divider content-position="left">其他</el-divider>

        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :precision="0" style="width: 200px" />
          <span class="form-tip">数值越大越靠前</span>
        </el-form-item>

        <el-form-item label="上架状态">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">上架</el-radio>
            <el-radio :value="0">下架</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="saving" @click="onSubmit">
            {{ isEdit ? '保存修改' : '创建商品' }}
          </el-button>
          <el-button @click="$router.back()">返回</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';

import { goodsApi, type GoodsItem, type GoodsSpecItem } from '@/api/goods';
import { categoryApi, type CategoryNode } from '@/api/category';
import ImageUpload from '@/components/image-upload/index.vue';
import RichTextEditor from '@/components/rich-text-editor/index.vue';

const route = useRoute();
const router = useRouter();
const formRef = ref<FormInstance>();
const saving = ref(false);

const id = computed(() => Number(route.params.id) || 0);
const isEdit = computed(() => id.value > 0);

const form = reactive<Partial<GoodsItem>>({
  name: '',
  subTitle: '',
  categoryId: undefined,
  mainImage: '',
  images: [],
  detail: '',
  unit: '件',
  price: 0,
  marketPrice: 0,
  costPrice: 0,
  stock: 0,
  stockWarning: 10,
  status: 1,
  sort: 0,
  specs: [],
});

const categoryTree = ref<CategoryNode[]>([]);
const categoryPath = ref<number[]>([]);
const cascaderProps = {
  value: 'id',
  label: 'name',
  children: 'children',
  emitPath: true,
};

const rules: FormRules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  mainImage: [{ required: true, message: '请上传主图', trigger: 'change' }],
  price: [{ required: true, message: '请输入销售价', trigger: 'blur' }],
  stock: [{ required: true, message: '请输入库存', trigger: 'blur' }],
};

function onCategoryChange(val: unknown) {
  const arr = Array.isArray(val) ? (val as number[]) : [];
  form.categoryId = arr.length ? arr[arr.length - 1] : undefined;
}

function addSpec() {
  form.specs!.push({
    attrText: '',
    skuCode: '',
    price: form.price || 0,
    stock: 0,
    status: 1,
  } as GoodsSpecItem);
}

function removeSpec(idx: number) {
  form.specs!.splice(idx, 1);
}

function findCategoryPath(tree: CategoryNode[], targetId: number, path: number[] = []): number[] | null {
  for (const node of tree) {
    const next = [...path, node.id];
    if (node.id === targetId) return next;
    if (node.children) {
      const found = findCategoryPath(node.children, targetId, next);
      if (found) return found;
    }
  }
  return null;
}

async function loadDetail() {
  if (!isEdit.value) return;
  const data = await goodsApi.detail(id.value);
  Object.assign(form, data);
  form.specs = data.specs || [];
  if (data.categoryId && categoryTree.value.length) {
    const path = findCategoryPath(categoryTree.value, data.categoryId);
    if (path) categoryPath.value = path;
  }
}

async function onSubmit() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    saving.value = true;
    try {
      if (isEdit.value) {
        await goodsApi.update(id.value, form);
        ElMessage.success('保存成功');
      } else {
        await goodsApi.create(form);
        ElMessage.success('创建成功');
      }
      router.replace('/goods');
    } finally {
      saving.value = false;
    }
  });
}

onMounted(async () => {
  categoryTree.value = await categoryApi.tree();
  await loadDetail();
});
</script>

<style lang="scss" scoped>
.page-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 24px;
  color: $text-primary;
}

.form-tip {
  margin-left: 12px;
  color: $text-placeholder;
  font-size: 12px;
}
</style>
