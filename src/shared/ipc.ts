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

  // 模型配置档案通道
  PROFILE_LIST: 'profile:list',             // 获取所有档案列表
  PROFILE_SAVE: 'profile:save',             // 保存档案（新增或更新）
  PROFILE_DELETE: 'profile:delete',         // 删除档案
  PROFILE_ACTIVATE: 'profile:activate',     // 激活指定档案
  PROFILE_GET_ACTIVE: 'profile:get-active', // 获取当前激活的档案

  // Ollama 动态获取模型列表
  OLLAMA_FETCH_MODELS: 'ollama:fetch-models',

  // 主进程 -> 渲染进程 (send)
  NOTIFICATION: 'ipc:notification',
  LOG: 'ipc:log',
  AI_STREAM_CHUNK: 'ai:stream-chunk', // 流式数据块
  AI_STREAM_ERROR: 'ai:stream-error', // 流式错误事件

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
 * API 错误类型枚举
 */
export type ApiErrorType = 'network' | 'auth' | 'quota' | 'bad_request' | 'server' | 'timeout' | 'cancelled' | 'unknown'

/**
 * API 错误数据（用于 IPC 传输）
 */
export interface ApiErrorData {
  /** 错误类型 */
  type: ApiErrorType
  /** 错误消息 */
  message: string
  /** 是否可重试 */
  retryable: boolean
  /** 操作建议 */
  action: string
}

/**
 * 模型配置档案
 * 支持多配置保存与切换，每个档案包含一个完整的模型配置
 */
export interface ModelProfile {
  /** 档案唯一 ID */
  id: string
  /** 档案别名（用户可自定义的友好名称） */
  alias: string
  /** AI 提供商 */
  aiProvider: string
  /** API 地址（Ollama/自定义 API 使用） */
  baseUrl: string
  /** 默认模型 */
  defaultModel: string
  /** 最大 token 数 */
  maxTokens: number
  /** 温度参数 */
  temperature: number
  /** 是否为手动输入的自定义模型（非从列表选择） */
  isCustomModel: boolean
  /** 创建时间戳 */
  createdAt: number
  /** 更新时间戳 */
  updatedAt: number
}

/**
 * 设置数据（不含敏感信息）
 */
export interface SettingsData {
  aiProvider: string
  baseUrl: string
  defaultModel: string
  maxTokens: number
  temperature: number
  hasApiKey: boolean
  /** 当前激活的档案 ID */
  activeProfileId: string | null
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
  [IpcChannel.AI_VALIDATE_KEY]: { apiKey?: string; baseUrl?: string; provider?: string }
  [IpcChannel.AI_GET_MODELS]: void
  [IpcChannel.SETTINGS_GET]: void
  [IpcChannel.SETTINGS_SET]: Partial<SettingsData> & { apiKey?: string }
  [IpcChannel.SETTINGS_HAS_KEY]: void

  // 档案通道请求
  [IpcChannel.PROFILE_LIST]: void
  [IpcChannel.PROFILE_SAVE]: { profile: ModelProfile }
  [IpcChannel.PROFILE_DELETE]: { profileId: string }
  [IpcChannel.PROFILE_ACTIVATE]: { profileId: string }
  [IpcChannel.PROFILE_GET_ACTIVE]: void

  // Ollama 动态模型请求
  [IpcChannel.OLLAMA_FETCH_MODELS]: { baseUrl?: string }
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

  // 档案通道响应
  [IpcChannel.PROFILE_LIST]: { profiles: ModelProfile[] }
  [IpcChannel.PROFILE_SAVE]: { profile: ModelProfile; success: boolean }
  [IpcChannel.PROFILE_DELETE]: { success: boolean }
  [IpcChannel.PROFILE_ACTIVATE]: { success: boolean; activeProfileId: string }
  [IpcChannel.PROFILE_GET_ACTIVE]: { profile: ModelProfile | null }

  // Ollama 动态模型响应
  [IpcChannel.OLLAMA_FETCH_MODELS]: { models: string[]; success: boolean; error?: string }
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
  [IpcChannel.AI_STREAM_ERROR]: ApiErrorData
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
