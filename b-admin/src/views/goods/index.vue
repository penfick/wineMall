<template>
  <div class="page-container">
    <div class="page-card">
      <!-- 筛选 -->
      <el-form inline :model="query" class="table-filter" @submit.prevent>
        <el-form-item label="关键字">
          <el-input
            v-model="query.keyword"
            placeholder="商品名 / ID"
            clearable
            style="width: 220px"
            @keyup.enter="reload"
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-cascader
            v-model="categoryPath"
            :options="categoryTree"
            :props="cascaderProps"
            placeholder="全部分类"
            clearable
            style="width: 240px"
            @change="onCategoryChange"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 120px">
            <el-option :value="1" label="上架" />
            <el-option :value="0" label="下架" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="query.lowStock">仅看库存预警</el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="reload">查询</el-button>
          <el-button :icon="RefreshRight" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 工具条 -->
      <div class="flex-between" style="margin-bottom: 12px">
        <div>
          <el-button type="primary" :icon="Plus" @click="handleCreate">新增商品</el-button>
          <el-button :icon="Top" :disabled="!selection.length" @click="batchToggle(1)">
            批量上架
          </el-button>
          <el-button :icon="Bottom" :disabled="!selection.length" @click="batchToggle(0)">
            批量下架
          </el-button>
        </div>
      </div>

      <!-- 表格 -->
      <el-table
        v-loading="loading"
        :data="list"
        stripe
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="主图" width="80">
          <template #default="{ row }">
            <el-image
              :src="row.mainImage"
              fit="cover"
              style="width: 48px; height: 48px; border-radius: 4px"
              :preview-src-list="[row.mainImage]"
              hide-on-click-modal
            />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="商品名称" min-width="220" show-overflow-tooltip />
        <el-table-column prop="categoryName" label="分类" width="160" show-overflow-tooltip />
        <el-table-column label="价格" width="120" align="right">
          <template #default="{ row }">
            <span class="tabular-nums">{{ formatMoney(row.price) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="库存" width="100" align="right">
          <template #default="{ row }">
            <span
              class="tabular-nums"
              :class="{ 'low-stock': row.stockWarning && row.stock <= row.stockWarning }"
            >
              {{ formatNumber(row.stock) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="sales" label="销量" width="90" align="right">
          <template #default="{ row }">
            <span class="tabular-nums">{{ formatNumber(row.sales || 0) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <StatusTag :value="row.status" :text-map="{ '0': '下架', '1': '上架' }" />
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="170">
          <template #default="{ row }">
            <span>{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button
              link
              :type="row.status === 1 ? 'warning' : 'success'"
              @click="toggleOne(row)"
            >
              {{ row.status === 1 ? '下架' : '上架' }}
            </el-button>
            <el-popconfirm title="确定删除该商品？" @confirm="handleDelete(row)">
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, RefreshRight, Plus, Top, Bottom } from '@element-plus/icons-vue';

import { goodsApi, type GoodsItem, type GoodsQuery } from '@/api/goods';
import { categoryApi, type CategoryNode } from '@/api/category';
import StatusTag from '@/components/status-tag/index.vue';
import Pagination from '@/components/pagination/index.vue';
import { formatMoney, formatNumber, formatDate } from '@/utils/format';

const router = useRouter();
const loading = ref(false);
const list = ref<GoodsItem[]>([]);
const total = ref(0);
const selection = ref<GoodsItem[]>([]);

const query = reactive<GoodsQuery>({
  page: 1,
  pageSize: 20,
  keyword: '',
  categoryId: undefined,
  status: undefined,
  lowStock: false,
});

const categoryTree = ref<CategoryNode[]>([]);
const categoryPath = ref<number[]>([]);
const cascaderProps = {
  value: 'id',
  label: 'name',
  children: 'children',
  emitPath: true,
  checkStrictly: true,
};

async function loadList() {
  loading.value = true;
  try {
    const res = await goodsApi.page(query);
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
  query.categoryId = undefined;
  query.status = undefined;
  query.lowStock = false;
  categoryPath.value = [];
  reload();
}

function onCategoryChange(val: unknown) {
  const arr = Array.isArray(val) ? (val as number[]) : [];
  query.categoryId = arr.length ? arr[arr.length - 1] : undefined;
}

function onSelectionChange(rows: GoodsItem[]) {
  selection.value = rows;
}

function handleCreate() {
  router.push('/goods/create');
}

function handleEdit(row: GoodsItem) {
  router.push(`/goods/edit/${row.id}`);
}

async function handleDelete(row: GoodsItem) {
  await goodsApi.remove(row.id);
  ElMessage.success('已删除');
  loadList();
}

async function toggleOne(row: GoodsItem) {
  const next = (row.status === 1 ? 0 : 1) as 0 | 1;
  await goodsApi.toggleStatus(row.id, next);
  ElMessage.success(next === 1 ? '已上架' : '已下架');
  loadList();
}

async function batchToggle(status: 0 | 1) {
  const ids = selection.value.map((r) => r.id);
  await ElMessageBox.confirm(
    `确认批量${status === 1 ? '上架' : '下架'} ${ids.length} 个商品？`,
    '提示',
    { type: 'warning' },
  );
  await goodsApi.batchToggle(ids, status);
  ElMessage.success('操作成功');
  loadList();
}

onMounted(async () => {
  categoryTree.value = await categoryApi.tree();
  loadList();
});
</script>

<style lang="scss" scoped>
.low-stock {
  color: $color-danger;
  font-weight: 600;
}
</style>
