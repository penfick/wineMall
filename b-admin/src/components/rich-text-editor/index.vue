<template>
  <div class="rich-text-editor" :class="{ disabled }">
    <Toolbar
      class="editor-toolbar"
      :editor="editorRef"
      :default-config="toolbarConfig"
      :mode="'default'"
    />
    <Editor
      class="editor-content"
      :model-value="modelValue"
      :default-config="editorConfig"
      :mode="'default'"
      :style="{ height }"
      @on-created="handleCreated"
      @on-change="handleChange"
    />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, shallowRef } from 'vue';
import '@wangeditor/editor/dist/css/style.css';
import { Editor, Toolbar } from '@wangeditor/editor-for-vue';
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor';

import { uploadApi } from '@/api/upload';
import { StorageKey } from '@/constants/storage-key';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    height?: string;
    disabled?: boolean;
    placeholder?: string;
  }>(),
  {
    modelValue: '',
    height: '420px',
    disabled: false,
    placeholder: '请输入内容…',
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const editorRef = shallowRef<IDomEditor | null>(null);

const toolbarConfig: Partial<IToolbarConfig> = {
  excludeKeys: ['fullScreen', 'group-video'],
};

const editorConfig: Partial<IEditorConfig> = {
  placeholder: props.placeholder,
  readOnly: props.disabled,
  MENU_CONF: {
    uploadImage: {
      server: uploadApi.imageUrl('rich-text'),
      fieldName: 'file',
      maxFileSize: 5 * 1024 * 1024,
      headers: {
        get Authorization() {
          const t = localStorage.getItem(StorageKey.TOKEN);
          return t ? `Bearer ${t}` : '';
        },
      },
      customInsert(res: { code: number; data?: { url: string } }, insertFn: (url: string) => void) {
        if (res?.code === 0 && res.data?.url) insertFn(res.data.url);
      },
    },
  },
};

function handleCreated(editor: IDomEditor) {
  editorRef.value = editor;
}

function handleChange(editor: IDomEditor) {
  emit('update:modelValue', editor.getHtml());
}

onBeforeUnmount(() => {
  editorRef.value?.destroy();
  editorRef.value = null;
});
</script>

<style lang="scss" scoped>
.rich-text-editor {
  border: 1px solid $border-base;
  border-radius: $radius-base;
  overflow: hidden;

  &.disabled {
    opacity: 0.7;
    pointer-events: none;
  }
}

.editor-toolbar {
  border-bottom: 1px solid $border-lighter;
  background: $bg-hover;
}

.editor-content {
  background: #fff;
}
</style>
