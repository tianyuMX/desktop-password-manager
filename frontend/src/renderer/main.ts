/** 渲染进程入口：装配 Vue + Pinia + 路由 + Vuetify 并挂载 */
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import vuetify from "./plugins/vuetify";
import "@mdi/font/css/materialdesignicons.css"; // MDI 图标字体
import "vuetify/styles"; // Vuetify 基础样式

import "./style.css";

createApp(App).use(createPinia()).use(router).use(vuetify).mount("#app");
