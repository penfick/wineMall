import { defineStore } from 'pinia';
import { ref } from 'vue';
import { http } from '@/utils/request';

export interface DictItem {
  label: string;
  value: string;
  cssClass?: string;
}

export const useDictStore = defineStore('dict', () => {
  const dictMap = ref<Record<string, DictItem[]>>({});
  const loading = ref<Record<string, boolean>>({});

  async function load(types: string[]) {
    const need = types.filter((t) => !dictMap.value[t] && !loading.value[t]);
    if (!need.length) return;
    need.forEach((t) => (loading.value[t] = true));
    try {
      const res = await http.get<Record<string, DictItem[]>>('/dict/batch', {
        types: need.join(','),
      });
      Object.assign(dictMap.value, res);
    } finally {
      need.forEach((t) => (loading.value[t] = false));
    }
  }

  function get(type: string): DictItem[] {
    return dictMap.value[type] || [];
  }

  function label(type: string, value: string): string {
    return get(type).find((i) => i.value === value)?.label || value;
  }

  function clear() {
    dictMap.value = {};
  }

  return { dictMap, load, get, label, clear };
});
