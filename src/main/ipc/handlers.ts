/**
 * 主进程 IPC 处理器
 * 处理渲染进程发起的 IPC 请求
 */

import { ipcMain, app, BrowserWindow } from 'electron'
import {
  IpcChannel,
  IpcRequestParams,
  IpcResponseData,
  IpcEventChannel,
  IpcEventData,
} from '@shared/ipc'

/**
 * 注册所有 IPC 处理器
 */
export function registerIpcHandlers(): void {
  // ping/pong 测试通道
  ipcMain.handle(
    IpcChannel.PING,
    (_event, params: IpcRequestParams<typeof IpcChannel.PING>): IpcResponseData<typeof IpcChannel.PING> => {
      return {
        message: 'pong',
        timestamp: Date.now(),
        echoTimestamp: params.timestamp,
      }
    }
  )

  // 获取应用信息
  ipcMain.handle(
    IpcChannel.GET_APP_INFO,
    (): IpcResponseData<typeof IpcChannel.GET_APP_INFO> => {
      return {
        name: app.getName(),
        version: app.getVersion(),
        platform: process.platform,
      }
    }
  )
}

/**
 * 向指定窗口发送 IPC 事件
 * @param window 目标窗口
 * @param channel 事件通道
 * @param data 事件数据
 */
export function sendIpcEvent<T extends IpcEventChannel>(
  window: BrowserWindow,
  channel: T,
  data: IpcEventData<T>
): void {
  window.webContents.send(channel, data)
}

/**
 * 向所有窗口广播 IPC 事件
 * @param channel 事件通道
 * @param data 事件数据
 */
export function broadcastIpcEvent<T extends IpcEventChannel>(
  channel: T,
  data: IpcEventData<T>
): void {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send(channel, data)
  })
}
