<template>
  <div class="image-upload">
    <el-upload
      :action="uploadUrl"
      :headers="headers"
      :data="extraData"
      :name="'file'"
      :show-file-list="false"
      :before-upload="beforeUpload"
      :on-success="onSuccess"
      :on-error="onError"
      :multiple="multiple"
      :limit="limit"
      list-type="picture-card"
      accept="image/jpeg,image/png,image/webp,image/gif"
    >
      <div class="image-list">
        <div v-for="(url, idx) in modelValueArr" :key="url" class="image-item">
          <el-image :src="url" fit="cover" class="image-thumb" :preview-src-list="modelValueArr" :initial-index="idx" hide-on-click-modal />
          <div class="image-actions" @click.stop>
            <el-icon class="action-icon" @click="removeImage(idx)"><Delete /></el-icon>
          </div>
        </div>
        <div v-if="canAdd" class="upload-trigger">
          <el-icon :size="22"><Plus /></el-icon>
          <span class="trigger-tip">{{ tip || '点击上传' }}</span>
        </div>
      </div>
    </el-upload>
    <div v-if="hint" class="upload-hint">{{ hint }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ElMessage, type UploadProps } from 'element-plus';
import { Plus, Delete } from '@element-plus/icons-vue';

import { uploadApi } from '@/api/upload';
import { StorageKey } from '@/constants/storage-key';

const props = withDefaults(
  defineProps<{
    modelValue?: string | string[];
    multiple?: boolean;
    limit?: number;
    prefix?: string;
    tip?: string;
    hint?: string;
    maxSizeMb?: number;
  }>(),
  {
    modelValue: '',
    multiple: false,
    limit: 1,
    prefix: 'common',
    maxSizeMb: 5,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | string[]): void;
}>();

const modelValueArr = computed<string[]>(() =>
  Array.isArray(props.modelValue) ? props.modelValue : props.modelValue ? [props.modelValue] : [],
);

const canAdd = computed(() => modelValueArr.value.length < props.limit);

const uploadUrl = computed(() => uploadApi.imageUrl(props.prefix));

const headers = computed(() => {
  const token = localStorage.getItem(StorageKey.TOKEN);
  return token ? { Authorization: `Bearer ${token}` } : {};
});

const extraData = computed(() => ({ prefix: props.prefix }));

const beforeUpload: UploadProps['beforeUpload'] = (file) => {
  if (file.size > props.maxSizeMb * 1024 * 1024) {
    ElMessage.error(`图片大小不能超过 ${props.maxSizeMb}MB`);
    return false;
  }
  return true;
};

const onSuccess: UploadProps['onSuccess'] = (response) => {
  if (response?.code === 0 && response.data?.url) {
    const url = response.data.url as string;
    if (props.multiple) {
      emit('update:modelValue', [...modelValueArr.value, url]);
    } else {
      emit('update:modelValue', url);
    }
    ElMessage.success('上传成功');
  } else {
    ElMessage.error(response?.message || '上传失败');
  }
};

const onError: UploadProps['onError'] = () => {
  ElMessage.error('上传失败，请重试');
};

function removeImage(idx: number) {
  const next = [...modelValueArr.value];
  next.splice(idx, 1);
  if (props.multiple) {
    emit('update:modelValue', next);
  } else {
    emit('update:modelValue', next[0] || '');
  }
}
</script>

<style lang="scss" scoped>
.image-upload {
  :deep(.el-upload--picture-card) {
    border: none;
    background: transparent;
    width: auto;
    height: auto;
    display: block;
  }
}

.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: $space-sm;
}

.image-item,
.upload-trigger {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: $radius-md;
  overflow: hidden;
}

.image-item {
  border: 1px solid $border-light;
  background: $bg-hover;

  .image-thumb {
    width: 100%;
    height: 100%;
  }

  .image-actions {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity $transition-fast;
  }

  &:hover .image-actions {
    opacity: 1;
  }

  .action-icon {
    cursor: pointer;
    font-size: 20px;
  }
}

.upload-trigger {
  border: 1px dashed $border-base;
  color: $text-secondary;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color $transition-fast, color $transition-fast;

  &:hover {
    border-color: $color-primary;
    color: $color-primary;
  }

  .trigger-tip {
    margin-top: 6px;
    font-size: 12px;
  }
}

.upload-hint {
  margin-top: 6px;
  font-size: 12px;
  color: $text-secondary;
}
</style>
