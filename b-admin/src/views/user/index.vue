<template>
  <div class="page-container">
    <div class="page-card">
      <el-form inline :model="query" class="table-filter" @submit.prevent>
        <el-form-item label="关键字">
          <el-input
            v-model="query.keyword"
            placeholder="昵称/手机号"
            clearable
            style="width: 200px"
            @keyup.enter="reload"
          />
        </el-form-item>
        <el-form-item label="性别">
          <el-select v-model="query.gender" placeholder="全部" clearable style="width: 110px">
            <el-option :value="1" label="男" />
            <el-option :value="2" label="女" />
            <el-option :value="0" label="未知" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 120px">
            <el-option :value="1" label="正常" />
            <el-option :value="0" label="封禁" />
          </el-select>
        </el-form-item>
        <el-form-item label="注册时间">
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
        <el-table-column label="头像" width="70">
          <template #default="{ row }">
            <el-avatar :src="row.avatar" :size="36">{{ row.nickname?.[0] }}</el-avatar>
          </template>
        </el-table-column>
        <el-table-column prop="nickname" label="昵称" min-width="140" />
        <el-table-column label="性别" width="80" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.gender === 1" color="#3b82f6"><Male /></el-icon>
            <el-icon v-else-if="row.gender === 2" color="#ec4899"><Female /></el-icon>
            <span v-else class="text-placeholder">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="140" />
        <el-table-column label="订单数" width="100" align="right">
          <template #default="{ row }">
            <span class="tabular-nums">{{ row.totalOrders || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="累计消费" width="140" align="right">
          <template #default="{ row }">
            <span class="tabular-nums">{{ formatMoney(row.totalAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="注册时间" width="170">
          <template #default="{ row }">{{ formatDate(row.registeredAt) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <StatusTag :value="row.status" :text-map="{ '0': '封禁', '1': '正常' }" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="$router.push(`/user/detail/${row.id}`)">
              详情
            </el-button>
            <el-popconfirm
              :title="row.status === 1 ? '确认封禁该用户？' : '确认解除封禁？'"
              @confirm="handleToggle(row)"
            >
              <template #reference>
                <el-button link :type="row.status === 1 ? 'danger' : 'success'">
                  {{ row.status === 1 ? '封禁' : '解封' }}
                </el-button>
              </template>
            </el-popconfirm>
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Search, RefreshRight, Male, Female } from '@element-plus/icons-vue';

import { userApi, type UserItem, type UserQuery } from '@/api/user';
import StatusTag from '@/components/status-tag/index.vue';
import Pagination from '@/components/pagination/index.vue';
import { formatDate, formatMoney } from '@/utils/format';

const list = ref<UserItem[]>([]);
const total = ref(0);
const loading = ref(false);

const query = reactive<UserQuery>({
  page: 1,
  pageSize: 20,
  keyword: '',
  status: undefined,
  gender: undefined,
  startDate: undefined,
  endDate: undefined,
});

const dateRange = ref<[string, string] | null>(null);

watch(dateRange, (val) => {
  query.startDate = val?.[0];
  query.endDate = val?.[1];
});

async function loadData() {
  loading.value = true;
  try {
    const res = await userApi.page(query);
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
  query.status = undefined;
  query.gender = undefined;
  dateRange.value = null;
  reload();
}

async function handleToggle(row: UserItem) {
  await userApi.toggleStatus(row.id, row.status === 1 ? 0 : 1);
  ElMessage.success('操作成功');
  loadData();
}

onMounted(loadData);
</script>

<style lang="scss" scoped>
.text-placeholder {
  color: $text-placeholder;
}
</style>
