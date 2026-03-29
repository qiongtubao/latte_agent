/**
 * 渲染进程 IPC 客户端
 * 封装与主进程的 IPC 通信，提供类型安全的调用接口
 * 支持在非 Electron 环境（浏览器/E2E测试）下优雅降级
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
 * 检测是否运行在 Electron 环境中
 */
function isElectronEnv(): boolean {
  return !!(window as unknown as Record<string, unknown>).electronAPI
}

/**
 * Mock IPC 实现（用于浏览器/E2E 测试环境）
 * 返回合理的默认值，让 UI 可以正常渲染
 */
const mockIpc: ElectronIPC = {
  async invoke<T extends IpcRequestChannel>(channel: T): Promise<IpcResponseData<T>> {
    console.warn(`[Mock IPC] invoke called in non-Electron environment: ${channel}`)
    // 根据不同的 channel 返回 mock 数据
    switch (channel) {
      case IpcChannel.SESSION_LOAD_ALL:
        return { sessions: [] } as unknown as IpcResponseData<T>
      case IpcChannel.SETTINGS_GET:
        return {
          aiProvider: 'anthropic',
          baseUrl: '',
          defaultModel: 'claude-sonnet-4-6',
          maxTokens: 4096,
          temperature: 0.7,
          hasApiKey: false,
          activeProfileId: null,
        } as unknown as IpcResponseData<T>
      case IpcChannel.SETTINGS_HAS_KEY:
        return { hasKey: false } as unknown as IpcResponseData<T>
      case IpcChannel.PING:
        return { message: 'mock-pong', timestamp: Date.now(), echoTimestamp: Date.now() } as unknown as IpcResponseData<T>
      case IpcChannel.GET_APP_INFO:
        return { name: 'Latte Agent', version: '0.1.0', platform: 'browser' } as unknown as IpcResponseData<T>
      case IpcChannel.AI_GET_MODELS:
        // 返回 mock 模型列表，避免组件渲染时报错
        return {
          models: ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5-20251001']
        } as unknown as IpcResponseData<T>
      case IpcChannel.AI_VALIDATE_KEY:
        return { valid: false, error: 'Mock: 未实际验证' } as unknown as IpcResponseData<T>
      case IpcChannel.AI_SEND_MESSAGE:
        return { messageId: 'mock-msg-' + Date.now() } as unknown as IpcResponseData<T>
      // 档案管理 mock 响应
      case IpcChannel.PROFILE_LIST:
        return { profiles: [] } as unknown as IpcResponseData<T>
      case IpcChannel.PROFILE_SAVE:
        return { profile: {}, success: true } as unknown as IpcResponseData<T>
      case IpcChannel.PROFILE_DELETE:
        return { success: true } as unknown as IpcResponseData<T>
      case IpcChannel.PROFILE_ACTIVATE:
        return { success: true, activeProfileId: '' } as unknown as IpcResponseData<T>
      case IpcChannel.PROFILE_GET_ACTIVE:
        return { profile: null } as unknown as IpcResponseData<T>
      // Ollama 动态模型 mock 响应
      case IpcChannel.OLLAMA_FETCH_MODELS:
        return { models: ['llama3', 'qwen2', 'mistral'], success: true } as unknown as IpcResponseData<T>
      default:
        // 通用 mock 响应
        return {} as unknown as IpcResponseData<T>
    }
  },
  on<T extends IpcEventChannel>(_channel: T, callback: (data: IpcEventData<T>) => void): () => void {
    console.warn(`[Mock IPC] on called in non-Electron environment: ${_channel}`)
    // 返回一个空的清理函数
    return () => {}
  },
}

/**
 * 获取 IPC 实例
 * 在 Electron 环境中使用真实的 electronAPI，否则使用 mock
 */
function getIpc(): ElectronIPC {
  const api = (window as unknown as Record<string, ElectronIPC>).electronAPI
  if (api) {
    return api
  }
  // 非 Electron 环境：返回 mock 实现，让 UI 可以渲染
  console.info('[IPC] Running in browser mode, using mock IPC')
  return mockIpc
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
