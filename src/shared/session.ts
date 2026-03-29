/**
 * 会话数据类型定义
 * 定义对话会话的数据结构
 */

/** 单条消息 */
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  /** 消息发送/接收时间戳 */
  timestamp?: number
  /** AI 响应耗时（毫秒），仅 assistant 消息 */
  duration?: number
  /** 输入 token 数，仅 assistant 消息 */
  inputTokens?: number
  /** 输出 token 数，仅 assistant 消息 */
  outputTokens?: number
}

/** 会话 */
export interface Session {
  /** 唯一标识 */
  id: string
  /** 会话标题 */
  title: string
  /** 使用的模型 */
  model: string
  /** 创建时间戳 */
  createdAt: number
  /** 最后更新时间戳 */
  updatedAt: number
  /** 消息列表 */
  messages: ChatMessage[]
}

/** 生成会话 ID */
export function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
