<template>
  <el-popover :width="220" trigger="click" placement="bottom-end">
    <template #reference>
      <el-button :icon="Setting" link>列设置</el-button>
    </template>
    <div class="col-setting">
      <div class="col-setting-header flex-between">
        <el-checkbox
          :model-value="allChecked"
          :indeterminate="indeterminate"
          @change="toggleAll"
        >
          全选
        </el-checkbox>
        <el-button link type="primary" size="small" @click="reset">重置</el-button>
      </div>
      <el-divider style="margin: 8px 0" />
      <div class="col-setting-body">
        <el-checkbox
          v-for="col in columns"
          :key="col.prop"
          :model-value="checkedKeys.includes(col.prop)"
          @change="toggle(col.prop)"
        >
          {{ col.label }}
        </el-checkbox>
      </div>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { Setting } from '@element-plus/icons-vue';
import { StorageKey } from '@/constants/storage-key';

interface ColumnDef {
  prop: string;
  label: string;
}

const props = defineProps<{
  storageKey: string;
  columns: ColumnDef[];
}>();

const emit = defineEmits<{
  (e: 'change', visiblePropList: string[]): void;
}>();

const checkedKeys = ref<string[]>(props.columns.map((c) => c.prop));

const allChecked = computed(() => checkedKeys.value.length === props.columns.length);
const indeterminate = computed(
  () => checkedKeys.value.length > 0 && checkedKeys.value.length < props.columns.length,
);

const lsKey = computed(() => StorageKey.TABLE_COLUMNS(props.storageKey));

onMounted(() => {
  const saved = localStorage.getItem(lsKey.value);
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as string[];
      const valid = parsed.filter((p) => props.columns.some((c) => c.prop === p));
      if (valid.length) checkedKeys.value = valid;
    } catch {
      /* ignore */
    }
  }
  emit('change', checkedKeys.value);
});

watch(checkedKeys, (val) => {
  localStorage.setItem(lsKey.value, JSON.stringify(val));
  emit('change', val);
});

function toggle(prop: string) {
  if (checkedKeys.value.includes(prop)) {
    checkedKeys.value = checkedKeys.value.filter((k) => k !== prop);
  } else {
    checkedKeys.value = [...checkedKeys.value, prop];
  }
}

function toggleAll(val: unknown) {
  checkedKeys.value = val ? props.columns.map((c) => c.prop) : [];
}

function reset() {
  checkedKeys.value = props.columns.map((c) => c.prop);
  localStorage.removeItem(lsKey.value);
}
</script>

<style lang="scss" scoped>
.col-setting-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow: auto;
}
</style>
