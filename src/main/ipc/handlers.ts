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
  StreamChunkData,
  ApiErrorData,
} from '@shared/ipc'
import { createClient, AIClient } from '@main/ai/client'
import { classifyError, ApiError } from '@main/ai/errors'
import { readSettings, writeSettings, hasApiKey, getFullSettings } from '@main/storage/settings'
import { loadAllSessions, saveSession, deleteSession } from '@main/storage/session'

// AI 客户端实例缓存
let aiClientInstance: AIClient | null = null

// 当前流式请求的 AbortController
let currentStreamController: AbortController | null = null

/**
 * 获取或创建 AI 客户端实例
 */
function getAIClient(): AIClient {
  if (!aiClientInstance) {
    const settings = getFullSettings()
    if (!settings.apiKey) {
      throw new Error('API 密钥未配置，请前往设置页面配置')
    }
    aiClientInstance = createClient(settings.aiProvider, {
      apiKey: settings.apiKey,
      model: settings.defaultModel,
      maxTokens: settings.maxTokens,
      temperature: settings.temperature,
    })
  }
  return aiClientInstance
}

/**
 * 重置 AI 客户端实例（设置变更时调用）
 */
function resetAIClient(): void {
  aiClientInstance = null
}

/**
 * 将完整设置转为安全数据（不含密钥）
 */
function toSafeSettings() {
  const settings = readSettings()
  return {
    aiProvider: settings.aiProvider,
    defaultModel: settings.defaultModel,
    maxTokens: settings.maxTokens,
    temperature: settings.temperature,
    hasApiKey: Boolean(settings.apiKey),
  }
}

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

  // ===== AI 相关通道 =====

  // 发送消息到 AI
  ipcMain.handle(
    IpcChannel.AI_SEND_MESSAGE,
    async (_event, params: IpcRequestParams<typeof IpcChannel.AI_SEND_MESSAGE>): Promise<IpcResponseData<typeof IpcChannel.AI_SEND_MESSAGE>> => {
      try {
        const client = getAIClient()
        const response = await client.sendMessage(params.messages, {
          model: params.model,
        })
        return {
          content: response.content,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          model: response.model,
          timestamp: response.timestamp,
        }
      } catch (error) {
        // 分类错误并重新抛出，让渲染进程处理
        const apiError = classifyError(error)
        throw apiError
      }
    }
  )

  // 流式发送消息到 AI
  ipcMain.handle(
    IpcChannel.AI_SEND_MESSAGE_STREAM,
    (event, params: IpcRequestParams<typeof IpcChannel.AI_SEND_MESSAGE_STREAM>): IpcResponseData<typeof IpcChannel.AI_SEND_MESSAGE_STREAM> => {
      try {
        const client = getAIClient()
        const window = BrowserWindow.fromWebContents(event.sender)

        // 生成唯一流 ID
        const streamId = `stream-${Date.now()}`

        // 如果已有正在进行的流，先停止
        if (currentStreamController) {
          currentStreamController.abort()
          currentStreamController = null
        }

        // 创建流式请求，传入错误回调通过 IPC 发送错误
        currentStreamController = client.sendMessageStream(
          params.messages,
          (chunk) => {
            // 通过 IPC 事件将数据块发送到渲染进程
            if (window) {
              const chunkData: StreamChunkData = chunk
              window.webContents.send(IpcChannel.AI_STREAM_CHUNK, chunkData)
            }
          },
          {
            model: params.model,
          },
          // 流式错误回调：分类错误后通过 IPC 错误通道发送
          (error) => {
            if (window) {
              const apiError = classifyError(error)
              const errorData: ApiErrorData = apiError.toJSON()
              window.webContents.send(IpcChannel.AI_STREAM_ERROR, errorData)
            }
          }
        )

        return { streamId }
      } catch (error) {
        // 同步错误（如密钥未配置），分类后重新抛出
        throw classifyError(error)
      }
    }
  )

  // 停止流式输出
  ipcMain.handle(
    IpcChannel.AI_STOP_STREAM,
    (): IpcResponseData<typeof IpcChannel.AI_STOP_STREAM> => {
      if (currentStreamController) {
        currentStreamController.abort()
        currentStreamController = null
        return { stopped: true }
      }
      return { stopped: false }
    }
  )

  // 验证 API 密钥
  ipcMain.handle(
    IpcChannel.AI_VALIDATE_KEY,
    async (_event, params: IpcRequestParams<typeof IpcChannel.AI_VALIDATE_KEY>): Promise<IpcResponseData<typeof IpcChannel.AI_VALIDATE_KEY>> => {
      try {
        const settings = getFullSettings()
        // 使用传入的密钥或已存储的密钥创建临时客户端验证
        const keyToValidate = params.apiKey || settings.apiKey
        if (!keyToValidate) {
          return { valid: false, error: '未提供 API 密钥' }
        }
        const client = createClient(settings.aiProvider, {
          apiKey: keyToValidate,
        })
        const valid = await client.validateApiKey()
        return { valid, error: valid ? undefined : 'API 密钥无效' }
      } catch (error) {
        const apiError = classifyError(error)
        return { valid: false, error: apiError.message }
      }
    }
  )

  // 获取可用模型列表
  ipcMain.handle(
    IpcChannel.AI_GET_MODELS,
    async (): Promise<IpcResponseData<typeof IpcChannel.AI_GET_MODELS>> => {
      const settings = readSettings()
      try {
        const client = createClient(settings.aiProvider, {
          apiKey: settings.apiKey,
        })
        return {
          models: client.getAvailableModels(),
          provider: settings.aiProvider,
        }
      } catch {
        return { models: [], provider: settings.aiProvider }
      }
    }
  )

  // ===== 设置相关通道 =====

  // 获取当前设置（不含密钥）
  ipcMain.handle(
    IpcChannel.SETTINGS_GET,
    (): IpcResponseData<typeof IpcChannel.SETTINGS_GET> => {
      return toSafeSettings()
    }
  )

  // 保存设置
  ipcMain.handle(
    IpcChannel.SETTINGS_SET,
    (_event, params: IpcRequestParams<typeof IpcChannel.SETTINGS_SET>): IpcResponseData<typeof IpcChannel.SETTINGS_SET> => {
      writeSettings(params)
      // 如果密钥变更，重置 AI 客户端
      if (params.apiKey !== undefined) {
        resetAIClient()
      }
      return toSafeSettings()
    }
  )

  // 检查是否已配置 API 密钥
  ipcMain.handle(
    IpcChannel.SETTINGS_HAS_KEY,
    (): IpcResponseData<typeof IpcChannel.SETTINGS_HAS_KEY> => {
      return { hasKey: hasApiKey() }
    }
  )

  // ===== 会话持久化通道 =====

  // 加载所有历史会话
  ipcMain.handle(
    IpcChannel.SESSION_LOAD_ALL,
    (): IpcResponseData<typeof IpcChannel.SESSION_LOAD_ALL> => {
      return { sessions: loadAllSessions() }
    }
  )

  // 保存单个会话
  ipcMain.handle(
    IpcChannel.SESSION_SAVE,
    (_event, params: IpcRequestParams<typeof IpcChannel.SESSION_SAVE>): IpcResponseData<typeof IpcChannel.SESSION_SAVE> => {
      saveSession(params.session)
      return { success: true }
    }
  )

  // 删除单个会话
  ipcMain.handle(
    IpcChannel.SESSION_DELETE,
    (_event, params: IpcRequestParams<typeof IpcChannel.SESSION_DELETE>): IpcResponseData<typeof IpcChannel.SESSION_DELETE> => {
      const deleted = deleteSession(params.sessionId)
      return { success: deleted }
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
