/**
 * OpenAI 兼容 API 客户端实现
 * 支持任意 OpenAI-compatible API 端点（如 vLLM、LocalAI、代理服务等）
 */

import {
  AIClient,
  AIClientConfig,
  AIResponse,
  ChatMessage,
  StreamCallback,
  StreamErrorCallback,
  registerProvider,
} from './client'
import { classifyError } from './errors'

/**
 * OpenAI 兼容 API 默认配置
 */
const OPENAI_DEFAULT_MODEL = 'gpt-3.5-turbo'

/**
 * OpenAI API 响应类型
 */
interface OpenAIChatResponse {
  id: string
  object: string
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

interface OpenAIModelsResponse {
  data: Array<{
    id: string
    object: string
    owned_by: string
  }>
}

/**
 * OpenAI 兼容 API 客户端实现
 */
export class OpenAICompatibleClient implements AIClient {
  readonly provider = 'openai-compatible'
  private baseUrl: string
  private apiKey: string | undefined
  private model: string
  private maxTokens: number
  private temperature: number

  constructor(config: AIClientConfig) {
    if (!config.baseUrl) {
      throw new Error('OpenAI 兼容 API 需要配置 baseUrl')
    }
    this.baseUrl = config.baseUrl
    this.apiKey = config.apiKey
    this.model = config.model || OPENAI_DEFAULT_MODEL
    this.maxTokens = config.maxTokens || 4096
    this.temperature = config.temperature ?? 0.7
  }

  /**
   * 获取请求头
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }
    return headers
  }

  /**
   * 构建 API URL
   */
  private getApiUrl(path: string): string {
    const base = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl
    return `${base}${path}`
  }

  /**
   * 发送消息并获取响应（非流式）
   */
  async sendMessage(
    messages: ChatMessage[],
    config?: Partial<AIClientConfig>
  ): Promise<AIResponse> {
    const model = config?.model || this.model
    const maxTokens = config?.maxTokens || this.maxTokens
    const temperature = config?.temperature ?? this.temperature

    const openaiMessages = messages.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }))

    try {
      const response = await fetch(this.getApiUrl('/v1/chat/completions'), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model,
          messages: openaiMessages,
          max_tokens: maxTokens,
          temperature,
          stream: false,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API 错误: ${response.status} ${errorText}`)
      }

      const data = (await response.json()) as OpenAIChatResponse
      const choice = data.choices[0]

      return {
        content: choice.message.content,
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
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

    const openaiMessages = messages.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
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

        const response = await fetch(this.getApiUrl('/v1/chat/completions'), {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            model,
            messages: openaiMessages,
            max_tokens: maxTokens,
            temperature,
            stream: true,
          }),
          signal: abortController.signal,
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`API 错误: ${response.status} ${errorText}`)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('无法读取响应流')
        }

        const decoder = new TextDecoder()
        let buffer = ''
        let outputTokens = 0

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // 保留未完成的行

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data: ')) continue

            const data = trimmed.slice(6)
            if (data === '[DONE]') {
              onChunk({
                type: 'message_delta',
                outputTokens,
              })
              continue
            }

            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content
              if (delta) {
                outputTokens++
                onChunk({
                  type: 'content_block_delta',
                  delta,
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
        console.error('OpenAI 兼容 API 流式请求错误:', apiError.message)
        if (onError) {
          onError(apiError)
        }
        onChunk({ type: 'message_stop' })
      }
    })()

    return abortController
  }

  /**
   * 验证 API 连接
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(this.getApiUrl('/v1/models'), {
        method: 'GET',
        headers: this.getHeaders(),
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * 获取可用模型列表
   */
  getAvailableModels(): string[] {
    return [OPENAI_DEFAULT_MODEL, 'gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini']
  }

  /**
   * 从 API 获取实际可用模型列表
   */
  async fetchAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(this.getApiUrl('/v1/models'), {
        method: 'GET',
        headers: this.getHeaders(),
      })
      if (!response.ok) {
        return this.getAvailableModels()
      }
      const data = (await response.json()) as OpenAIModelsResponse
      return data.data.map((m) => m.id)
    } catch {
      return this.getAvailableModels()
    }
  }
}

// 自动注册到提供商注册表
registerProvider('openai-compatible', (config: AIClientConfig) => new OpenAICompatibleClient(config))
