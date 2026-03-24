/**
 * IPC 通道类型定义
 * 定义主进程与渲染进程之间的双向通信接口
 */

/**
 * IPC 通道名称枚举
 */
export const IpcChannel = {
  // 渲染进程 -> 主进程 (invoke)
  PING: 'ipc:ping',
  GET_APP_INFO: 'ipc:get-app-info',

  // 主进程 -> 渲染进程 (send)
  NOTIFICATION: 'ipc:notification',
  LOG: 'ipc:log',
} as const

/**
 * IPC 请求类型映射
 */
export interface IpcRequestMap {
  [IpcChannel.PING]: { timestamp: number }
  [IpcChannel.GET_APP_INFO]: void
}

/**
 * IPC 响应类型映射
 */
export interface IpcResponseMap {
  [IpcChannel.PING]: { message: string; timestamp: number; echoTimestamp: number }
  [IpcChannel.GET_APP_INFO]: { name: string; version: string; platform: string }
}

/**
 * 主进程向渲染进程推送的事件类型
 */
export interface IpcEventMap {
  [IpcChannel.NOTIFICATION]: { title: string; body: string; type: 'info' | 'warning' | 'error' }
  [IpcChannel.LOG]: { level: 'debug' | 'info' | 'warn' | 'error'; message: string }
}

/**
 * IPC 请求键类型
 */
export type IpcRequestChannel = keyof IpcRequestMap

/**
 * IPC 响应键类型
 */
export type IpcResponseChannel = keyof IpcResponseMap

/**
 * IPC 事件键类型
 */
export type IpcEventChannel = keyof IpcEventMap

/**
 * 提取请求参数类型
 */
export type IpcRequestParams<T extends IpcRequestChannel> = IpcRequestMap[T]

/**
 * 提取响应数据类型
 */
export type IpcResponseData<T extends IpcResponseChannel> = IpcResponseMap[T]

/**
 * 提取事件数据类型
 */
export type IpcEventData<T extends IpcEventChannel> = IpcEventMap[T]
