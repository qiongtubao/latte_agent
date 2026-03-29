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
import { readSettings, writeSettings, hasApiKey, getFullSettings, loadProfiles, saveProfile as saveProfileToStorage, deleteProfile as deleteProfileFromStorage, activateProfile as activateProfileInStorage, getActiveProfile } from '@main/storage/settings'
import { loadAllSessions, saveSession, deleteSession } from '@main/storage/session'
import type { ModelProfile } from '@shared/ipc'
import { OllamaClient } from '@main/ai/ollama'

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
    // Ollama 不需要 API Key
    if (settings.aiProvider !== 'ollama' && !settings.apiKey) {
      throw new Error('API 密钥未配置，请前往设置页面配置')
    }
    aiClientInstance = createClient(settings.aiProvider, {
      apiKey: settings.apiKey,
      model: settings.defaultModel,
      maxTokens: settings.maxTokens,
      temperature: settings.temperature,
      baseUrl: settings.baseUrl,
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
    baseUrl: settings.baseUrl,
    defaultModel: settings.defaultModel,
    maxTokens: settings.maxTokens,
    temperature: settings.temperature,
    hasApiKey: Boolean(settings.apiKey),
    activeProfileId: settings.activeProfileId || null,
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
        const provider = params.provider || settings.aiProvider

        // Ollama 不需要 API 密钥，直接验证连接
        if (provider === 'ollama') {
          const baseUrl = params.baseUrl || settings.baseUrl || 'http://localhost:11434'
          // 规范化 URL
          let normalizedUrl = baseUrl
          if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
            normalizedUrl = 'http://' + normalizedUrl
          }
          try {
            const response = await fetch(`${normalizedUrl}/api/tags`, { method: 'GET' })
            return { valid: response.ok, error: response.ok ? undefined : `Ollama 服务响应错误: ${response.status}` }
          } catch (e) {
            return { valid: false, error: `无法连接 Ollama 服务: ${(e as Error).message}` }
          }
        }

        // 其他提供商需要 API 密钥
        const keyToValidate = params.apiKey || settings.apiKey
        if (!keyToValidate) {
          return { valid: false, error: '未提供 API 密钥' }
        }
        const client = createClient(provider, {
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

  // ===== 模型配置档案通道 =====

  // 获取所有档案列表
  ipcMain.handle(
    IpcChannel.PROFILE_LIST,
    (): IpcResponseData<typeof IpcChannel.PROFILE_LIST> => {
      return { profiles: loadProfiles() }
    }
  )

  // 保存档案（新增或更新）
  ipcMain.handle(
    IpcChannel.PROFILE_SAVE,
    (_event, params: IpcRequestParams<typeof IpcChannel.PROFILE_SAVE>): IpcResponseData<typeof IpcChannel.PROFILE_SAVE> => {
      const profile = saveProfileToStorage(params.profile)
      return { profile, success: true }
    }
  )

  // 删除档案
  ipcMain.handle(
    IpcChannel.PROFILE_DELETE,
    (_event, params: IpcRequestParams<typeof IpcChannel.PROFILE_DELETE>): IpcResponseData<typeof IpcChannel.PROFILE_DELETE> => {
      const success = deleteProfileFromStorage(params.profileId)
      return { success }
    }
  )

  // 激活指定档案
  ipcMain.handle(
    IpcChannel.PROFILE_ACTIVATE,
    (_event, params: IpcRequestParams<typeof IpcChannel.PROFILE_ACTIVATE>): IpcResponseData<typeof IpcChannel.PROFILE_ACTIVATE> => {
      const success = activateProfileInStorage(params.profileId)
      if (success) {
        resetAIClient()
      }
      return { success, activeProfileId: params.profileId }
    }
  )

  // 获取当前激活的档案
  ipcMain.handle(
    IpcChannel.PROFILE_GET_ACTIVE,
    (): IpcResponseData<typeof IpcChannel.PROFILE_GET_ACTIVE> => {
      return { profile: getActiveProfile() }
    }
  )

  // ===== Ollama 动态模型列表 =====

  // 从 Ollama 服务动态获取可用模型列表
  ipcMain.handle(
    IpcChannel.OLLAMA_FETCH_MODELS,
    async (_event, params: IpcRequestParams<typeof IpcChannel.OLLAMA_FETCH_MODELS>): Promise<IpcResponseData<typeof IpcChannel.OLLAMA_FETCH_MODELS>> => {
      let baseUrl = params.baseUrl || readSettings().baseUrl || 'http://localhost:11434'
      // 自动补全协议（如果用户没输入 http:// 或 https://）
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = 'http://' + baseUrl
      }
      console.log('[IPC Handler] OLLAMA_FETCH_MODELS 被调用, baseUrl:', baseUrl)
      try {
        // 直接调用 Ollama API 获取模型列表，不使用会静默 fallback 的方法
        const response = await fetch(`${baseUrl}/api/tags`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
        console.log('[IPC Handler] Ollama API 响应状态:', response.status)
        if (!response.ok) {
          return {
            models: [],
            success: false,
            error: `Ollama 服务响应错误: ${response.status} ${response.statusText}`,
          }
        }
        const data = (await response.json()) as { models: Array<{ name: string }> }
        const models = data.models?.map((m) => m.name) || []
        return { models, success: true }
      } catch (error) {
        const err = error as Error
        return {
          models: [],
          success: false,
          error: `无法连接 Ollama 服务: ${err.message}。请确认 Ollama 已启动并运行在正确地址。`,
        }
      }
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
