<template>
  <div class="dashboard page-container">
    <!-- 第一行：4 KPI -->
    <div class="kpi-grid">
      <div v-for="kpi in kpiList" :key="kpi.label" class="kpi-card">
        <div class="kpi-label">{{ kpi.label }}</div>
        <div class="kpi-value tabular-nums" :style="{ color: kpi.color }">
          {{ kpi.value }}
        </div>
        <div class="kpi-extra">{{ kpi.extra }}</div>
      </div>
    </div>

    <!-- 第二行：趋势图 + 品类占比 -->
    <div class="chart-grid">
      <div class="page-card chart-card">
        <div class="card-header flex-between">
          <span class="card-title">近 30 天订单趋势</span>
          <el-radio-group v-model="trendDays" size="small" @change="loadTrend">
            <el-radio-button :value="7">7 天</el-radio-button>
            <el-radio-button :value="30">30 天</el-radio-button>
            <el-radio-button :value="90">90 天</el-radio-button>
          </el-radio-group>
        </div>
        <div ref="trendChartRef" class="chart-box" v-loading="trendLoading"></div>
      </div>

      <div class="page-card chart-card">
        <div class="card-header"><span class="card-title">分类成交占比</span></div>
        <div ref="categoryChartRef" class="chart-box" v-loading="categoryLoading"></div>
      </div>
    </div>

    <!-- 第三行：Top10 销量 -->
    <div class="page-card top10-card">
      <div class="card-header"><span class="card-title">销量 Top10</span></div>
      <el-table :data="top10List" v-loading="top10Loading" stripe size="default">
        <el-table-column type="index" label="排名" width="80" align="center">
          <template #default="{ $index }">
            <span class="rank-badge" :class="rankClass($index)">{{ $index + 1 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="goodsName" label="商品名称" min-width="240" show-overflow-tooltip />
        <el-table-column prop="qty" label="销量" width="120" align="right">
          <template #default="{ row }">
            <span class="tabular-nums">{{ formatNumber(row.qty) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="成交额" width="180" align="right">
          <template #default="{ row }">
            <span class="tabular-nums">{{ formatMoney(row.amount) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts/core';
import { LineChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

import { dashboardApi, type DashboardOverview, type TrendPoint, type CategoryShareItem, type TopGoodsItem } from '@/api/dashboard';
import { formatMoney, formatNumber } from '@/utils/format';

echarts.use([LineChart, PieChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

/* ==================== 状态 ==================== */
const overview = ref<DashboardOverview>({
  todayOrderCount: 0,
  todayAmount: 0,
  pendingShipCount: 0,
  onSaleGoodsCount: 0,
  lowStockCount: 0,
  totalUserCount: 0,
  todayNewUserCount: 0,
});

const trendDays = ref(30);
const trendData = ref<TrendPoint[]>([]);
const trendLoading = ref(false);
const trendChartRef = ref<HTMLDivElement>();
let trendChart: echarts.ECharts | null = null;

const categoryData = ref<CategoryShareItem[]>([]);
const categoryLoading = ref(false);
const categoryChartRef = ref<HTMLDivElement>();
let categoryChart: echarts.ECharts | null = null;

const top10List = ref<TopGoodsItem[]>([]);
const top10Loading = ref(false);

/* ==================== KPI 计算 ==================== */
const kpiList = computed(() => [
  {
    label: '今日订单',
    value: formatNumber(overview.value.todayOrderCount),
    color: '#409eff',
    extra: `今日新增用户 ${overview.value.todayNewUserCount}`,
  },
  {
    label: '今日成交额',
    value: formatMoney(overview.value.todayAmount),
    color: '#f97316',
    extra: '已支付订单实付总额',
  },
  {
    label: '待发货',
    value: formatNumber(overview.value.pendingShipCount),
    color: '#e6a23c',
    extra: '需要尽快处理',
  },
  {
    label: '在售商品',
    value: formatNumber(overview.value.onSaleGoodsCount),
    color: '#67c23a',
    extra: `库存预警 ${overview.value.lowStockCount} 件`,
  },
]);

/* ==================== 加载数据 ==================== */
async function loadOverview() {
  overview.value = await dashboardApi.overview();
}

async function loadTrend() {
  trendLoading.value = true;
  try {
    trendData.value = await dashboardApi.trend(trendDays.value);
    renderTrend();
  } finally {
    trendLoading.value = false;
  }
}

async function loadCategoryShare() {
  categoryLoading.value = true;
  try {
    categoryData.value = await dashboardApi.categoryShare();
    renderCategory();
  } finally {
    categoryLoading.value = false;
  }
}

async function loadTop10() {
  top10Loading.value = true;
  try {
    top10List.value = await dashboardApi.top10();
  } finally {
    top10Loading.value = false;
  }
}

/* ==================== 图表渲染 ==================== */
function renderTrend() {
  if (!trendChartRef.value) return;
  trendChart ??= echarts.init(trendChartRef.value);
  const dates = trendData.value.map((d) => d.date.slice(5));
  trendChart.setOption({
    grid: { left: 56, right: 24, top: 36, bottom: 32 },
    tooltip: {
      trigger: 'axis',
      formatter: (params: { name: string; value: number; seriesName: string }[]) => {
        const date = params[0].name;
        return `<b>${date}</b><br/>${params
          .map((p) => `${p.seriesName}：${p.seriesName === '成交额' ? formatMoney(p.value) : p.value}`)
          .join('<br/>')}`;
      },
    },
    legend: { data: ['订单数', '成交额'], bottom: 0 },
    xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: '#dcdfe6' } } },
    yAxis: [
      { type: 'value', name: '订单数', position: 'left' },
      { type: 'value', name: '成交额', position: 'right', axisLabel: { formatter: '¥{value}' } },
    ],
    series: [
      {
        name: '订单数',
        type: 'line',
        smooth: true,
        data: trendData.value.map((d) => d.orderCount),
        itemStyle: { color: '#409eff' },
        areaStyle: { color: 'rgba(64, 158, 255, 0.15)' },
      },
      {
        name: '成交额',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: trendData.value.map((d) => d.amount),
        itemStyle: { color: '#f97316' },
      },
    ],
  });
}

function renderCategory() {
  if (!categoryChartRef.value) return;
  categoryChart ??= echarts.init(categoryChartRef.value);
  categoryChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (p: { name: string; value: number; percent: number }) =>
        `${p.name}<br/>成交额：${formatMoney(p.value)}<br/>占比：${p.percent}%`,
    },
    legend: { type: 'scroll', orient: 'vertical', right: 0, top: 'middle' },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: true,
        label: { show: false },
        data: categoryData.value.map((c) => ({ name: c.categoryName, value: c.amount })),
      },
    ],
  });
}

function rankClass(idx: number) {
  return idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : '';
}

/* ==================== 生命周期 ==================== */
function handleResize() {
  trendChart?.resize();
  categoryChart?.resize();
}

onMounted(async () => {
  await Promise.all([loadOverview(), loadTrend(), loadCategoryShare(), loadTop10()]);
  await nextTick();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  trendChart?.dispose();
  categoryChart?.dispose();
});

watch(trendData, () => renderTrend());
</script>

<style lang="scss" scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: $space-md;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $space-md;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.kpi-card {
  background: #fff;
  border-radius: $radius-md;
  padding: $space-lg;
  box-shadow: $shadow-card;
  transition: box-shadow $transition-base, transform $transition-base;

  &:hover {
    box-shadow: $shadow-md;
    transform: translateY(-1px);
  }

  .kpi-label {
    color: $text-secondary;
    font-size: 13px;
  }

  .kpi-value {
    margin: 8px 0 4px;
    font-size: 26px;
    font-weight: 600;
    line-height: 1.2;
  }

  .kpi-extra {
    font-size: 12px;
    color: $text-placeholder;
  }
}

.chart-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: $space-md;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  background: #fff;
  border-radius: $radius-md;
  padding: $space-lg;
  box-shadow: $shadow-card;
}

.card-header {
  margin-bottom: $space-md;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: $text-primary;
}

.chart-box {
  height: 320px;
}

.top10-card {
  background: #fff;
  border-radius: $radius-md;
  padding: $space-lg;
  box-shadow: $shadow-card;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: $radius-pill;
  background: $bg-hover;
  color: $text-secondary;
  font-size: 12px;
  font-weight: 600;
  font-family: $font-family-mono;

  &.rank-1 { background: #faad14; color: #fff; }
  &.rank-2 { background: #bfbfbf; color: #fff; }
  &.rank-3 { background: #d4691a; color: #fff; }
}
</style>
