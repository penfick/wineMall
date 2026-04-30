<template>
  <div class="page-container">
    <div class="page-card">
      <el-form inline :model="query" class="table-filter" @submit.prevent>
        <el-form-item label="关键字">
          <el-input
            v-model="query.keyword"
            placeholder="描述/路径"
            clearable
            style="width: 220px"
            @keyup.enter="reload"
          />
        </el-form-item>
        <el-form-item label="操作人">
          <el-input
            v-model="query.username"
            placeholder="用户名"
            clearable
            style="width: 160px"
            @keyup.enter="reload"
          />
        </el-form-item>
        <el-form-item label="模块">
          <el-input v-model="query.module" placeholder="如 goods" clearable style="width: 140px" />
        </el-form-item>
        <el-form-item label="结果">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 110px">
            <el-option value="success" label="成功" />
            <el-option value="fail" label="失败" />
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
          <el-button type="danger" :icon="Delete" @click="handleClear">清理过期日志</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="list" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="操作人" width="120">
          <template #default="{ row }">{{ row.username || '系统' }}</template>
        </el-table-column>
        <el-table-column prop="module" label="模块" width="120" />
        <el-table-column prop="action" label="动作" width="120" />
        <el-table-column prop="description" label="描述" min-width="220" />
        <el-table-column label="请求" min-width="220">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.method }}</el-tag>
            <span class="mono" style="margin-left: 6px">{{ row.path }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="ip" label="IP" width="140" class-name="mono" />
        <el-table-column label="耗时" width="100" align="right">
          <template #default="{ row }">
            <span class="tabular-nums">{{ row.durationMs }}ms</span>
          </template>
        </el-table-column>
        <el-table-column label="结果" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : 'danger'" effect="light">
              {{ row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewDetail(row)">详情</el-button>
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

    <el-dialog v-model="detailVisible" title="日志详情" width="640px">
      <el-descriptions v-if="detail" :column="2" border>
        <el-descriptions-item label="ID">{{ detail.id }}</el-descriptions-item>
        <el-descriptions-item label="操作人">{{ detail.username || '系统' }}</el-descriptions-item>
        <el-descriptions-item label="模块">{{ detail.module }}</el-descriptions-item>
        <el-descriptions-item label="动作">{{ detail.action }}</el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">{{ detail.description }}</el-descriptions-item>
        <el-descriptions-item label="方法">{{ detail.method }}</el-descriptions-item>
        <el-descriptions-item label="路径">
          <span class="mono">{{ detail.path }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="IP">{{ detail.ip }}</el-descriptions-item>
        <el-descriptions-item label="耗时">{{ detail.durationMs }}ms</el-descriptions-item>
        <el-descriptions-item label="UA" :span="2">{{ detail.userAgent || '—' }}</el-descriptions-item>
        <el-descriptions-item label="状态" :span="2">
          <el-tag :type="detail.status === 'success' ? 'success' : 'danger'" effect="light">
            {{ detail.status === 'success' ? '成功' : '失败' }}
          </el-tag>
          <span v-if="detail.errorMessage" class="error-msg">{{ detail.errorMessage }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="时间" :span="2">{{ formatDate(detail.createdAt) }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, RefreshRight, Delete } from '@element-plus/icons-vue';
import dayjs from 'dayjs';

import {
  operationLogApi,
  type OperationLogItem,
  type OperationLogQuery,
} from '@/api/operation-log';
import Pagination from '@/components/pagination/index.vue';
import { formatDate } from '@/utils/format';

const list = ref<OperationLogItem[]>([]);
const total = ref(0);
const loading = ref(false);

const query = reactive<OperationLogQuery>({
  page: 1,
  pageSize: 20,
  keyword: '',
  username: '',
  module: '',
  status: undefined,
  startDate: undefined,
  endDate: undefined,
});

const dateRange = ref<[string, string] | null>(null);

watch(dateRange, (val) => {
  query.startDate = val?.[0];
  query.endDate = val?.[1];
});

const detailVisible = ref(false);
const detail = ref<OperationLogItem | null>(null);

async function loadData() {
  loading.value = true;
  try {
    const res = await operationLogApi.page(query);
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
  query.username = '';
  query.module = '';
  query.status = undefined;
  dateRange.value = null;
  reload();
}

async function viewDetail(row: OperationLogItem) {
  detail.value = await operationLogApi.detail(row.id);
  detailVisible.value = true;
}

async function handleClear() {
  try {
    const { value } = await ElMessageBox.prompt(
      '将清理 90 天前的操作日志，请输入 "DELETE LOGS" 确认',
      '危险操作',
      {
        confirmButtonText: '确认清理',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger',
        inputPattern: /^DELETE LOGS$/,
        inputErrorMessage: '输入不匹配',
      },
    );
    const beforeDate = dayjs().subtract(90, 'day').format('YYYY-MM-DD');
    const res = await operationLogApi.clear({ beforeDate, confirm: value });
    ElMessage.success(`已清理 ${res.removed} 条日志`);
    loadData();
  } catch {
    /* canceled */
  }
}

onMounted(loadData);
</script>

<style lang="scss" scoped>
.error-msg {
  color: #dc2626;
  margin-left: 12px;
  font-size: 12px;
}
</style>
