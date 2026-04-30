<template>
  <div class="page-container" v-loading="loading">
    <!-- Redis 概况 -->
    <div class="page-card" v-if="overview">
      <div class="section-title">Redis 概况</div>
      <el-row :gutter="16">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">Redis 版本</div>
            <div class="stat-value">{{ overview.redisVersion }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">已运行</div>
            <div class="stat-value tabular-nums">{{ overview.uptimeDays }} 天</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">连接客户端</div>
            <div class="stat-value tabular-nums">{{ overview.connectedClients }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">键总数</div>
            <div class="stat-value tabular-nums">{{ overview.totalKeys }}</div>
          </div>
        </el-col>
      </el-row>
      <el-row :gutter="16" style="margin-top: 16px">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">已用内存</div>
            <div class="stat-value">{{ overview.usedMemory }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">峰值内存</div>
            <div class="stat-value">{{ overview.usedMemoryPeak }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">命令总数</div>
            <div class="stat-value tabular-nums">{{ overview.totalCommands }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">QPS</div>
            <div class="stat-value tabular-nums">{{ overview.opsPerSec }}</div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 业务前缀 -->
    <div class="page-card" v-if="overview" style="margin-top: 16px">
      <div class="section-title">业务缓存分组</div>
      <el-table :data="overview.groups" border>
        <el-table-column prop="prefix" label="前缀" min-width="200" class-name="mono" />
        <el-table-column prop="description" label="说明" min-width="220" />
        <el-table-column prop="count" label="键数" width="120" align="right">
          <template #default="{ row }"><span class="tabular-nums">{{ row.count }}</span></template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-popconfirm
              :title="`确认清空前缀 ${row.prefix} 下所有缓存？此操作不可恢复！`"
              confirm-button-type="danger"
              @confirm="handleClear(row.prefix)"
            >
              <template #reference>
                <el-button link type="danger">清空</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 键查询 -->
    <div class="page-card" style="margin-top: 16px">
      <div class="section-title">键查询</div>
      <el-form inline :model="keyQuery" @submit.prevent>
        <el-form-item label="模式">
          <el-input
            v-model="keyQuery.pattern"
            placeholder="如 cache:goods:*"
            clearable
            style="width: 280px"
            @keyup.enter="loadKeys"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="loadKeys">查询</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="keysLoading" :data="keys" border>
        <el-table-column prop="key" label="键" min-width="280" class-name="mono" />
        <el-table-column prop="type" label="类型" width="100" />
        <el-table-column label="TTL" width="120" align="right">
          <template #default="{ row }">
            <span class="tabular-nums">{{ row.ttl < 0 ? '永久' : row.ttl + 's' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="大小" width="120" align="right">
          <template #default="{ row }"><span class="tabular-nums">{{ row.size }}</span></template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewValue(row.key)">查看</el-button>
            <el-popconfirm title="确认删除该键？" @confirm="handleRemoveKey(row.key)">
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <Pagination
        v-model:page="keyQuery.page"
        v-model:page-size="keyQuery.pageSize"
        :total="keysTotal"
        @change="loadKeys"
      />
    </div>

    <el-dialog v-model="valueVisible" title="键值详情" width="640px">
      <div class="kv-key mono">{{ valueDetail?.key }}</div>
      <pre class="kv-value">{{ formatValue(valueDetail?.value) }}</pre>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search } from '@element-plus/icons-vue';

import { cacheApi, type CacheOverview, type CacheKeyItem } from '@/api/cache';
import Pagination from '@/components/pagination/index.vue';

const loading = ref(false);
const overview = ref<CacheOverview | null>(null);

const keys = ref<CacheKeyItem[]>([]);
const keysTotal = ref(0);
const keysLoading = ref(false);
const keyQuery = reactive({ pattern: '', page: 1, pageSize: 20 });

const valueVisible = ref(false);
const valueDetail = ref<{ key: string; type: string; value: unknown } | null>(null);

async function loadOverview() {
  loading.value = true;
  try {
    overview.value = await cacheApi.overview();
  } finally {
    loading.value = false;
  }
}

async function loadKeys() {
  keysLoading.value = true;
  try {
    const res = await cacheApi.keys(keyQuery);
    keys.value = res.list;
    keysTotal.value = res.total;
  } finally {
    keysLoading.value = false;
  }
}

async function viewValue(key: string) {
  valueDetail.value = await cacheApi.value(key);
  valueVisible.value = true;
}

async function handleRemoveKey(key: string) {
  await cacheApi.remove(key);
  ElMessage.success('已删除');
  loadKeys();
}

async function handleClear(prefix: string) {
  // 二次确认：要求输入 confirm 文本
  try {
    const { value } = await ElMessageBox.prompt(
      `请输入 "DELETE ${prefix}" 以确认清空该前缀下所有缓存`,
      '危险操作',
      {
        confirmButtonText: '确认清空',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger',
        inputPattern: new RegExp(`^DELETE ${prefix}$`),
        inputErrorMessage: '输入不匹配',
      },
    );
    const res = await cacheApi.clear({ prefix, confirm: value });
    ElMessage.success(`已清理 ${res.removed} 个键`);
    loadOverview();
  } catch {
    /* user canceled */
  }
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '(nil)';
  if (typeof v === 'string') return v;
  return JSON.stringify(v, null, 2);
}

onMounted(() => {
  loadOverview();
  loadKeys();
});
</script>

<style lang="scss" scoped>
.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: $text-primary;
}

.stat-card {
  background: $bg-hover;
  padding: 16px;
  border-radius: $radius-md;

  .stat-label {
    color: $text-placeholder;
    font-size: 12px;
    margin-bottom: 8px;
  }

  .stat-value {
    font-size: 20px;
    font-weight: 600;
    color: $text-primary;
  }
}

.kv-key {
  font-size: 13px;
  color: $color-primary;
  margin-bottom: 12px;
}

.kv-value {
  background: $bg-hover;
  padding: 12px;
  border-radius: $radius-sm;
  max-height: 360px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
