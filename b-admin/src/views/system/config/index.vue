<template>
  <div class="page-container" v-loading="loading">
    <div class="page-card">
      <el-tabs v-model="activeGroup" tab-position="left" class="config-tabs">
        <el-tab-pane v-for="g in groups" :key="g.groupCode" :name="g.groupCode" :label="g.groupName">
          <div class="config-form">
            <el-form
              ref="formRefs"
              :model="formMap[g.groupCode]"
              label-width="180px"
              style="max-width: 720px"
            >
              <el-form-item v-for="item in g.items" :key="item.key" :label="item.label">
                <!-- 单行 -->
                <el-input
                  v-if="item.type === 'input'"
                  v-model="formMap[g.groupCode][item.key]"
                  style="width: 360px"
                />
                <!-- 多行 -->
                <el-input
                  v-else-if="item.type === 'textarea'"
                  v-model="formMap[g.groupCode][item.key]"
                  type="textarea"
                  :rows="4"
                  style="width: 480px"
                />
                <!-- 数字 -->
                <el-input-number
                  v-else-if="item.type === 'number'"
                  :model-value="Number(formMap[g.groupCode][item.key]) || 0"
                  @update:model-value="(v: number | undefined) => (formMap[g.groupCode][item.key] = String(v ?? 0))"
                  :min="0"
                />
                <!-- 开关 -->
                <el-switch
                  v-else-if="item.type === 'switch'"
                  :model-value="formMap[g.groupCode][item.key] === '1'"
                  @update:model-value="(v: unknown) => (formMap[g.groupCode][item.key] = v ? '1' : '0')"
                />
                <!-- 图片 -->
                <ImageUpload
                  v-else-if="item.type === 'image'"
                  v-model="formMap[g.groupCode][item.key]"
                  prefix="config"
                />
                <!-- 下拉 -->
                <el-select
                  v-else-if="item.type === 'select'"
                  v-model="formMap[g.groupCode][item.key]"
                  style="width: 240px"
                >
                  <el-option
                    v-for="opt in parseOptions(item.options)"
                    :key="opt.value"
                    :value="opt.value"
                    :label="opt.label"
                  />
                </el-select>
                <!-- 默认 -->
                <el-input v-else v-model="formMap[g.groupCode][item.key]" style="width: 360px" />

                <div v-if="item.hint" class="hint">{{ item.hint }}</div>
              </el-form-item>

              <el-form-item>
                <el-button type="primary" :loading="saving" @click="onSave(g.groupCode)">
                  保存当前分组
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';

import { configApi, type ConfigGroup } from '@/api/config';
import ImageUpload from '@/components/image-upload/index.vue';

const groups = ref<ConfigGroup[]>([]);
const formMap = reactive<Record<string, Record<string, string>>>({});
const activeGroup = ref('');
const loading = ref(false);
const saving = ref(false);

function parseOptions(s?: string): Array<{ value: string; label: string }> {
  if (!s) return [];
  try {
    const parsed: unknown = JSON.parse(s);
    if (Array.isArray(parsed)) return parsed as Array<{ value: string; label: string }>;
  } catch {
    /* ignore */
  }
  return [];
}

async function loadData() {
  loading.value = true;
  try {
    groups.value = await configApi.groups();
    for (const g of groups.value) {
      const dict: Record<string, string> = {};
      for (const item of g.items) dict[item.key] = item.value || '';
      formMap[g.groupCode] = dict;
    }
    if (groups.value.length) activeGroup.value = groups.value[0].groupCode;
  } finally {
    loading.value = false;
  }
}

async function onSave(groupCode: string) {
  saving.value = true;
  try {
    await configApi.saveGroup(groupCode, formMap[groupCode]);
    ElMessage.success('保存成功');
  } finally {
    saving.value = false;
  }
}

onMounted(loadData);
</script>

<style lang="scss" scoped>
.config-tabs {
  :deep(.el-tabs__item) {
    text-align: left;
    padding-right: 24px;
  }
}

.config-form {
  padding: 8px 0 24px 16px;
}

.hint {
  margin-top: 4px;
  color: $text-placeholder;
  font-size: 12px;
  line-height: 1.5;
}
</style>
