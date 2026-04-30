import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { cartApi, type CartItem } from '@/api/cart';

export type { CartItem };

export const useCartStore = defineStore('cart', () => {
  const list = ref<CartItem[]>([]);
  const loading = ref(false);

  const totalCount = computed(() =>
    list.value.filter((i) => !i.invalid).reduce((sum, i) => sum + i.qty, 0),
  );

  const selectedItems = computed(() =>
    list.value.filter((i) => i.selected && !i.invalid),
  );

  const selectedAmount = computed(() =>
    selectedItems.value.reduce((sum, i) => sum + i.price * i.qty, 0),
  );

  const allSelected = computed(() => {
    const valid = list.value.filter((i) => !i.invalid);
    return valid.length > 0 && valid.every((i) => i.selected);
  });

  async function load() {
    loading.value = true;
    try {
      const result = await cartApi.list();
      list.value = result.list;
    } finally {
      loading.value = false;
    }
  }

  async function add(skuId: number, qty: number) {
    await cartApi.add(skuId, qty);
    await load();
  }

  async function updateQty(skuId: number, qty: number) {
    await cartApi.updateQty(skuId, qty);
    const item = list.value.find((i) => i.skuId === skuId);
    if (item) item.qty = qty;
  }

  async function remove(skuIds: number[]) {
    if (!skuIds.length) return;
    if (skuIds.length === 1) {
      await cartApi.remove(skuIds[0]);
    } else {
      await cartApi.batchRemove(skuIds);
    }
    list.value = list.value.filter((i) => !skuIds.includes(i.skuId));
  }

  async function toggleSelect(skuId: number) {
    const item = list.value.find((i) => i.skuId === skuId);
    if (!item || item.invalid) return;
    const next = !item.selected;
    await cartApi.setSelected(skuId, next);
    item.selected = next;
  }

  async function toggleAll(val: boolean) {
    await cartApi.selectAll(val);
    list.value.forEach((i) => {
      if (!i.invalid) i.selected = val;
    });
  }

  function clear() {
    list.value = [];
  }

  async function clearAll() {
    await cartApi.clear();
    list.value = [];
  }

  return {
    list,
    loading,
    totalCount,
    selectedItems,
    selectedAmount,
    allSelected,
    load,
    add,
    updateQty,
    remove,
    toggleSelect,
    toggleAll,
    clear,
    clearAll,
  };
});
