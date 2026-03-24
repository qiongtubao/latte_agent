/**
 * API 错误分类和处理模块
 * 将 API 错误分类为网络错误、认证错误、配额错误等
 */

/**
 * 错误类型枚举
 */
export enum ApiErrorType {
  /** 网络错误：无法连接到服务器 */
  NETWORK = 'network',
  /** 认证错误：API 密钥无效或过期 */
  AUTH = 'auth',
  /** 配额错误：超出使用限制 */
  QUOTA = 'quota',
  /** 请求错误：参数无效或请求格式错误 */
  BAD_REQUEST = 'bad_request',
  /** 服务器错误：API 服务端问题 */
  SERVER = 'server',
  /** 超时错误：请求超时 */
  TIMEOUT = 'timeout',
  /** 取消错误：用户主动取消 */
  CANCELLED = 'cancelled',
  /** 未知错误：其他错误 */
  UNKNOWN = 'unknown',
}

/**
 * API 错误类
 * 包含错误类型、用户友好消息和可操作建议
 */
export class ApiError extends Error {
  /** 错误类型 */
  readonly type: ApiErrorType
  /** 是否可重试 */
  readonly retryable: boolean
  /** 用户友好的操作建议 */
  readonly action: string

  constructor(type: ApiErrorType, message: string, retryable: boolean, action: string) {
    super(message)
    this.name = 'ApiError'
    this.type = type
    this.retryable = retryable
    this.action = action
  }

  /**
   * 转换为 JSON 格式（用于 IPC 传输）
   */
  toJSON(): ApiErrorData {
    return {
      type: this.type,
      message: this.message,
      retryable: this.retryable,
      action: this.action,
    }
  }
}

/**
 * API 错误数据结构（用于 IPC 传输）
 */
export interface ApiErrorData {
  type: ApiErrorType
  message: string
  retryable: boolean
  action: string
}

/**
 * 用户友好的错误信息映射
 */
const ERROR_MESSAGES: Record<ApiErrorType, { message: string; action: string }> = {
  [ApiErrorType.NETWORK]: {
    message: '网络连接失败，无法连接到 AI 服务',
    action: '请检查网络连接后重试',
  },
  [ApiErrorType.AUTH]: {
    message: 'API 密钥无效或已过期',
    action: '请前往设置检查并更新 API 密钥',
  },
  [ApiErrorType.QUOTA]: {
    message: 'API 使用配额已超限',
    action: '请升级套餐或等待配额重置',
  },
  [ApiErrorType.BAD_REQUEST]: {
    message: '请求参数无效',
    action: '请检查输入内容后重试',
  },
  [ApiErrorType.SERVER]: {
    message: 'AI 服务暂时不可用',
    action: '请稍后重试',
  },
  [ApiErrorType.TIMEOUT]: {
    message: '请求超时，响应时间过长',
    action: '请检查网络或稍后重试',
  },
  [ApiErrorType.CANCELLED]: {
    message: '请求已取消',
    action: '',
  },
  [ApiErrorType.UNKNOWN]: {
    message: '发生未知错误',
    action: '请重试或联系支持',
  },
}

/**
 * 根据 HTTP 状态码判断错误类型
 */
function getErrorTypeFromStatus(status: number): ApiErrorType {
  if (status === 401 || status === 403) {
    return ApiErrorType.AUTH
  }
  if (status === 429) {
    return ApiErrorType.QUOTA
  }
  if (status >= 400 && status < 500) {
    return ApiErrorType.BAD_REQUEST
  }
  if (status >= 500) {
    return ApiErrorType.SERVER
  }
  return ApiErrorType.UNKNOWN
}

/**
 * 判断错误是否可重试
 */
function isRetryable(type: ApiErrorType): boolean {
  return [ApiErrorType.NETWORK, ApiErrorType.TIMEOUT, ApiErrorType.SERVER].includes(type)
}

/**
 * 分类并创建 API 错误
 * @param error 原始错误对象
 * @returns ApiError 实例
 */
export function classifyError(error: unknown): ApiError {
  // 如果已经是 ApiError，直接返回
  if (error instanceof ApiError) {
    return error
  }

  // 解析错误信息
  const err = error as Error & { status?: number; code?: string; name?: string }

  // 取消错误
  if (err.name === 'AbortError' || err.code === 'ABORT_ERR') {
    const { message, action } = ERROR_MESSAGES[ApiErrorType.CANCELLED]
    return new ApiError(ApiErrorType.CANCELLED, message, false, action)
  }

  // 超时错误
  if (err.name === 'TimeoutError' || err.code === 'ETIMEDOUT' || err.code === 'UND_ERR_CONNECT_TIMEOUT') {
    const { message, action } = ERROR_MESSAGES[ApiErrorType.TIMEOUT]
    return new ApiError(ApiErrorType.TIMEOUT, message, true, action)
  }

  // 网络错误
  if (
    err.code === 'ENOTFOUND' ||
    err.code === 'ECONNREFUSED' ||
    err.code === 'ECONNRESET' ||
    err.code === 'ENETUNREACH' ||
    err.code === 'ERR_NETWORK' ||
    err.message?.includes('network') ||
    err.message?.includes('ECONNREFUSED') ||
    err.message?.includes('fetch failed')
  ) {
    const { message, action } = ERROR_MESSAGES[ApiErrorType.NETWORK]
    return new ApiError(ApiErrorType.NETWORK, message, true, action)
  }

  // HTTP 状态码错误
  if (err.status) {
    const type = getErrorTypeFromStatus(err.status)
    const { message, action } = ERROR_MESSAGES[type]
    return new ApiError(type, message, isRetryable(type), action)
  }

  // Anthropic SDK 特定错误
  if (err.message) {
    const msg = err.message.toLowerCase()

    // 认证错误
    if (msg.includes('invalid api key') || msg.includes('authentication') || msg.includes('unauthorized')) {
      const { message, action } = ERROR_MESSAGES[ApiErrorType.AUTH]
      return new ApiError(ApiErrorType.AUTH, message, false, action)
    }

    // 配额错误
    if (msg.includes('rate limit') || msg.includes('quota') || msg.includes('too many requests') || msg.includes('overloaded')) {
      const { message, action } = ERROR_MESSAGES[ApiErrorType.QUOTA]
      return new ApiError(ApiErrorType.QUOTA, message, false, action)
    }

    // 超时
    if (msg.includes('timeout') || msg.includes('timed out')) {
      const { message, action } = ERROR_MESSAGES[ApiErrorType.TIMEOUT]
      return new ApiError(ApiErrorType.TIMEOUT, message, true, action)
    }
  }

  // 未知错误
  const { message, action } = ERROR_MESSAGES[ApiErrorType.UNKNOWN]
  const detailMsg = err.message ? `${message}: ${err.message}` : message
  return new ApiError(ApiErrorType.UNKNOWN, detailMsg, true, action)
}

/**
 * 从错误数据恢复 ApiError 实例
 */
export function fromErrorData(data: ApiErrorData): ApiError {
  return new ApiError(data.type, data.message, data.retryable, data.action)
}
