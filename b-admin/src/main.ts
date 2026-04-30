import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPersist from 'pinia-plugin-persistedstate';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import * as ElementPlusIcons from '@element-plus/icons-vue';

import App from './App.vue';
import router from './router';
import { setupRouterGuard } from './router/guard';
import './styles/index.scss';

const app = createApp(App);

const pinia = createPinia();
pinia.use(piniaPersist);

app.use(pinia);
app.use(router);
app.use(ElementPlus, { size: 'default', locale: zhCn });

// 注册 Element Plus 图标（菜单/按钮 icon 用得到）
for (const [name, comp] of Object.entries(ElementPlusIcons)) {
  app.component(name, comp as never);
}

// 路由守卫（必须在 mount 前注册）
setupRouterGuard(router);

app.mount('#app');
