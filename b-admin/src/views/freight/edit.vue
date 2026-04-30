<template>
  <div class="page-container" v-loading="loading">
    <div class="page-card">
      <div class="flex-between" style="margin-bottom: 24px">
        <h2 class="page-title">{{ isEdit ? '编辑运费模板' : '新增运费模板' }}</h2>
        <el-button @click="$router.back()">返回</el-button>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" style="max-width: 900px">
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="form.name" maxlength="30" style="width: 320px" />
        </el-form-item>

        <el-form-item label="计费方式">
          <el-radio-group v-model="form.chargeType">
            <el-radio value="qty">按件数</el-radio>
            <el-radio value="weight">按重量(kg)</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="设为默认">
          <el-switch v-model="defaultBool" />
          <span class="text-secondary" style="margin-left: 12px">默认模板将用于未指定模板的商品</span>
        </el-form-item>

        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-divider content-position="left">运费规则</el-divider>

        <div v-for="(rule, idx) in form.rules || []" :key="idx" class="rule-block">
          <div class="rule-head">
            <span class="rule-title">规则 {{ idx + 1 }}</span>
            <el-button v-if="(form.rules?.length || 0) > 1" link type="danger" @click="removeRule(idx)">
              删除规则
            </el-button>
          </div>
          <el-form-item label="适用区域">
            <el-select
              v-model="rule.regionCodes"
              multiple
              filterable
              clearable
              placeholder="留空表示其他地区"
              style="width: 100%"
            >
              <el-option
                v-for="r in regions"
                :key="r.code"
                :value="r.code"
                :label="r.name"
              />
            </el-select>
          </el-form-item>
          <div class="rule-row">
            <el-form-item label="首件/重">
              <el-input-number v-model="rule.firstQty" :min="1" :precision="form.chargeType === 'weight' ? 2 : 0" />
            </el-form-item>
            <el-form-item label="首费(元)">
              <el-input-number v-model="rule.firstFee" :min="0" :precision="2" />
            </el-form-item>
            <el-form-item label="续件/重">
              <el-input-number v-model="rule.extraQty" :min="0" :precision="form.chargeType === 'weight' ? 2 : 0" />
            </el-form-item>
            <el-form-item label="续费(元)">
              <el-input-number v-model="rule.extraFee" :min="0" :precision="2" />
            </el-form-item>
            <el-form-item label="包邮门槛">
              <el-input-number v-model="rule.freeThreshold" :min="0" :precision="2" />
              <span class="text-secondary" style="margin-left: 8px">0=不包邮</span>
            </el-form-item>
          </div>
        </div>

        <el-button :icon="Plus" @click="addRule">添加规则</el-button>

        <div style="margin-top: 32px">
          <el-button type="primary" :loading="saving" @click="onSubmit">保存</el-button>
          <el-button @click="$router.back()">取消</el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';

import { freightApi, type FreightTemplate, type FreightRule } from '@/api/freight';
import { regionApi } from '@/api/region';

const route = useRoute();
const router = useRouter();
const id = computed(() => Number(route.params.id) || 0);
const isEdit = computed(() => id.value > 0);

const formRef = ref<FormInstance>();
const loading = ref(false);
const saving = ref(false);
const regions = ref<Array<{ code: string; name: string }>>([]);

const form = reactive<Partial<FreightTemplate>>({
  name: '',
  chargeType: 'qty',
  status: 1,
  isDefault: 0,
  rules: [createEmptyRule()],
});

const defaultBool = computed({
  get: () => form.isDefault === 1,
  set: (v: boolean) => (form.isDefault = v ? 1 : 0),
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
};

function createEmptyRule(): FreightRule {
  return { regionCodes: [], firstQty: 1, firstFee: 10, extraQty: 1, extraFee: 5, freeThreshold: 0 };
}

function addRule() {
  form.rules!.push(createEmptyRule());
}

function removeRule(idx: number) {
  form.rules!.splice(idx, 1);
}

async function loadData() {
  if (!isEdit.value) return;
  loading.value = true;
  try {
    const data = await freightApi.detail(id.value);
    Object.assign(form, data);
    if (!form.rules?.length) form.rules = [createEmptyRule()];
  } finally {
    loading.value = false;
  }
}

async function loadRegions() {
  try {
    const tree = await regionApi.tree();
    // 扁平化前两级（省/市）作为下拉选项
    const flat: Array<{ code: string; name: string }> = [];
    for (const p of tree as Array<{ code: string; name: string; children?: Array<{ code: string; name: string }> }>) {
      flat.push({ code: p.code, name: p.name });
      for (const c of p.children || []) flat.push({ code: c.code, name: `${p.name} / ${c.name}` });
    }
    regions.value = flat;
  } catch {
    regions.value = [];
  }
}

async function onSubmit() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    if (!form.rules?.length) {
      ElMessage.warning('请至少添加一条规则');
      return;
    }
    saving.value = true;
    try {
      if (isEdit.value) {
        await freightApi.update(id.value, form);
      } else {
        await freightApi.create(form);
      }
      ElMessage.success('保存成功');
      router.push('/freight');
    } finally {
      saving.value = false;
    }
  });
}

onMounted(() => {
  loadRegions();
  loadData();
});
</script>

<style lang="scss" scoped>
.page-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.rule-block {
  padding: 16px;
  border: 1px dashed $border-base;
  border-radius: $radius-md;
  margin-bottom: 16px;
  background: $bg-hover;
}

.rule-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  .rule-title {
    font-weight: 600;
    color: $text-primary;
  }
}

.rule-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;

  :deep(.el-form-item) {
    margin-right: 0;
    margin-bottom: 0;
  }
}

.text-secondary {
  color: $text-placeholder;
  font-size: 12px;
}
</style>
