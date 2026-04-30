<template>
  <div class="page-container" v-loading="loading">
    <div class="page-card" v-if="order">
      <!-- 头部 -->
      <div class="detail-header">
        <div>
          <div class="order-no mono">{{ order.orderNo }}</div>
          <div class="text-secondary">下单时间：{{ formatDate(order.createdAt) }}</div>
        </div>
        <el-tag :type="STATUS_TYPE[order.status]" size="large" effect="light">
          {{ STATUS_TEXT[order.status] }}
        </el-tag>
      </div>

      <!-- 步骤条 -->
      <el-steps
        :active="stepActive"
        align-center
        finish-status="success"
        style="margin: 24px 0"
      >
        <el-step title="提交订单" :description="formatDate(order.createdAt)" />
        <el-step title="支付" :description="order.paidAt ? formatDate(order.paidAt) : ''" />
        <el-step title="发货" :description="order.shippedAt ? formatDate(order.shippedAt) : ''" />
        <el-step title="完成" :description="order.finishedAt ? formatDate(order.finishedAt) : ''" />
      </el-steps>

      <!-- 收货 / 支付 / 物流 三栏 -->
      <div class="info-grid">
        <div class="info-block">
          <div class="info-title">收货信息</div>
          <div class="info-line"><span>收件人：</span>{{ order.receiverName }}</div>
          <div class="info-line"><span>电话：</span>
            <span class="tabular-nums">{{ order.receiverPhone }}</span>
          </div>
          <div class="info-line"><span>地址：</span>{{ order.receiverAddress }}</div>
        </div>
        <div class="info-block">
          <div class="info-title">支付信息</div>
          <div class="info-line"><span>支付方式：</span>{{ order.payType || '—' }}</div>
          <div class="info-line"><span>商品金额：</span>
            <span class="tabular-nums">{{ formatMoney(order.goodsAmount) }}</span>
          </div>
          <div class="info-line"><span>运费：</span>
            <span class="tabular-nums">{{ formatMoney(order.freightAmount) }}</span>
          </div>
          <div class="info-line"><span>实付：</span>
            <span class="tabular-nums" style="color: #f97316; font-weight: 600">
              {{ formatMoney(order.payAmount) }}
            </span>
          </div>
        </div>
        <div class="info-block">
          <div class="info-title">物流信息</div>
          <div class="info-line"><span>物流公司：</span>{{ order.expressCompany || '—' }}</div>
          <div class="info-line"><span>运单号：</span>
            <span class="mono">{{ order.expressNo || '—' }}</span>
          </div>
          <div class="info-line"><span>备注：</span>{{ order.remark || '—' }}</div>
        </div>
      </div>

      <!-- 商品列表 -->
      <div class="info-title" style="margin-top: 24px">商品列表</div>
      <el-table :data="order.items || []" border style="margin-top: 8px">
        <el-table-column label="商品" min-width="320">
          <template #default="{ row }">
            <div class="goods-cell">
              <el-image
                :src="row.goodsImage"
                fit="cover"
                style="width: 48px; height: 48px; border-radius: 4px"
              />
              <div>
                <div>{{ row.goodsName }}</div>
                <div class="text-secondary">{{ row.skuAttrText || '—' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="单价" width="120" align="right">
          <template #default="{ row }">
            <span class="tabular-nums">{{ formatMoney(row.price) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="80" align="right" />
        <el-table-column label="小计" width="140" align="right">
          <template #default="{ row }">
            <span class="tabular-nums">{{ formatMoney(row.amount) }}</span>
          </template>
        </el-table-column>
      </el-table>

      <!-- 操作 -->
      <div class="actions">
        <el-button v-if="order.status === 1" type="primary" @click="openShipDialog">发货</el-button>
        <el-button v-if="order.status === 0" @click="onCancel">取消订单</el-button>
        <el-button v-if="[1, 2, 3].includes(order.status)" @click="onRefund">退款</el-button>
        <el-button @click="onRemark">备注</el-button>
        <el-button @click="$router.back()">返回</el-button>
      </div>
    </div>

    <!-- 发货对话框 -->
    <el-dialog v-model="shipDialog" title="订单发货" width="480px" destroy-on-close>
      <el-form :model="shipForm" label-width="100px">
        <el-form-item label="物流公司" required>
          <el-select
            v-model="shipForm.logisticsCompanyId"
            placeholder="请选择物流公司"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="c in companies"
              :key="c.id"
              :label="c.name"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="运单号" required>
          <el-input v-model="shipForm.trackingNo" placeholder="请输入运单号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shipDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="onShip">确认发货</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';

import { orderApi, type OrderItem, type ShipDto } from '@/api/order';
import { logisticsApi, type LogisticsCompany } from '@/api/logistics';
import { formatMoney, formatDate } from '@/utils/format';

const route = useRoute();
const router = useRouter();

const id = computed(() => Number(route.params.id) || 0);
const loading = ref(false);
const order = ref<OrderItem | null>(null);
const saving = ref(false);

const shipDialog = ref(false);
const shipForm = reactive<ShipDto>({
  logisticsCompanyId: 0,
  trackingNo: '',
});
const companies = ref<LogisticsCompany[]>([]);

async function loadCompanies() {
  if (companies.value.length) return;
  companies.value = await logisticsApi.companyAll();
}

const STATUS_TEXT: Record<number, string> = {
  0: '待付款', 1: '待发货', 2: '待收货', 3: '已完成', 4: '已取消', 5: '退款中',
};
const STATUS_TYPE: Record<number, 'info' | 'warning' | 'primary' | 'success' | 'danger'> = {
  0: 'warning', 1: 'primary', 2: 'primary', 3: 'success', 4: 'info', 5: 'danger',
};

const stepActive = computed(() => {
  if (!order.value) return 0;
  const map: Record<number, number> = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 0, 5: 0 };
  return map[order.value.status] ?? 0;
});

async function load() {
  if (!id.value) return;
  loading.value = true;
  try {
    order.value = await orderApi.detail(id.value);
  } finally {
    loading.value = false;
  }
}

async function onShip() {
  if (!shipForm.logisticsCompanyId || !shipForm.trackingNo) {
    ElMessage.warning('请选择物流公司并填写运单号');
    return;
  }
  saving.value = true;
  try {
    await orderApi.ship(id.value, shipForm);
    ElMessage.success('发货成功');
    shipDialog.value = false;
    load();
  } finally {
    saving.value = false;
  }
}

async function onCancel() {
  const { value: reason } = await ElMessageBox.prompt('取消原因', '取消订单', {
    confirmButtonText: '确认',
    cancelButtonText: '关闭',
  });
  await orderApi.cancel(id.value, reason);
  ElMessage.success('已取消');
  load();
}

async function onRefund() {
  const { value: reason } = await ElMessageBox.prompt('退款原因', '退款', {
    confirmButtonText: '提交',
    cancelButtonText: '关闭',
  });
  await orderApi.refund(id.value, { reason });
  ElMessage.success('已提交退款');
  load();
}

async function onRemark() {
  const { value: remark } = await ElMessageBox.prompt('订单备注', '备注', {
    inputValue: order.value?.remark || '',
    confirmButtonText: '保存',
    cancelButtonText: '关闭',
  });
  await orderApi.remark(id.value, remark);
  ElMessage.success('已保存');
  load();
}

function openShipDialog() {
  loadCompanies();
  shipDialog.value = true;
}

onMounted(() => {
  load();
  if (route.query.action === 'ship') {
    setTimeout(openShipDialog, 200);
  }
  void router; // keep import
});
</script>

<style lang="scss" scoped>
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.order-no {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
  color: $text-primary;
}

.text-secondary {
  color: $text-placeholder;
  font-size: 13px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $space-md;
  background: $bg-hover;
  padding: $space-md;
  border-radius: $radius-md;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
}

.info-block {
  background: #fff;
  padding: $space-md;
  border-radius: $radius-sm;
}

.info-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: $text-primary;
}

.info-line {
  font-size: 13px;
  margin-bottom: 6px;
  color: $text-regular;

  span:first-child {
    color: $text-secondary;
  }
}

.goods-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.actions {
  margin-top: 24px;
  text-align: right;
}
</style>
