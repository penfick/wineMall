<template>
  <view class="profile-page">
    <view class="form-card">
      <view class="row" @tap="onPickAvatar">
        <text class="label serif">头 像</text>
        <image class="avatar" :src="form.avatar || DEFAULT_AVATAR" mode="aspectFill" />
        <text class="arrow">›</text>
      </view>
      <view class="row">
        <text class="label serif">昵 称</text>
        <input class="input" v-model="form.nickname" placeholder="请输入昵称" maxlength="20" />
      </view>
      <view class="row">
        <text class="label serif">性 别</text>
        <view class="radio-group">
          <view
            v-for="g in genders"
            :key="g.value"
            class="radio serif"
            :class="{ active: form.gender === g.value }"
            @tap="form.gender = g.value"
          >
            {{ g.label }}
          </view>
        </view>
      </view>
      <view class="row">
        <text class="label serif">手 机 号</text>
        <input class="input" v-model="form.phone" type="number" placeholder="未绑定" maxlength="11" />
      </view>
      <view class="tip">手机号修改需短信验证（MVP 阶段直接保存）</view>
    </view>

    <view class="footer safe-area-bottom">
      <view class="btn-save serif" @tap="onSave">保 存 资 料</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue';
import { useUserStore } from '@/store/user';
import { navBack } from '@/utils/nav';
import { DEFAULT_AVATAR } from '@/utils/assets';

const userStore = useUserStore();
const genders = [
  { label: '男', value: 1 as const },
  { label: '女', value: 2 as const },
  { label: '未知', value: 0 as const },
];

const form = reactive({
  avatar: '',
  nickname: '',
  gender: 0 as 0 | 1 | 2,
  phone: '',
});

function onPickAvatar() {
  // #ifdef MP-WEIXIN
  uni.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType: ['album', 'camera'],
    sizeType: ['compressed'],
    success: (res) => {
      form.avatar = res.tempFiles[0].tempFilePath;
      uni.showToast({ title: '上传功能待接入', icon: 'none' });
    },
  });
  // #endif
  // #ifndef MP-WEIXIN
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: (res) => {
      form.avatar = res.tempFilePaths[0];
      uni.showToast({ title: '上传功能待接入', icon: 'none' });
    },
  });
  // #endif
}

async function onSave() {
  if (!form.nickname?.trim()) {
    uni.showToast({ title: '请输入昵称', icon: 'none' });
    return;
  }
  await userStore.updateProfile({
    avatar: form.avatar,
    nickname: form.nickname,
    gender: form.gender,
    phone: form.phone,
  });
  uni.showToast({ title: '已保存', icon: 'success' });
  setTimeout(navBack, 600);
}

onMounted(() => {
  const u = userStore.userInfo;
  if (u) {
    form.avatar = u.avatar || '';
    form.nickname = u.nickname || '';
    form.gender = u.gender;
    form.phone = u.phone || '';
  }
});
</script>

<style lang="scss" scoped>
.profile-page {
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
  align-items: center;
  padding: $space-md 0;
  border-bottom: 1rpx dashed $border-light;
  min-height: 100rpx;
  &:last-child { border-bottom: 0; }
  .label {
    width: 180rpx;
    color: $color-primary;
    font-size: $font-base;
    letter-spacing: 4rpx;
  }
  .input {
    flex: 1;
    font-size: $font-base;
    color: $text-primary;
  }
  .avatar {
    width: 88rpx;
    height: 88rpx;
    border-radius: 50%;
    margin-left: auto;
    background: $bg-elevated;
    border: 2rpx solid $color-accent;
  }
  .arrow {
    color: $color-accent;
    font-size: 32rpx;
    transform: rotate(90deg);
    margin-left: $space-sm;
  }
}
.tip {
  padding: $space-xs 0 $space-sm;
  font-size: $font-xs;
  color: $text-placeholder;
  letter-spacing: 1rpx;
}
.radio-group { display: flex; gap: $space-sm; flex: 1; }
.radio {
  padding: 8rpx 28rpx;
  background: transparent;
  border: 1rpx solid $border-base;
  font-size: $font-sm;
  color: $text-regular;
  min-height: 56rpx;
  display: flex;
  align-items: center;
  letter-spacing: 4rpx;
  &.active {
    background: $color-primary;
    color: $color-accent-light;
    border-color: $color-primary;
  }
}

.footer {
  position: fixed;
  bottom: 0; left: 0; right: 0;
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
  &:active { background: $color-primary-dark; }
}
</style>
