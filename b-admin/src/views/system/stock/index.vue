<template>
  <div class="page-container">
    <div class="page-card">
      <el-form inline :model="query" class="table-filter" @submit.prevent>
        <el-form-item label="商品/SKU">
          <el-input
            v-model="query.keyword"
            placeholder="商品名称/SKU 编码"
            clearable
            style="width: 220px"
            @keyup.enter="reload"
          />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="query.type" placeholder="全部" clearable style="width: 130px">
            <el-option v-for="(t, k) in TYPE_TEXT" :key="k" :value="k" :label="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            unlink-panels
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            style="width: 260px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="reload">查询</el-button>
          <el-button :icon="RefreshRight" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <div style="margin-bottom: 12px">
        <el-button type="warning" :icon="Plus" @click="openAdjust">手动调整库存</el-button>
      </div>

      <el-table v-loading="loading" :data="list" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="goodsName" label="商品" min-width="200" />
        <el-table-column prop="skuText" label="SKU" min-width="160">
          <template #default="{ row }">{{ row.skuText || '—' }}</template>
        </el-table-column>
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="TYPE_COLOR[row.type]" effect="light">{{ TYPE_TEXT[row.type] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="变动" width="100" align="right">
          <template #default="{ row }">
            <span :class="row.changeQty > 0 ? 'qty-in' : 'qty-out'" class="tabular-nums">
              {{ row.changeQty > 0 ? '+' : '' }}{{ row.changeQty }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="变动前" width="90" align="right">
          <template #default="{ row }"><span class="tabular-nums">{{ row.beforeStock }}</span></template>
        </el-table-column>
        <el-table-column label="变动后" width="90" align="right">
          <template #default="{ row }"><span class="tabular-nums">{{ row.afterStock }}</span></template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="180" />
        <el-table-column prop="operator" label="操作人" width="120" />
        <el-table-column label="时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
      </el-table>

      <Pagination
        v-model:page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        @change="loadData"
      />
    </div>

    <el-dialog v-model="adjustVisible" title="手动调整库存" width="520px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="选择商品" prop="goodsId">
          <el-select
            v-model="form.goodsId"
            filterable
            remote
            clearable
            :remote-method="searchGoods"
            :loading="goodsLoading"
            placeholder="输入商品名称搜索"
            style="width: 100%"
            @change="onGoodsChange"
          >
            <el-option
              v-for="g in goodsOptions"
              :key="g.id"
              :label="`#${g.id} ${g.name}`"
              :value="g.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="选择 SKU" prop="skuId">
          <el-select
            v-model="form.skuId"
            placeholder="请先选商品"
            :disabled="!form.goodsId || skuLoading"
            :loading="skuLoading"
            style="width: 100%"
          >
            <el-option
              v-for="s in skuOptions"
              :key="s.id"
              :label="`${s.isDefault || !s.attrText ? '默认规格' : s.attrText}（当前库存 ${s.stock}）`"
              :value="s.id!"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="变动数量" prop="changeQty">
          <el-input-number v-model="form.changeQty" style="width: 200px" />
          <span class="text-secondary" style="margin-left: 8px">正数=入库，负数=出库</span>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请填写调整原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustVisible = false">取消</el-button>
        <el-button type="warning" :loading="saving" @click="onAdjust">确认调整</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Search, RefreshRight, Plus } from '@element-plus/icons-vue';

import { stockApi, type StockLogItem, type StockQuery, type StockAdjustDto } from '@/api/stock';
import { goodsApi, type GoodsItem, type GoodsSpecItem } from '@/api/goods';
import Pagination from '@/components/pagination/index.vue';
import { formatDate } from '@/utils/format';

const TYPE_TEXT: Record<string, string> = {
  in: '入库',
  out: '出库',
  adjust: '人工调整',
  order: '订单出库',
  cancel: '订单回滚',
};

const TYPE_COLOR: Record<string, 'success' | 'warning' | 'info' | 'primary' | 'danger'> = {
  in: 'success',
  out: 'warning',
  adjust: 'primary',
  order: 'info',
  cancel: 'danger',
};

const list = ref<StockLogItem[]>([]);
const total = ref(0);
const loading = ref(false);

const query = reactive<StockQuery>({
  page: 1,
  pageSize: 20,
  keyword: '',
  type: undefined,
  startDate: undefined,
  endDate: undefined,
});

const dateRange = ref<[string, string] | null>(null);

watch(dateRange, (val) => {
  query.startDate = val?.[0];
  query.endDate = val?.[1];
});

const adjustVisible = ref(false);
const formRef = ref<FormInstance>();
const saving = ref(false);

interface AdjustForm {
  goodsId: number | undefined;
  skuId: number | undefined;
  changeQty: number;
  remark: string;
}

const form = reactive<AdjustForm>({
  goodsId: undefined,
  skuId: undefined,
  changeQty: 0,
  remark: '',
});

const rules: FormRules = {
  goodsId: [{ required: true, message: '请选择商品', trigger: 'change' }],
  skuId: [{ required: true, message: '请选择 SKU', trigger: 'change' }],
  changeQty: [{ required: true, message: '请输入变动数量', trigger: 'blur' }],
  remark: [{ required: true, message: '请填写调整原因', trigger: 'blur' }],
};

const goodsOptions = ref<GoodsItem[]>([]);
const goodsLoading = ref(false);
const skuOptions = ref<GoodsSpecItem[]>([]);
const skuLoading = ref(false);

async function searchGoods(keyword: string) {
  if (!keyword) {
    goodsOptions.value = [];
    return;
  }
  goodsLoading.value = true;
  try {
    const res = await goodsApi.page({ keyword, page: 1, pageSize: 20 });
    goodsOptions.value = res.list;
  } finally {
    goodsLoading.value = false;
  }
}

async function onGoodsChange(goodsId: number | undefined) {
  form.skuId = undefined;
  skuOptions.value = [];
  if (!goodsId) return;
  skuLoading.value = true;
  try {
    const detail = await goodsApi.detail(goodsId);
    skuOptions.value = detail.specs ?? [];
    if (skuOptions.value.length === 1) {
      form.skuId = skuOptions.value[0].id;
    }
  } finally {
    skuLoading.value = false;
  }
}

async function loadData() {
  loading.value = true;
  try {
    const res = await stockApi.logPage(query);
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
  dateRange.value = null;
  reload();
}

function openAdjust() {
  form.goodsId = undefined;
  form.skuId = undefined;
  form.changeQty = 0;
  form.remark = '';
  goodsOptions.value = [];
  skuOptions.value = [];
  adjustVisible.value = true;
}

async function onAdjust() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    if (form.changeQty === 0) {
      ElMessage.warning('变动数量不能为 0');
      return;
    }
    saving.value = true;
    try {
      const payload: StockAdjustDto = {
        skuId: form.skuId!,
        action: form.changeQty > 0 ? 1 : 2,
        change: Math.abs(form.changeQty),
        remark: form.remark,
      };
      await stockApi.adjust(payload);
      ElMessage.success('调整成功');
      adjustVisible.value = false;
      loadData();
    } finally {
      saving.value = false;
    }
  });
}

onMounted(loadData);
</script>

<style lang="scss" scoped>
.qty-in {
  color: #16a34a;
  font-weight: 600;
}

.qty-out {
  color: #dc2626;
  font-weight: 600;
}

.text-secondary {
  color: $text-placeholder;
  font-size: 12px;
}
</style>
