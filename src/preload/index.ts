/**
 * 预加载脚本
 * 在渲染进程中安全地暴露有限的 API，包括 IPC 通信
 */

import { contextBridge, ipcRenderer } from 'electron'
import {
  IpcRequestChannel,
  IpcRequestParams,
  IpcResponseData,
  IpcEventChannel,
  IpcEventData,
} from '@shared/ipc'

// 向渲染进程暴露的 API
contextBridge.exposeInMainWorld('electronAPI', {
  /** 平台信息 */
  platform: process.platform,
  /** 版本信息 */
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },

  /**
   * 向主进程发送 IPC 请求（双向通信）
   */
  invoke: <T extends IpcRequestChannel>(
    channel: T,
    params?: IpcRequestParams<T>
  ): Promise<IpcResponseData<T>> => {
    return ipcRenderer.invoke(channel, params)
  },

  /**
   * 监听主进程推送的事件
   * @returns 取消监听的函数
   */
  on: <T extends IpcEventChannel>(
    channel: T,
    callback: (data: IpcEventData<T>) => void
  ): (() => void) => {
    // 使用 ipcRenderer.on 并包装回调以提取 event 之外的数据
    const handler = (_event: Electron.IpcRendererEvent, data: IpcEventData<T>): void => {
      callback(data)
    }
    ipcRenderer.on(channel, handler)
    // 返回清理函数
    return () => {
      ipcRenderer.removeListener(channel, handler)
    }
  },
})
