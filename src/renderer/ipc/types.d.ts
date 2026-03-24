/**
 * electronAPI 全局类型声明
 * 由 preload 脚本通过 contextBridge 暴露
 */

import { IpcRequestChannel, IpcRequestParams, IpcResponseData, IpcEventChannel, IpcEventData } from '@shared/ipc'

interface ElectronAPI {
  platform: NodeJS.Platform
  versions: {
    node: string
    chrome: string
    electron: string
  }
  invoke<T extends IpcRequestChannel>(
    channel: T,
    params?: IpcRequestParams<T>
  ): Promise<IpcResponseData<T>>
  on<T extends IpcEventChannel>(
    channel: T,
    callback: (data: IpcEventData<T>) => void
  ): () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
