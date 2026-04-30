import { defineStore } from 'pinia';
import { ref } from 'vue';
import { addressApi, type Address, type AddressInput } from '@/api/address';

export type { Address, AddressInput };

export const useAddressStore = defineStore('address', () => {
  const list = ref<Address[]>([]);
  const loading = ref(false);

  async function load() {
    loading.value = true;
    try {
      list.value = await addressApi.list();
    } finally {
      loading.value = false;
    }
  }

  function detail(id: number) {
    return addressApi.detail(id);
  }

  async function create(payload: AddressInput) {
    const created = await addressApi.create(payload);
    await load();
    return created;
  }

  async function update(id: number, payload: Partial<AddressInput>) {
    const updated = await addressApi.update(id, payload);
    await load();
    return updated;
  }

  async function remove(id: number) {
    await addressApi.remove(id);
    list.value = list.value.filter((a) => a.id !== id);
  }

  async function setDefault(id: number) {
    await addressApi.setDefault(id);
    await load();
  }

  function getDefault(): Address | undefined {
    return list.value.find((a) => a.isDefault === 1) || list.value[0];
  }

  return { list, loading, load, detail, create, update, remove, setDefault, getDefault };
});
