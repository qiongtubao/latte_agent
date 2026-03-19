/**
 * Electron 主进程
 * 负责创建窗口、处理系统交互
 */
const path = require('path')
const { exec } = require('child_process')
const fs = require('fs')
const os = require('os')

// 使用 @electron 前缀导入（某些版本需要）
let app, BrowserWindow, ipcMain, shell, dialog, Menu

try {
  // 尝试标准导入
  const electron = require('electron')
  app = electron.app
  BrowserWindow = electron.BrowserWindow
  ipcMain = electron.ipcMain
  shell = electron.shell
  dialog = electron.dialog
  Menu = electron.Menu
  console.log('Electron modules loaded:', { 
    hasApp: !!app, 
    hasBrowserWindow: !!BrowserWindow,
    hasIpcMain: !!ipcMain 
  })
} catch (e) {
  console.error('Failed to load electron modules:', e)
}

// 保持对窗口对象的全局引用
let mainWindow = null

/**
 * 创建主窗口
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'Latte Agent',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      devTools: true
    },
    frame: true,
    hasShadow: true,
    center: true
  })

  // 开发模式加载 Vite 开发服务器
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5174')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  createMenu()
}

/**
 * 创建应用菜单
 */
function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        { label: '新建', accelerator: 'CmdOrCtrl+N', click: () => mainWindow && mainWindow.webContents.send('menu-new') },
        { label: '保存', accelerator: 'CmdOrCtrl+S', click: () => mainWindow && mainWindow.webContents.send('menu-save') },
        { type: 'separator' },
        { label: '退出', accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4', click: () => app.quit() }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '刷新' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        { 
          label: '关于', 
          click: () => mainWindow && dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: '关于',
            message: 'Latte Agent v1.0.0',
            detail: 'AI 助手 - 本地命令执行 + 技能生成'
          })
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

/**
 * 执行本地命令
 */
function executeCommand(command) {
  return new Promise((resolve) => {
    exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, output: stderr || error.message })
      } else {
        resolve({ success: true, output: stdout || stderr })
      }
    })
  })
}

/**
 * 注册 IPC 处理器
 */
function registerIpcHandlers() {
  if (!ipcMain) {
    console.error('ipcMain is not available!')
    return
  }
  
  ipcMain.handle('execute-command', async (event, command) => {
    if (!mainWindow) return { success: false, output: '窗口未初始化' }
    
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['取消', '执行'],
      defaultId: 0,
      title: '确认执行命令',
      message: '确定要执行以下命令吗？',
      detail: command
    })
    
    if (result.response === 1) {
      return executeCommand(command)
    }
    return { success: false, output: '用户取消执行' }
  })

  ipcMain.handle('execute-command-direct', async (event, command) => {
    return executeCommand(command)
  })

  ipcMain.handle('open-external', async (event, url) => {
    await shell.openExternal(url)
  })

  ipcMain.handle('select-file', async () => {
    if (!mainWindow) return { canceled: true, filePaths: [] }
    return dialog.showOpenDialog(mainWindow, { properties: ['openFile'] })
  })

  ipcMain.handle('save-file', async (event, defaultName) => {
    if (!mainWindow) return { canceled: true }
    return dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
  })

  ipcMain.handle('read-file', async (event, filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      return { success: true, content }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('write-file', async (event, filePath, content) => {
    try {
      fs.writeFileSync(filePath, content, 'utf-8')
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('get-system-info', async () => {
    return {
      platform: process.platform,
      arch: process.arch,
      version: process.version,
      homedir: os.homedir(),
      cwd: process.cwd()
    }
  })
}

// ============ 应用启动 ============

// 注册 IPC 处理器
registerIpcHandlers()

// 应用就绪后创建窗口
app.whenReady().then(() => {
  createWindow()
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
