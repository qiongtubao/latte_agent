/**
 * AI 客户端抽象接口
 * 定义统一的 AI 模型调用接口，支持多种 AI 提供商
 */

/**
 * 消息角色类型
 */
export type MessageRole = 'user' | 'assistant' | 'system'

/**
 * 消息结构
 */
export interface ChatMessage {
  role: MessageRole
  content: string
}

/**
 * AI 响应结果
 */
export interface AIResponse {
  /** 响应内容 */
  content: string
  /** 输入 token 数 */
  inputTokens: number
  /** 输出 token 数 */
  outputTokens: number
  /** 模型标识 */
  model: string
  /** 响应时间戳 */
  timestamp: number
}

/**
 * 流式响应数据块
 * 用于 SSE 流式输出时的增量数据
 */
export interface StreamChunk {
  /** 内容类型 */
  type: 'content_block_delta' | 'message_start' | 'message_delta' | 'message_stop'
  /** 增量文本内容（仅 type=content_block_delta 时有效） */
  delta?: string
  /** 输入 token 数（仅 type=message_start 时有效） */
  inputTokens?: number
  /** 输出 token 数（仅 type=message_delta 时有效） */
  outputTokens?: number
  /** 模型标识 */
  model?: string
}

/**
 * 流式响应回调函数类型
 */
export type StreamCallback = (chunk: StreamChunk) => void

/**
 * 流式错误回调函数类型
 */
export type StreamErrorCallback = (error: Error) => void

/**
 * AI 客户端配置
 */
export interface AIClientConfig {
  /** API 密钥 */
  apiKey: string
  /** 模型名称 */
  model?: string
  /** 最大 token 数 */
  maxTokens?: number
  /** 温度参数 (0-1) */
  temperature?: number
}

/**
 * AI 客户端抽象接口
 * 所有 AI 提供商实现此接口
 */
export interface AIClient {
  /** 提供商标识 */
  readonly provider: string

  /**
   * 发送消息并获取响应
   * @param messages 消息历史
   * @param config 可选配置覆盖
   */
  sendMessage(
    messages: ChatMessage[],
    config?: Partial<AIClientConfig>
  ): Promise<AIResponse>

  /**
   * 发送消息并以流式方式获取响应
   * @param messages 消息历史
   * @param onChunk 每次接收到数据块时的回调
   * @param config 可选配置覆盖
   * @param onError 错误回调（可选）
   * @returns 返回一个 AbortController 用于取消请求
   */
  sendMessageStream(
    messages: ChatMessage[],
    onChunk: StreamCallback,
    config?: Partial<AIClientConfig>,
    onError?: StreamErrorCallback
  ): AbortController

  /**
   * 验证 API 密钥是否有效
   * @param apiKey 可选密钥，不传则使用实例密钥
   */
  validateApiKey(apiKey?: string): Promise<boolean>

  /**
   * 获取可用模型列表
   */
  getAvailableModels(): string[]
}

/**
 * AI 客户端工厂函数类型
 */
export type AIClientFactory = (config: AIClientConfig) => AIClient

/**
 * AI 提供商注册表
 */
const providers: Map<string, AIClientFactory> = new Map()

/**
 * 注册 AI 提供商
 */
export function registerProvider(name: string, factory: AIClientFactory): void {
  providers.set(name, factory)
}

/**
 * 创建 AI 客户端实例
 */
export function createClient(provider: string, config: AIClientConfig): AIClient {
  const factory = providers.get(provider)
  if (!factory) {
    throw new Error(`未知的 AI 提供商: ${provider}`)
  }
  return factory(config)
}

/**
 * 获取所有已注册的提供商名称
 */
export function getRegisteredProviders(): string[] {
  return Array.from(providers.keys())
}
