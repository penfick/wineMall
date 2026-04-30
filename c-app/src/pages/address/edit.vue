<template>
  <view class="addr-edit">
    <view class="form-card">
      <view class="row">
        <text class="label serif">收 货 人</text>
        <input class="input" v-model="form.name" placeholder="请输入姓名" maxlength="20" />
      </view>
      <view class="row">
        <text class="label serif">手 机 号</text>
        <input class="input" v-model="form.phone" type="number" placeholder="请输入手机号" maxlength="11" />
      </view>
      <view class="row">
        <text class="label serif">所 在 地 区</text>
        <view class="region-wrap">
          <RegionPicker v-model="regionCodes" @change="onRegionChange" />
        </view>
      </view>
      <view class="row">
        <text class="label serif">详 细 地 址</text>
        <textarea
          class="input area"
          v-model="form.detail"
          placeholder="街道、楼号、门牌号"
          maxlength="100"
          auto-height
        />
      </view>
      <view class="row default-row">
        <text class="label serif">设 为 默 认</text>
        <switch
          :checked="form.isDefault === 1"
          color="#1F3A2E"
          @change="(e: { detail: { value: boolean } }) => (form.isDefault = e.detail.value ? 1 : 0)"
        />
      </view>
    </view>

    <view class="footer safe-area-bottom">
      <view class="btn-save serif" :class="{ disabled: !canSave }" @tap="onSave">保 存 地 址</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import RegionPicker from '@/components/RegionPicker.vue';
import { useAddressStore, type Address } from '@/store/address';
import { navBack } from '@/utils/nav';

const addrStore = useAddressStore();
const id = ref(0);
const isEdit = computed(() => id.value > 0);

const form = reactive<Partial<Address>>({
  name: '',
  phone: '',
  provinceCode: '',
  cityCode: '',
  districtCode: '',
  provinceName: '',
  cityName: '',
  districtName: '',
  detail: '',
  isDefault: 0,
});

const regionCodes = ref<string[]>([]);

const canSave = computed(
  () =>
    !!form.name?.trim() &&
    /^1\d{10}$/.test(form.phone || '') &&
    !!form.provinceCode &&
    !!form.detail?.trim(),
);

function onRegionChange(payload: { codes: string[]; names: string[] }) {
  form.provinceCode = payload.codes[0];
  form.cityCode = payload.codes[1];
  form.districtCode = payload.codes[2];
  form.provinceName = payload.names[0];
  form.cityName = payload.names[1];
  form.districtName = payload.names[2];
}

async function onSave() {
  if (!canSave.value) {
    uni.showToast({ title: '请完善地址信息', icon: 'none' });
    return;
  }
  if (isEdit.value) {
    await addrStore.update(id.value, form);
  } else {
    await addrStore.create(form);
  }
  uni.showToast({ title: '已保存', icon: 'success' });
  setTimeout(navBack, 600);
}

onLoad((opts: Record<string, string>) => {
  id.value = Number(opts.id || 0);
  uni.setNavigationBarTitle({ title: id.value ? '编辑地址' : '新增地址' });
});

onMounted(async () => {
  if (!isEdit.value) return;
  const a = await addrStore.detail(id.value);
  Object.assign(form, a);
  regionCodes.value = [a.provinceCode, a.cityCode, a.districtCode];
});
</script>

<style lang="scss" scoped>
.addr-edit {
  min-height: 100vh;
  background: $bg-page;
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
}
.form-card {
  background: $bg-card;
  margin: $space-md;
  padding: 0 $space-lg;
  border: 1rpx solid $border-light;
  border-top: 2rpx solid $color-accent;
}
.row {
  display: flex;
  align-items: flex-start;
  padding: $space-md 0;
  border-bottom: 1rpx dashed $border-light;
  min-height: 100rpx;
  &:last-child { border-bottom: 0; }
  &.default-row { align-items: center; }
  .label {
    width: 180rpx;
    color: $color-primary;
    font-size: $font-base;
    padding-top: 6rpx;
    letter-spacing: 4rpx;
  }
  .input {
    flex: 1;
    font-size: $font-base;
    min-height: 60rpx;
    padding-top: 6rpx;
    color: $text-primary;
  }
  .input.area { line-height: 1.6; }
  .region-wrap { flex: 1; }
}

.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  padding: $space-sm $space-md;
  border-top: 1rpx solid $border-light;
  box-shadow: 0 -4rpx 20rpx rgba(31, 58, 46, 0.04);
}
.btn-save {
  height: 88rpx;
  background: $color-primary;
  color: $color-accent-light;
  border: 1rpx solid $color-accent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-md;
  letter-spacing: 6rpx;
  position: relative;
  &::before {
    content: '';
    position: absolute;
    inset: 4rpx;
    border: 1rpx solid rgba(184, 149, 106, 0.3);
    pointer-events: none;
  }
  &.disabled { opacity: 0.5; }
  &:active:not(.disabled) { background: $color-primary-dark; }
}
</style>
