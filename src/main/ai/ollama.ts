/**
 * Ollama 本地 AI 服务客户端实现
 * 通过 REST API 与本地 Ollama 服务通信，无需额外 SDK
 */

import {
  AIClient,
  AIClientConfig,
  AIResponse,
  ChatMessage,
  StreamCallback,
  StreamErrorCallback,
  StreamChunk,
  registerProvider,
} from './client'
import { classifyError, ApiError } from './errors'

/**
 * Ollama 默认配置
 */
const OLLAMA_DEFAULT_BASE_URL = 'http://localhost:11434'
const OLLAMA_DEFAULT_MODEL = 'llama3'

/**
 * Ollama API 响应类型
 */
interface OllamaChatResponse {
  model: string
  message: {
    role: string
    content: string
  }
  done: boolean
}

interface OllamaTagsResponse {
  models: Array<{
    name: string
    modified_at: string
    size: number
  }>
}

/**
 * Ollama AI 客户端实现
 */
export class OllamaClient implements AIClient {
  readonly provider = 'ollama'
  private baseUrl: string
  private model: string
  private maxTokens: number
  private temperature: number

  constructor(config: AIClientConfig) {
    let url = config.baseUrl || OLLAMA_DEFAULT_BASE_URL
    // 自动补全协议（用户可能只输入 IP:端口）
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url
    }
    // 去除末尾斜杠
    this.baseUrl = url.replace(/\/+$/, '')
    this.model = config.model || OLLAMA_DEFAULT_MODEL
    this.maxTokens = config.maxTokens || 4096
    this.temperature = config.temperature ?? 0.7
  }

  /**
   * 发送消息到 Ollama API 并获取响应（非流式）
   */
  async sendMessage(
    messages: ChatMessage[],
    config?: Partial<AIClientConfig>
  ): Promise<AIResponse> {
    const model = config?.model || this.model
    const maxTokens = config?.maxTokens || this.maxTokens
    const temperature = config?.temperature ?? this.temperature

    // 转换消息格式为 Ollama 格式
    const ollamaMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: ollamaMessages,
          stream: false,
          options: {
            num_predict: maxTokens,
            temperature,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Ollama API 错误: ${response.status} ${response.statusText}`)
      }

      const data = (await response.json()) as OllamaChatResponse

      return {
        content: data.message.content,
        inputTokens: 0, // Ollama 不返回 token 数
        outputTokens: 0,
        model: data.model,
        timestamp: Date.now(),
      }
    } catch (error) {
      throw classifyError(error)
    }
  }

  /**
   * 发送消息并以流式方式获取响应
   */
  sendMessageStream(
    messages: ChatMessage[],
    onChunk: StreamCallback,
    config?: Partial<AIClientConfig>,
    onError?: StreamErrorCallback
  ): AbortController {
    const model = config?.model || this.model
    const maxTokens = config?.maxTokens || this.maxTokens
    const temperature = config?.temperature ?? this.temperature

    const abortController = new AbortController()

    // 转换消息格式
    const ollamaMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    ;(async () => {
      try {
        // 发送消息开始事件
        onChunk({
          type: 'message_start',
          model,
          inputTokens: 0,
        })

        const response = await fetch(`${this.baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: ollamaMessages,
            stream: true,
            options: {
              num_predict: maxTokens,
              temperature,
            },
          }),
          signal: abortController.signal,
        })

        if (!response.ok) {
          throw new Error(`Ollama API 错误: ${response.status} ${response.statusText}`)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('无法读取响应流')
        }

        const decoder = new TextDecoder()
        let fullContent = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          // Ollama 每行是一个 JSON 对象
          const lines = chunk.split('\n').filter((line) => line.trim())

          for (const line of lines) {
            try {
              const data = JSON.parse(line) as OllamaChatResponse & { done: boolean }
              if (data.message?.content) {
                fullContent += data.message.content
                onChunk({
                  type: 'content_block_delta',
                  delta: data.message.content,
                })
              }
              if (data.done) {
                onChunk({
                  type: 'message_delta',
                  outputTokens: 0,
                })
              }
            } catch {
              // 忽略解析错误
            }
          }
        }

        onChunk({ type: 'message_stop' })
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          onChunk({ type: 'message_stop' })
          return
        }
        const apiError = classifyError(error)
        console.error('Ollama 流式请求错误:', apiError.message)
        if (onError) {
          onError(apiError)
        }
        onChunk({ type: 'message_stop' })
      }
    })()

    return abortController
  }

  /**
   * 验证 Ollama 服务是否可用
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * 获取 Ollama 可用模型列表
   */
  getAvailableModels(): string[] {
    // 返回默认模型列表，实际模型通过 API 动态获取
    return [OLLAMA_DEFAULT_MODEL, 'llama2', 'mistral', 'codellama', 'qwen2']
  }

  /**
   * 从 Ollama 服务获取实际可用模型列表
   */
  async fetchAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      })
      if (!response.ok) {
        return this.getAvailableModels()
      }
      const data = (await response.json()) as OllamaTagsResponse
      return data.models.map((m) => m.name)
    } catch {
      return this.getAvailableModels()
    }
  }
}

// 自动注册到提供商注册表
registerProvider('ollama', (config: AIClientConfig) => new OllamaClient(config))
