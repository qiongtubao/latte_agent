/**
 * 渲染进程入口
 * 挂载 Vue3 应用到 DOM
 */

import { createApp } from 'vue'
import App from './App.vue'

// 创建 Vue3 应用实例并挂载
createApp(App).mount('#app')
