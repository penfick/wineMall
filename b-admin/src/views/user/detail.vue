<template>
  <div class="page-container" v-loading="loading">
    <div class="page-card" v-if="data">
      <div class="flex-between" style="margin-bottom: 24px">
        <div class="user-head">
          <el-avatar :src="data.avatar" :size="64">{{ data.nickname?.[0] }}</el-avatar>
          <div class="user-meta">
            <h2 class="page-title">{{ data.nickname }}</h2>
            <div class="text-secondary">
              ID: {{ data.id }} · {{ data.phone || '未绑定手机' }} ·
              <StatusTag :value="data.status" :text-map="{ '0': '封禁', '1': '正常' }" />
            </div>
          </div>
        </div>
        <el-button @click="$router.back()">返回</el-button>
      </div>

      <el-row :gutter="16">
        <el-col :span="8">
          <div class="stat-card">
            <div class="stat-label">订单数</div>
            <div class="stat-num tabular-nums">{{ data.totalOrders || 0 }}</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="stat-card">
            <div class="stat-label">累计消费</div>
            <div class="stat-num tabular-nums" style="color: #f97316">
              {{ formatMoney(data.totalAmount) }}
            </div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="stat-card">
            <div class="stat-label">收货地址</div>
            <div class="stat-num tabular-nums">{{ addresses.length }}</div>
          </div>
        </el-col>
      </el-row>

      <el-tabs v-model="tab" style="margin-top: 24px">
        <el-tab-pane label="基本信息" name="info">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="OpenID">{{ data.openid }}</el-descriptions-item>
            <el-descriptions-item label="性别">
              {{ data.gender === 1 ? '男' : data.gender === 2 ? '女' : '未知' }}
            </el-descriptions-item>
            <el-descriptions-item label="手机号">{{ data.phone || '—' }}</el-descriptions-item>
            <el-descriptions-item label="注册时间">{{ formatDate(data.registeredAt) }}</el-descriptions-item>
            <el-descriptions-item label="最近登录">
              {{ data.lastLoginAt ? formatDate(data.lastLoginAt) : '—' }}
            </el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <el-tab-pane label="收货地址" name="address">
          <el-table :data="addresses" border>
            <el-table-column prop="name" label="收货人" width="140" />
            <el-table-column prop="phone" label="电话" width="140" />
            <el-table-column label="地址" min-width="280">
              <template #default="{ row }">
                {{ row.province }} {{ row.city }} {{ row.district }} {{ row.detail }}
              </template>
            </el-table-column>
            <el-table-column label="默认" width="80">
              <template #default="{ row }">
                <el-tag v-if="row.isDefault" type="success" size="small">默认</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="订单记录" name="orders">
          <el-table v-loading="ordersLoading" :data="orders" border>
            <el-table-column prop="orderNo" label="订单号" min-width="180">
              <template #default="{ row }">
                <el-link type="primary" @click="$router.push(`/order/detail/${row.id}`)">
                  {{ row.orderNo }}
                </el-link>
              </template>
            </el-table-column>
            <el-table-column label="金额" width="140" align="right">
              <template #default="{ row }">
                <span class="tabular-nums">{{ formatMoney(row.totalAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="120">
              <template #default="{ row }">
                <StatusTag :value="row.status" :text-map="ORDER_STATUS" />
              </template>
            </el-table-column>
            <el-table-column label="下单时间" width="170">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
          <Pagination
            v-model:page="ordersQuery.page"
            v-model:page-size="ordersQuery.pageSize"
            :total="ordersTotal"
            @change="loadOrders"
          />
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';

import { userApi, type UserItem, type UserAddress, type UserOrderSummary } from '@/api/user';
import StatusTag from '@/components/status-tag/index.vue';
import Pagination from '@/components/pagination/index.vue';
import { formatDate, formatMoney } from '@/utils/format';

const ORDER_STATUS: Record<string, string> = {
  '0': '待付款',
  '1': '待发货',
  '2': '待收货',
  '3': '已完成',
  '4': '已取消',
  '5': '退款中',
};

const route = useRoute();
const id = computed(() => Number(route.params.id) || 0);

const loading = ref(false);
const data = ref<UserItem | null>(null);
const addresses = ref<UserAddress[]>([]);
const tab = ref('info');

const orders = ref<UserOrderSummary[]>([]);
const ordersTotal = ref(0);
const ordersLoading = ref(false);
const ordersQuery = reactive({ page: 1, pageSize: 10 });

async function load() {
  loading.value = true;
  try {
    const [d, a] = await Promise.all([userApi.detail(id.value), userApi.addresses(id.value)]);
    data.value = d;
    addresses.value = a;
  } finally {
    loading.value = false;
  }
  loadOrders();
}

async function loadOrders() {
  ordersLoading.value = true;
  try {
    const res = await userApi.orders(id.value, ordersQuery);
    orders.value = res.list;
    ordersTotal.value = res.total;
  } finally {
    ordersLoading.value = false;
  }
}

onMounted(load);
</script>

<style lang="scss" scoped>
.page-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.user-head {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.text-secondary {
  color: $text-placeholder;
  font-size: 13px;
}

.stat-card {
  background: $bg-hover;
  border-radius: $radius-md;
  padding: 16px;

  .stat-label {
    color: $text-placeholder;
    font-size: 13px;
    margin-bottom: 8px;
  }

  .stat-num {
    font-size: 24px;
    font-weight: 600;
    color: $text-primary;
  }
}
</style>
