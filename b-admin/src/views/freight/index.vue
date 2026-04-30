<template>
  <div class="page-container">
    <div class="page-card">
      <el-form inline :model="query" class="table-filter" @submit.prevent>
        <el-form-item label="模板名称">
          <el-input
            v-model="query.keyword"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="reload"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 120px">
            <el-option :value="1" label="启用" />
            <el-option :value="0" label="禁用" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="reload">查询</el-button>
          <el-button :icon="RefreshRight" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <div style="margin-bottom: 12px">
        <el-button type="primary" :icon="Plus" @click="$router.push('/freight/edit')">
          新增运费模板
        </el-button>
      </div>

      <el-table v-loading="loading" :data="list" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="模板名称" min-width="180">
          <template #default="{ row }">
            {{ row.name }}
            <el-tag v-if="row.isDefault" type="success" size="small" effect="light">默认</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="计费方式" width="100">
          <template #default="{ row }">
            <el-tag :type="row.chargeType === 'qty' ? 'primary' : 'warning'" effect="light">
              {{ row.chargeType === 'qty' ? '按件' : '按重量' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="规则数" width="100" align="center">
          <template #default="{ row }">{{ row.rules?.length || 0 }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <StatusTag :value="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="$router.push(`/freight/edit/${row.id}`)">
              编辑
            </el-button>
            <el-button
              v-if="!row.isDefault"
              link
              type="success"
              @click="handleSetDefault(row)"
            >
              设为默认
            </el-button>
            <el-popconfirm title="确认删除该模板？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button link type="danger" :disabled="row.isDefault">删除</el-button>
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
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Search, RefreshRight, Plus } from '@element-plus/icons-vue';

import { freightApi, type FreightTemplate, type FreightQuery } from '@/api/freight';
import StatusTag from '@/components/status-tag/index.vue';
import Pagination from '@/components/pagination/index.vue';
import { formatDate } from '@/utils/format';

const list = ref<FreightTemplate[]>([]);
const total = ref(0);
const loading = ref(false);

const query = reactive<FreightQuery>({
  page: 1,
  pageSize: 20,
  keyword: '',
  status: undefined,
});

async function loadData() {
  loading.value = true;
  try {
    const res = await freightApi.page(query);
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
  reload();
}

async function handleSetDefault(row: FreightTemplate) {
  await freightApi.setDefault(row.id);
  ElMessage.success('已设为默认');
  loadData();
}

async function handleDelete(row: FreightTemplate) {
  await freightApi.remove(row.id);
  ElMessage.success('已删除');
  loadData();
}

onMounted(loadData);
</script>
