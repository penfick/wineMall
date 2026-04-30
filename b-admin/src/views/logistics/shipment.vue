<template>
  <div class="page-container">
    <div class="page-card">
      <el-form inline :model="query" class="table-filter" @submit.prevent>
        <el-form-item label="订单号/快递单号">
          <el-input
            v-model="query.keyword"
            placeholder="请输入"
            clearable
            style="width: 220px"
            @keyup.enter="reload"
          />
        </el-form-item>
        <el-form-item label="物流公司">
          <el-select v-model="query.companyCode" placeholder="全部" clearable style="width: 180px">
            <el-option v-for="c in companies" :key="c.code" :value="c.code" :label="c.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 130px">
            <el-option :value="0" label="已发货" />
            <el-option :value="1" label="运输中" />
            <el-option :value="2" label="已签收" />
          </el-select>
        </el-form-item>
        <el-form-item label="发货时间">
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

      <el-table v-loading="loading" :data="list" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="orderNo" label="订单号" min-width="180">
          <template #default="{ row }">
            <el-link type="primary" @click="$router.push(`/order/detail/${row.orderId}`)">
              {{ row.orderNo }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="companyName" label="物流公司" width="140" />
        <el-table-column prop="trackingNo" label="快递单号" width="180" class-name="mono" />
        <el-table-column label="发货时间" width="170">
          <template #default="{ row }">{{ formatDate(row.shippedAt) }}</template>
        </el-table-column>
        <el-table-column label="收货时间" width="170">
          <template #default="{ row }">
            {{ row.receivedAt ? formatDate(row.receivedAt) : '—' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="STATUS_TYPE[row.status]" effect="light">
              {{ STATUS_TEXT[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="showTrace(row)">查看物流</el-button>
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

    <el-dialog v-model="traceVisible" title="物流轨迹" width="560px">
      <el-timeline v-if="traces.length">
        <el-timeline-item
          v-for="(t, i) in traces"
          :key="i"
          :timestamp="t.time"
          :type="i === 0 ? 'primary' : ''"
          placement="top"
        >
          {{ t.description }}
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无轨迹信息" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { Search, RefreshRight } from '@element-plus/icons-vue';

import {
  logisticsApi,
  type ShipmentRecord,
  type ShipmentQuery,
  type LogisticsCompany,
} from '@/api/logistics';
import Pagination from '@/components/pagination/index.vue';
import { formatDate } from '@/utils/format';

const STATUS_TEXT: Record<number, string> = { 0: '已发货', 1: '运输中', 2: '已签收' };
const STATUS_TYPE: Record<number, 'info' | 'warning' | 'success'> = {
  0: 'info',
  1: 'warning',
  2: 'success',
};

const list = ref<ShipmentRecord[]>([]);
const total = ref(0);
const loading = ref(false);
const companies = ref<LogisticsCompany[]>([]);

const query = reactive<ShipmentQuery>({
  page: 1,
  pageSize: 20,
  keyword: '',
  companyCode: undefined,
  status: undefined,
  startDate: undefined,
  endDate: undefined,
});

const dateRange = ref<[string, string] | null>(null);

const traceVisible = ref(false);
const traces = ref<Array<{ time: string; description: string }>>([]);

watch(dateRange, (val) => {
  query.startDate = val?.[0];
  query.endDate = val?.[1];
});

async function loadData() {
  loading.value = true;
  try {
    const res = await logisticsApi.shipmentPage(query);
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
  query.companyCode = undefined;
  query.status = undefined;
  dateRange.value = null;
  reload();
}

async function showTrace(row: ShipmentRecord) {
  traces.value = [];
  traceVisible.value = true;
  traces.value = await logisticsApi.trace(row.id);
}

onMounted(async () => {
  loadData();
  companies.value = await logisticsApi.companyAll();
});
</script>
