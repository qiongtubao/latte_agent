/**
 * Electron 预加载脚本
 * 在渲染进程中安全地暴露 Node.js API
 */
const { contextBridge, ipcRenderer } = require('electron')

/**
 * 通过 contextBridge 将安全的 API 暴露给渲染进程
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * 执行命令（带确认对话框）
   * @param {string} command - 要执行的命令
   * @returns {Promise<{success: boolean, output: string}>}
   */
  executeCommand: (command) => ipcRenderer.invoke('execute-command', command),
  
  /**
   * 直接执行命令（无需确认）
   * @param {string} command - 要执行的命令
   * @returns {Promise<{success: boolean, output: string}>}
   */
  executeCommandDirect: (command) => ipcRenderer.invoke('execute-command-direct', command),
  
  /**
   * 打开外部链接
   * @param {string} url - 链接地址
   */
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  /**
   * 选择文件
   * @returns {Promise<{canceled: boolean, filePaths: string[]}>}
   */
  selectFile: () => ipcRenderer.invoke('select-file'),
  
  /**
   * 保存文件对话框
   * @param {string} defaultName - 默认文件名
   * @returns {Promise<{canceled: boolean, filePath: string}>}
   */
  saveFile: (defaultName) => ipcRenderer.invoke('save-file', defaultName),
  
  /**
   * 读取文件内容
   * @param {string} filePath - 文件路径
   * @returns {Promise<{success: boolean, content?: string, error?: string}>}
   */
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  
  /**
   * 写入文件
   * @param {string} filePath - 文件路径
   * @param {string} content - 文件内容
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  
  /**
   * 获取系统信息
   * @returns {Promise<{platform: string, arch: string, version: string, homedir: string, cwd: string}>}
   */
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  
  /**
   * 监听菜单事件
   * @param {string} channel - 事件通道
   * @param {Function} callback - 回调函数
   */
  onMenuEvent: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args))
  },
  
  /**
   * 移除监听器
   * @param {string} channel - 事件通道
   * @param {Function} callback - 回调函数
   */
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback)
  }
})

// 暴露运行环境标识
contextBridge.exposeInMainWorld('isElectron', true)
