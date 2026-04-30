<template>
  <div class="page-container">
    <!-- 状态 Tab -->
    <div class="page-card" style="margin-bottom: 0; padding-bottom: 0">
      <el-tabs v-model="activeStatus" @tab-change="onStatusChange">
        <el-tab-pane label="全部" :name="-1" />
        <el-tab-pane label="待付款" :name="0" />
        <el-tab-pane label="待发货" :name="1" />
        <el-tab-pane label="待收货" :name="2" />
        <el-tab-pane label="已完成" :name="3" />
        <el-tab-pane label="已取消" :name="4" />
        <el-tab-pane label="退款中" :name="5" />
      </el-tabs>
    </div>

    <div class="page-card" style="margin-top: 12px">
      <!-- 筛选 -->
      <el-form inline :model="query" class="table-filter" @submit.prevent>
        <el-form-item label="关键字">
          <el-input
            v-model="query.keyword"
            placeholder="订单号/收件人/手机号"
            clearable
            style="width: 240px"
            @keyup.enter="reload"
          />
        </el-form-item>
        <el-form-item label="下单时间">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            @change="onDateChange"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="reload">查询</el-button>
          <el-button :icon="RefreshRight" @click="resetQuery">重置</el-button>
          <el-button :icon="Download" @click="onExport">导出 Excel</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table v-loading="loading" :data="list" stripe style="width: 100%">
        <el-table-column prop="orderNo" label="订单号" min-width="180">
          <template #default="{ row }">
            <span class="mono">{{ row.orderNo }}</span>
          </template>
        </el-table-column>
        <el-table-column label="买家" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <div>{{ row.userName || '—' }}</div>
            <div v-if="row.userPhone" class="text-secondary tabular-nums">
              {{ row.userPhone }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="收件人" min-width="160">
          <template #default="{ row }">
            <div>{{ row.receiverName }}</div>
            <div class="text-secondary tabular-nums">{{ row.receiverPhone }}</div>
          </template>
        </el-table-column>
        <el-table-column label="实付金额" width="120" align="right">
          <template #default="{ row }">
            <span class="tabular-nums" style="color: #f97316; font-weight: 600">
              {{ formatMoney(row.payAmount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="STATUS_TYPE[row.status]" effect="light">
              {{ STATUS_TEXT[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="下单时间" width="160">
          <template #default="{ row }">
            <span class="tabular-nums">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="goDetail(row)">详情</el-button>
            <el-button v-if="row.status === 1" link type="success" @click="goShip(row)">
              发货
            </el-button>
            <el-button v-if="row.status === 0" link type="warning" @click="onCancel(row)">
              取消
            </el-button>
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
import { Search, RefreshRight, Download } from '@element-plus/icons-vue';

import { orderApi, type OrderItem, type OrderQuery } from '@/api/order';
import Pagination from '@/components/pagination/index.vue';
import { formatMoney, formatDate } from '@/utils/format';

const router = useRouter();
const loading = ref(false);
const list = ref<OrderItem[]>([]);
const total = ref(0);
const activeStatus = ref<number>(-1);
const dateRange = ref<string[]>([]);

const query = reactive<OrderQuery>({
  page: 1,
  pageSize: 20,
  keyword: '',
  status: undefined,
  startDate: undefined,
  endDate: undefined,
});

const STATUS_TEXT: Record<number, string> = {
  0: '待付款', 1: '待发货', 2: '待收货', 3: '已完成', 4: '已取消', 5: '退款中',
};
const STATUS_TYPE: Record<number, 'info' | 'warning' | 'primary' | 'success' | 'danger'> = {
  0: 'warning', 1: 'primary', 2: 'primary', 3: 'success', 4: 'info', 5: 'danger',
};

async function loadList() {
  loading.value = true;
  try {
    const res = await orderApi.page(query);
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

function onStatusChange(name: string | number) {
  const v = Number(name);
  query.status = v === -1 ? undefined : v;
  reload();
}

function onDateChange(val: [string, string] | null) {
  if (val) {
    query.startDate = val[0];
    query.endDate = val[1];
  } else {
    query.startDate = undefined;
    query.endDate = undefined;
  }
}

function resetQuery() {
  query.keyword = '';
  query.startDate = undefined;
  query.endDate = undefined;
  dateRange.value = [];
  activeStatus.value = -1;
  query.status = undefined;
  reload();
}

function goDetail(row: OrderItem) {
  router.push(`/order/detail/${row.id}`);
}

function goShip(row: OrderItem) {
  router.push(`/order/detail/${row.id}?action=ship`);
}

async function onCancel(row: OrderItem) {
  const { value: reason } = await ElMessageBox.prompt('请输入取消原因', '取消订单', {
    inputPlaceholder: '请说明原因',
    confirmButtonText: '确认取消',
    cancelButtonText: '关闭',
  });
  await orderApi.cancel(row.id, reason);
  ElMessage.success('已取消');
  loadList();
}

async function onExport() {
  const raw = await orderApi.exportExcel(query);
  const blob =
    raw instanceof Blob
      ? raw
      : new Blob([raw as BlobPart], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `订单导出-${formatDate(new Date(), 'YYYYMMDD-HHmmss')}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

onMounted(loadList);
</script>

<style lang="scss" scoped>
.text-secondary {
  color: $text-placeholder;
  font-size: 12px;
}
</style>
