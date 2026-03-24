/**
 * 渲染进程 IPC 客户端
 * 封装与主进程的 IPC 通信，提供类型安全的调用接口
 */

import {
  IpcChannel,
  IpcRequestChannel,
  IpcRequestParams,
  IpcResponseData,
  IpcEventChannel,
  IpcEventData,
} from '@shared/ipc'

/**
 * 渲染进程通过 preload 暴露的 electronAPI 调用 IPC
 */
interface ElectronIPC {
  invoke<T extends IpcRequestChannel>(
    channel: T,
    params?: IpcRequestParams<T>
  ): Promise<IpcResponseData<T>>
  on<T extends IpcEventChannel>(
    channel: T,
    callback: (data: IpcEventData<T>) => void
  ): () => void
}

/**
 * 获取 IPC 实例
 */
function getIpc(): ElectronIPC {
  const api = (window as unknown as Record<string, ElectronIPC>).electronAPI
  if (!api) {
    throw new Error('electronAPI 未在 preload 中正确暴露')
  }
  return api
}

/**
 * 向主进程发送请求并等待响应
 */
export async function invoke<T extends IpcRequestChannel>(
  channel: T,
  params?: IpcRequestParams<T>
): Promise<IpcResponseData<T>> {
  return getIpc().invoke(channel, params)
}

/**
 * 监听主进程推送的事件
 * @returns 取消监听的函数
 */
export function on<T extends IpcEventChannel>(
  channel: T,
  callback: (data: IpcEventData<T>) => void
): () => void {
  return getIpc().on(channel, callback)
}
