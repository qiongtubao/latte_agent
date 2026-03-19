/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

/**
 * Electron API 类型声明
 */
interface ElectronAPI {
  executeCommand: (command: string) => Promise<{ success: boolean; output: string }>
  executeCommandDirect: (command: string) => Promise<{ success: boolean; output: string }>
  openExternal: (url: string) => Promise<void>
  selectFile: () => Promise<{ canceled: boolean; filePaths: string[] }>
  saveFile: (defaultName: string) => Promise<{ canceled: boolean; filePath: string }>
  readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>
  getSystemInfo: () => Promise<{
    platform: string
    arch: string
    version: string
    homedir: string
    cwd: string
  }>
  onMenuEvent: (channel: string, callback: (...args: any[]) => void) => void
  removeListener: (channel: string, callback: (...args: any[]) => void) => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
    isElectron?: boolean
  }
}

export {}
