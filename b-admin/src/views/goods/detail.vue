<template>
  <div class="page-container" v-loading="loading">
    <div class="page-card" v-if="data">
      <div class="flex-between" style="margin-bottom: 24px">
        <h2 class="page-title">{{ data.name }}</h2>
        <div>
          <el-button :icon="Edit" type="primary" @click="$router.push(`/goods/edit/${data.id}`)">
            编辑
          </el-button>
          <el-button @click="$router.back()">返回</el-button>
        </div>
      </div>

      <!-- 主图 + 轮播 -->
      <div class="goods-gallery">
        <el-image
          :src="data.mainImage"
          fit="cover"
          class="main-image"
          :preview-src-list="[data.mainImage, ...(data.images || [])]"
          hide-on-click-modal
        />
        <div class="thumb-list">
          <el-image
            v-for="(img, i) in data.images || []"
            :key="i"
            :src="img"
            fit="cover"
            class="thumb"
            :preview-src-list="[data.mainImage, ...(data.images || [])]"
            :initial-index="i + 1"
            hide-on-click-modal
          />
        </div>
      </div>

      <el-descriptions :column="3" border style="margin-top: 24px">
        <el-descriptions-item label="ID">{{ data.id }}</el-descriptions-item>
        <el-descriptions-item label="分类">{{ data.categoryName || '—' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <StatusTag :value="data.status" :text-map="{ '0': '下架', '1': '上架' }" />
        </el-descriptions-item>
        <el-descriptions-item label="销售价">
          <span class="tabular-nums" style="color: #f97316; font-weight: 600">
            {{ formatMoney(data.price) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="市场价">
          <span class="tabular-nums">{{ formatMoney(data.marketPrice || 0) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="成本价">
          <span class="tabular-nums">{{ formatMoney(data.costPrice || 0) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="库存">
          <span class="tabular-nums">{{ data.stock }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="销量">
          <span class="tabular-nums">{{ data.sales || 0 }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="单位">{{ data.unit || '—' }}</el-descriptions-item>
        <el-descriptions-item label="副标题" :span="3">{{ data.subTitle || '—' }}</el-descriptions-item>
      </el-descriptions>

      <!-- SKU -->
      <div v-if="data.specs?.length" style="margin-top: 24px">
        <div class="section-title">SKU 列表</div>
        <el-table :data="data.specs" border>
          <el-table-column prop="attrText" label="规格" min-width="200" />
          <el-table-column prop="skuCode" label="编码" width="160" />
          <el-table-column label="价格" width="120" align="right">
            <template #default="{ row }">
              <span class="tabular-nums">{{ formatMoney(row.price) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="stock" label="库存" width="100" align="right" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <StatusTag :value="row.status" />
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 详情 -->
      <div style="margin-top: 24px">
        <div class="section-title">商品详情</div>
        <div class="rich-content" v-html="data.detail || '<p>无详情</p>'" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { Edit } from '@element-plus/icons-vue';

import { goodsApi, type GoodsItem } from '@/api/goods';
import StatusTag from '@/components/status-tag/index.vue';
import { formatMoney } from '@/utils/format';

const route = useRoute();
const id = computed(() => Number(route.params.id) || 0);
const loading = ref(false);
const data = ref<GoodsItem | null>(null);

async function load() {
  loading.value = true;
  try {
    data.value = await goodsApi.detail(id.value);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style lang="scss" scoped>
.page-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: $text-primary;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: $text-primary;
}

.goods-gallery {
  display: flex;
  gap: 16px;
}

.main-image {
  width: 360px;
  height: 360px;
  border-radius: $radius-md;
  background: $bg-hover;
}

.thumb-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.thumb {
  width: 64px;
  height: 64px;
  border-radius: $radius-sm;
  border: 1px solid $border-light;
  cursor: pointer;
}

.rich-content {
  padding: 16px;
  background: $bg-hover;
  border-radius: $radius-md;

  :deep(img) {
    max-width: 100%;
  }
}
</style>
