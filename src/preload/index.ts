/**
 * 预加载脚本
 * 在渲染进程中安全地暴露有限的 API
 */

import { contextBridge } from 'electron'

// 向渲染进程暴露的 API
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
})
