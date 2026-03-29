/**
 * Claude (Anthropic) API 对接实现
 * 基于 @anthropic-ai/sdk 实现统一 AI 客户端接口
 */

import Anthropic from '@anthropic-ai/sdk'
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
 * Anthropic 默认可用模型列表
 */
const ANTHROPIC_MODELS = [
  'claude-sonnet-4-6',
  'claude-opus-4-6',
  'claude-haiku-4-5-20251001',
]

/**
 * Anthropic AI 客户端实现
 */
export class AnthropicClient implements AIClient {
  readonly provider = 'anthropic'
  private client: Anthropic
  private model: string
  private maxTokens: number
  private temperature: number

  constructor(config: AIClientConfig) {
    if (!config.apiKey) {
      throw new Error('Anthropic API 密钥未配置')
    }
    this.client = new Anthropic({ apiKey: config.apiKey, ...(config.baseUrl ? { baseURL: config.baseUrl } : {}) })
    this.model = config.model || 'claude-sonnet-4-6'
    this.maxTokens = config.maxTokens || 4096
    this.temperature = config.temperature ?? 1
  }

  /**
   * 发送消息到 Claude API 并获取响应
   */
  async sendMessage(
    messages: ChatMessage[],
    config?: Partial<AIClientConfig>
  ): Promise<AIResponse> {
    // 合并配置覆盖
    const model = config?.model || this.model
    const maxTokens = config?.maxTokens || this.maxTokens
    const temperature = config?.temperature ?? this.temperature

    // 如果有单独传入 apiKey，创建新客户端
    const client = config?.apiKey
      ? new Anthropic({ apiKey: config.apiKey })
      : this.client

    // 分离 system 消息和其他消息
    const systemMsg = messages.find((m) => m.role === 'system')
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

    try {
      // 调用 Claude API
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        ...(systemMsg ? { system: systemMsg.content } : {}),
        messages: chatMessages,
      })

      // 提取文本内容
      const textContent = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('')

      return {
        content: textContent,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model: response.model,
        timestamp: Date.now(),
      }
    } catch (error) {
      // 分类并重新抛出错误
      throw classifyError(error)
    }
  }

  /**
   * 发送消息并以流式方式获取响应
   * 使用 Claude API 的流式输出功能，逐块返回内容
   */
  sendMessageStream(
    messages: ChatMessage[],
    onChunk: StreamCallback,
    config?: Partial<AIClientConfig>,
    onError?: StreamErrorCallback
  ): AbortController {
    // 合并配置覆盖
    const model = config?.model || this.model
    const maxTokens = config?.maxTokens || this.maxTokens
    const temperature = config?.temperature ?? this.temperature

    // 如果有单独传入 apiKey，创建新客户端
    const client = config?.apiKey
      ? new Anthropic({ apiKey: config.apiKey })
      : this.client

    // 分离 system 消息和其他消息
    const systemMsg = messages.find((m) => m.role === 'system')
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

    // 创建 AbortController 用于取消请求
    const abortController = new AbortController()

    // 异步执行流式请求
    ;(async () => {
      try {
        // 调用 Claude API 流式接口
        const stream = client.messages.stream(
          {
            model,
            max_tokens: maxTokens,
            temperature,
            ...(systemMsg ? { system: systemMsg.content } : {}),
            messages: chatMessages,
          },
          {
            signal: abortController.signal,
          }
        )

        // 监听流式事件
        stream.on('streamEvent', (event) => {
          if (event.type === 'content_block_delta') {
            // 内容增量
            const delta = event.delta
            if (delta && delta.type === 'text_delta') {
              onChunk({
                type: 'content_block_delta',
                delta: delta.text,
              })
            }
          } else if (event.type === 'message_start') {
            // 消息开始，包含输入 token
            onChunk({
              type: 'message_start',
              inputTokens: event.message.usage.input_tokens,
              model: event.message.model,
            })
          } else if (event.type === 'message_delta') {
            // 消息增量，包含输出 token
            onChunk({
              type: 'message_delta',
              outputTokens: event.usage?.output_tokens,
            })
          } else if (event.type === 'message_stop') {
            // 消息结束
            onChunk({
              type: 'message_stop',
            })
          }
        })

        // 等待流完成
        await stream.finalMessage()
      } catch (error) {
        // 如果是取消请求，不报错
        if ((error as Error).name === 'AbortError') {
          onChunk({
            type: 'message_stop',
          })
          return
        }
        // 分类错误并通过错误回调通知渲染进程
        const apiError = classifyError(error)
        console.error('流式请求错误:', apiError.type, apiError.message)
        // 调用错误回调（如果提供）
        if (onError) {
          onError(apiError)
        }
        // 仍然发送 message_stop 以结束流
        onChunk({
          type: 'message_stop',
        })
      }
    })()

    return abortController
  }

  /**
   * 验证 API 密钥是否有效
   * 发送一条最简消息来验证
   */
  async validateApiKey(apiKey?: string): Promise<boolean> {
    try {
      const client = apiKey
        ? new Anthropic({ apiKey })
        : this.client
      // 发送最简请求验证密钥
      await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      })
      return true
    } catch (error) {
      const apiError = classifyError(error)
      // 只有认证错误才返回 false，其他错误可能是临时问题
      return apiError.type !== 'auth' && apiError.type !== 'bad_request'
    }
  }

  /**
   * 获取 Anthropic 可用模型列表
   */
  getAvailableModels(): string[] {
    return [...ANTHROPIC_MODELS]
  }
}

// 自动注册到提供商注册表
registerProvider('anthropic', (config: AIClientConfig) => new AnthropicClient(config))
