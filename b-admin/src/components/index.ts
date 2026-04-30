/**
 * 公共组件入口（unplugin-vue-components 自动按目录注册）
 *
 * 命名约定：
 *   - 组件目录 = kebab-case
 *   - 自动注册名 = PascalCase（image-upload → ImageUpload）
 *
 * 使用：直接在 .vue 文件中 <ImageUpload /> 即可，无需 import。
 */
export { default as ImageUpload } from './image-upload/index.vue';
export { default as RichTextEditor } from './rich-text-editor/index.vue';
export { default as RegionSelect } from './region-select/index.vue';
export { default as Pagination } from './pagination/index.vue';
export { default as TableColumnSetting } from './table-column-setting/index.vue';
export { default as DictTag } from './dict-tag/index.vue';
export { default as StatusTag } from './status-tag/index.vue';
export { default as IconSelect } from './icon-select/index.vue';
