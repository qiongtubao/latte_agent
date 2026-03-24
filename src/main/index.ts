/**
 * Electron 主进程入口
 * 负责创建应用窗口和管理应用生命周期
 */

import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc/handlers'

// 主窗口引用，防止被垃圾回收
let mainWindow: BrowserWindow | null = null

/**
 * 创建主窗口
 * 默认尺寸 1200x800，标题为 latte_agent
 */
function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'latte_agent',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 开发环境加载 vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    // 开发环境打开开发者工具
    mainWindow.webContents.openDevTools()
  } else {
    // 生产环境加载打包后的文件
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // 窗口关闭时释放引用
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 注册 IPC 处理器
registerIpcHandlers()

// Electron 就绪后创建窗口
app.whenReady().then(() => {
  createMainWindow()

  // macOS 激活应用时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

// 所有窗口关闭时退出应用（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
