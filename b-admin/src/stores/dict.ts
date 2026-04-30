/**
 * 字典 store — 全站字典缓存
 *
 * 使用：
 *   const dict = useDictStore();
 *   const items = await dict.get('order_status');
 *   const label = dict.label('order_status', '1');
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';

import { dictApi, type DictItem } from '@/api/dict';

export const useDictStore = defineStore('dict', () => {
  const cache = ref<Record<string, DictItem[]>>({});
  const loading = ref<Record<string, Promise<DictItem[]>>>({});

  async function get(typeCode: string, force = false): Promise<DictItem[]> {
    if (!force && cache.value[typeCode]) return cache.value[typeCode];
    if (typeCode in loading.value) return loading.value[typeCode];

    const promise = dictApi
      .query(typeCode)
      .then((items) => {
        cache.value[typeCode] = items;
        delete loading.value[typeCode];
        return items;
      })
      .catch((err) => {
        delete loading.value[typeCode];
        throw err;
      });

    loading.value[typeCode] = promise;
    return promise;
  }

  function label(typeCode: string, value: string | number): string {
    const items = cache.value[typeCode];
    if (!items) return String(value);
    const found = items.find((it) => String(it.value) === String(value));
    return found?.label ?? String(value);
  }

  function cssClass(typeCode: string, value: string | number): string | undefined {
    const items = cache.value[typeCode];
    return items?.find((it) => String(it.value) === String(value))?.cssClass;
  }

  function refresh(typeCode: string) {
    return get(typeCode, true);
  }

  function reset() {
    cache.value = {};
    loading.value = {};
  }

  return { cache, get, label, cssClass, refresh, reset };
});
