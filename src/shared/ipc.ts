import type { Session } from './session'

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

  // AI 相关通道
  AI_SEND_MESSAGE: 'ai:send-message',
  AI_SEND_MESSAGE_STREAM: 'ai:send-message-stream', // 流式消息
  AI_STOP_STREAM: 'ai:stop-stream', // 停止流式输出
  AI_VALIDATE_KEY: 'ai:validate-key',
  AI_GET_MODELS: 'ai:get-models',

  // 设置相关通道
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_HAS_KEY: 'settings:has-key',

  // 主进程 -> 渲染进程 (send)
  NOTIFICATION: 'ipc:notification',
  LOG: 'ipc:log',
  AI_STREAM_CHUNK: 'ai:stream-chunk', // 流式数据块

  // 会话持久化通道
  SESSION_LOAD_ALL: 'session:load-all',       // 加载所有历史会话
  SESSION_SAVE: 'session:save',               // 保存单个会话
  SESSION_DELETE: 'session:delete',           // 删除单个会话
} as const

/**
 * AI 消息请求参数
 */
export interface AISendMessageRequest {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  model?: string
}

/**
 * AI 响应数据
 */
export interface AIResponseData {
  content: string
  inputTokens: number
  outputTokens: number
  model: string
  timestamp: number
}

/**
 * 流式数据块（主进程 -> 渲染进程）
 */
export interface StreamChunkData {
  /** 数据块类型 */
  type: 'content_block_delta' | 'message_start' | 'message_delta' | 'message_stop'
  /** 增量文本内容 */
  delta?: string
  /** 输入 token 数 */
  inputTokens?: number
  /** 输出 token 数 */
  outputTokens?: number
  /** 模型标识 */
  model?: string
}

/**
 * 设置数据（不含敏感信息）
 */
export interface SettingsData {
  aiProvider: string
  defaultModel: string
  maxTokens: number
  temperature: number
  hasApiKey: boolean
}

/**
 * IPC 请求类型映射
 */
export interface IpcRequestMap {
  [IpcChannel.PING]: { timestamp: number }
  [IpcChannel.GET_APP_INFO]: void
  [IpcChannel.AI_SEND_MESSAGE]: AISendMessageRequest
  [IpcChannel.AI_SEND_MESSAGE_STREAM]: AISendMessageRequest
  [IpcChannel.AI_STOP_STREAM]: void
  [IpcChannel.AI_VALIDATE_KEY]: { apiKey: string }
  [IpcChannel.AI_GET_MODELS]: void
  [IpcChannel.SETTINGS_GET]: void
  [IpcChannel.SETTINGS_SET]: Partial<SettingsData> & { apiKey?: string }
  [IpcChannel.SETTINGS_HAS_KEY]: void
  [IpcChannel.SESSION_LOAD_ALL]: void
  [IpcChannel.SESSION_SAVE]: { session: Session }
  [IpcChannel.SESSION_DELETE]: { sessionId: string }
}

/**
 * IPC 响应类型映射
 */
export interface IpcResponseMap {
  [IpcChannel.PING]: { message: string; timestamp: number; echoTimestamp: number }
  [IpcChannel.GET_APP_INFO]: { name: string; version: string; platform: string }
  [IpcChannel.AI_SEND_MESSAGE]: AIResponseData
  [IpcChannel.AI_SEND_MESSAGE_STREAM]: { streamId: string }
  [IpcChannel.AI_STOP_STREAM]: { stopped: boolean }
  [IpcChannel.AI_VALIDATE_KEY]: { valid: boolean; error?: string }
  [IpcChannel.AI_GET_MODELS]: { models: string[]; provider: string }
  [IpcChannel.SETTINGS_GET]: SettingsData
  [IpcChannel.SETTINGS_SET]: SettingsData
  [IpcChannel.SETTINGS_HAS_KEY]: { hasKey: boolean }
  [IpcChannel.SESSION_LOAD_ALL]: { sessions: Session[] }
  [IpcChannel.SESSION_SAVE]: { success: boolean }
  [IpcChannel.SESSION_DELETE]: { success: boolean }
}

/**
 * 主进程向渲染进程推送的事件类型
 */
export interface IpcEventMap {
  [IpcChannel.NOTIFICATION]: { title: string; body: string; type: 'info' | 'warning' | 'error' }
  [IpcChannel.LOG]: { level: 'debug' | 'info' | 'warn' | 'error'; message: string }
  [IpcChannel.AI_STREAM_CHUNK]: StreamChunkData
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
