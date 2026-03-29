<template>
  <!-- 对话主界面：三栏布局（头部、消息区、输入区） -->
  <div class="chat-window">
    <!-- 头部区域 -->
    <header class="chat-header">
      <h1 class="chat-title">Latte Agent</h1>
      <button class="settings-btn" @click="$emit('openSettings')" title="设置">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      </button>
    </header>

    <!-- 未配置密钥提示 -->
    <div v-if="!hasKey" class="no-key-hint">
      <p>未配置 API 密钥，请先前往设置页面配置</p>
      <button @click="$emit('openSettings')" class="primary-btn">前往设置</button>
    </div>

    <!-- 消息列表区域 -->
    <div v-else class="chat-body">
      <div class="messages-container" ref="messagesContainer">
        <!-- 欢迎提示 -->
        <div v-if="messages.length === 0 && !streamingContent" class="welcome">
          <p>开始与 AI 对话吧</p>
        </div>

        <!-- 历史消息 -->
        <div
          v-for="(msg, i) in messages"
          :key="i"
          :class="['message', msg.role]"
        >
          <div class="message-avatar">
            {{ msg.role === 'user' ? '你' : 'AI' }}
          </div>
          <div class="message-body">
            <!-- AI 消息使用 Markdown 渲染 -->
            <div
              v-if="msg.role === 'assistant'"
              class="message-content markdown-body"
              v-html="renderMarkdown(msg.content)"
            />
            <!-- 用户消息纯文本渲染 -->
            <div v-else class="message-content">{{ msg.content }}</div>
            <!-- 消息元信息：时间、耗时、Token -->
            <div v-if="msg.timestamp" class="message-meta">
              <span class="meta-time">{{ formatTime(msg.timestamp) }}</span>
              <span v-if="msg.role === 'assistant' && msg.duration != null" class="meta-duration">耗时 {{ formatDuration(msg.duration) }}</span>
              <span v-if="msg.role === 'assistant' && msg.inputTokens" class="meta-tokens">输入 {{ msg.inputTokens }}</span>
              <span v-if="msg.role === 'assistant' && msg.outputTokens" class="meta-tokens">输出 {{ msg.outputTokens }}</span>
            </div>
          </div>
        </div>

        <!-- 流式输出中的 AI 消息 -->
        <div v-if="streamingContent" class="message assistant streaming">
          <div class="message-avatar">AI</div>
          <div class="message-body">
            <div
              class="message-content markdown-body"
              v-html="renderMarkdown(streamingContent)"
            />
            <span class="streaming-cursor">|</span>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="input-area">
        <div class="input-wrapper">
          <textarea
            ref="inputRef"
            v-model="inputText"
            placeholder="输入消息，Enter 发送，Shift + Enter 换行..."
            :disabled="loading"
            @keydown="handleKeydown"
            rows="1"
          />
          <div class="input-actions">
            <!-- 停止生成按钮 -->
            <button
              v-if="isStreaming"
              @click="stopStream"
              class="stop-btn"
              title="停止生成"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
            </button>
            <!-- 发送按钮 -->
            <button
              v-else
              @click="sendMessage"
              :disabled="!inputText.trim() || loading"
              class="send-btn"
              title="发送"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
        </div>
        <!-- Token 使用统计 -->
        <div v-if="lastUsage" class="usage-stats">
          <span>输入 Tokens: {{ lastUsage.inputTokens }}</span>
          <span>输出 Tokens: {{ lastUsage.outputTokens }}</span>
          <span>模型: {{ lastUsage.model }}</span>
        </div>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" :class="['error-toast', errorType]">
      <div class="error-content">
        <svg class="error-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <span class="error-message">{{ error }}</span>
        <span v-if="errorAction" class="error-action">{{ errorAction }}</span>
      </div>
      <div class="error-actions">
        <!-- 认证错误：前往设置 -->
        <button
          v-if="errorType === 'auth'"
          @click="handleGoSettings"
          class="link-btn"
        >前往设置</button>
        <!-- 可重试错误：重试按钮 -->
        <button
          v-if="errorRetryable && lastFailedMessages"
          @click="retryLastMessage"
          class="retry-btn"
        >重试</button>
        <button @click="error = null" class="close-btn">&times;</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 对话主界面组件
 * 三栏布局：头部 + 消息列表 + 输入区
 * 支持 Markdown 渲染、代码语法高亮、流式输出
 */
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { invoke, on } from '../ipc/client'
import { IpcChannel, StreamChunkData, ApiErrorData } from '@shared/ipc'
import type { ChatMessage } from '@shared/session'
import { marked, type Tokens } from 'marked'
import hljs from 'highlight.js'

// Props：从父组件接收消息列表
const props = defineProps<{
  messages: ChatMessage[]
}>()

// 事件：向父组件通知消息变化
const emit = defineEmits<{
  openSettings: []
  messagesChange: [messages: ChatMessage[]]
}>()

/**
 * 自定义渲染器：代码块使用 highlight.js 语法高亮
 */
const customRenderer = new marked.Renderer()
customRenderer.code = function ({ text, lang }: Tokens.Code): string {
  const language = lang && hljs.getLanguage(lang) ? lang : undefined
  const highlighted = language
    ? hljs.highlight(text, { language }).value
    : hljs.highlightAuto(text).value
  const langClass = language ? ` language-${language}` : ''
  return `<pre><code class="hljs${langClass}">${highlighted}</code></pre>`
}

marked.setOptions({
  renderer: customRenderer,
  breaks: true, // 换行符转为 <br>
  gfm: true, // 启用 GitHub 风格 Markdown
})

// 状态
const hasKey = ref(false)
const inputText = ref('')
const loading = ref(false)
const isStreaming = ref(false)
const streamingContent = ref('')
const error = ref<string | null>(null)
const errorType = ref<string>('')
const errorAction = ref<string>('')
const errorRetryable = ref(false)
const lastFailedMessages = ref<Array<{ role: 'user' | 'assistant' | 'system'; content: string }> | null>(null)
const lastUsage = ref<{ inputTokens: number; outputTokens: number; model: string } | null>(null)
/** 流式请求开始时间，用于计算响应耗时 */
const streamStartTime = ref<number | null>(null)

// DOM 引用
const messagesContainer = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)

// 取消监听函数
let unsubscribeStream: (() => void) | null = null
let unsubscribeError: (() => void) | null = null

/**
 * 渲染 Markdown 文本为 HTML
 */
function renderMarkdown(text: string): string {
  if (!text) return ''
  try {
    return marked.parse(text) as string
  } catch {
    return text
  }
}

/**
 * 格式化时间戳为 HH:MM:SS
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/**
 * 格式化耗时（毫秒 → 易读格式）
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const mins = Math.floor(ms / 60000)
  const secs = Math.round((ms % 60000) / 1000)
  return `${mins}m ${secs}s`
}

/**
 * 检查是否已配置 API 密钥
 */
async function checkApiKey(): Promise<void> {
  try {
    const result = await invoke(IpcChannel.SETTINGS_HAS_KEY)
    hasKey.value = result.hasKey
  } catch {
    hasKey.value = false
  }
}

/**
 * 通知父组件消息列表已更新
 */
function notifyMessagesUpdate(updatedMessages: ChatMessage[]): void {
  emit('messagesChange', updatedMessages)
}

/**
 * 监听流式数据块
 */
function setupStreamListener(): void {
  if (unsubscribeStream) {
    unsubscribeStream()
  }

  unsubscribeStream = on(IpcChannel.AI_STREAM_CHUNK, (data: StreamChunkData) => {
    if (data.type === 'content_block_delta' && data.delta) {
      // 增量文本内容
      streamingContent.value += data.delta
      scrollToBottom()
    } else if (data.type === 'message_start') {
      // 消息开始
      streamingContent.value = ''
      if (data.model) {
        lastUsage.value = {
          inputTokens: data.inputTokens || 0,
          outputTokens: 0,
          model: data.model,
        }
      }
    } else if (data.type === 'message_delta') {
      // 更新 token 数（inputTokens 和 outputTokens 可能同时到达，如 Ollama）
      if (lastUsage.value) {
        if (data.outputTokens) {
          lastUsage.value.outputTokens = data.outputTokens
        }
        if (data.inputTokens) {
          lastUsage.value.inputTokens = data.inputTokens
        }
      }
    } else if (data.type === 'message_stop') {
      // 消息结束，将流式内容添加到消息列表（附带元数据）
      if (streamingContent.value) {
        // 计算响应耗时
        const duration = streamStartTime.value ? Date.now() - streamStartTime.value : undefined
        const updated = [...props.messages, {
          role: 'assistant' as const,
          content: streamingContent.value,
          timestamp: Date.now(),
          duration,
          inputTokens: lastUsage.value?.inputTokens,
          outputTokens: lastUsage.value?.outputTokens,
        }]
        notifyMessagesUpdate(updated)
      }
      streamingContent.value = ''
      isStreaming.value = false
      loading.value = false
      lastFailedMessages.value = null // 成功完成，清除失败消息
      streamStartTime.value = null // 清除计时
      scrollToBottom()
      focusInput()
    }
  })
}

/**
 * 监听流式错误事件
 */
function setupErrorListener(): void {
  if (unsubscribeError) {
    unsubscribeError()
  }

  unsubscribeError = on(IpcChannel.AI_STREAM_ERROR, (data: ApiErrorData) => {
    showError(data)
    isStreaming.value = false
    loading.value = false
    streamingContent.value = ''
    focusInput()
  })
}

/**
 * 发送消息到 AI（流式）
 */
async function sendMessage(): Promise<void> {
  const text = inputText.value.trim()
  if (!text || loading.value) return

  loading.value = true
  isStreaming.value = true
  error.value = null
  errorType.value = ''
  errorAction.value = ''
  errorRetryable.value = false
  streamingContent.value = ''
  inputText.value = ''

  // 添加用户消息（附带时间戳），通知父组件
  const now = Date.now()
  const updated = [...props.messages, { role: 'user' as const, content: text, timestamp: now }]
  notifyMessagesUpdate(updated)
  scrollToBottom()

  // 保存本次请求的消息（用于重试）
  lastFailedMessages.value = updated.map(m => ({ role: m.role, content: m.content }))

  // 记录流式请求开始时间
  streamStartTime.value = now

  try {
    // 发送完整的历史消息（包含当前用户输入）
    await invoke(IpcChannel.AI_SEND_MESSAGE_STREAM, {
      messages: updated.map(m => ({ role: m.role, content: m.content })),
    })
  } catch (e) {
    // 处理同步错误（如密钥未配置）
    const errData = e as ApiErrorData
    showError(errData)
    isStreaming.value = false
    loading.value = false
    focusInput()
  }
}

/**
 * 停止流式生成
 */
async function stopStream(): Promise<void> {
  try {
    await invoke(IpcChannel.AI_STOP_STREAM)
    if (streamingContent.value) {
      // 计算已生成耗时
      const duration = streamStartTime.value ? Date.now() - streamStartTime.value : undefined
      const updated = [...props.messages, {
        role: 'assistant' as const,
        content: streamingContent.value + '\n\n*[已停止]*',
        timestamp: Date.now(),
        duration,
        inputTokens: lastUsage.value?.inputTokens,
        outputTokens: lastUsage.value?.outputTokens,
      }]
      notifyMessagesUpdate(updated)
    }
    streamingContent.value = ''
    isStreaming.value = false
    loading.value = false
    streamStartTime.value = null
    scrollToBottom()
    focusInput()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

/**
 * 显示错误信息
 */
function showError(errData: ApiErrorData): void {
  error.value = errData.message
  errorType.value = errData.type
  errorAction.value = errData.action
  errorRetryable.value = errData.retryable
}

/**
 * 前往设置页面
 */
function handleGoSettings(): void {
  error.value = null
  emit('openSettings')
}

/**
 * 重试上次失败的消息
 */
async function retryLastMessage(): Promise<void> {
  if (!lastFailedMessages.value) return

  // 清除错误状态
  error.value = null
  errorType.value = ''
  errorAction.value = ''
  errorRetryable.value = false

  // 获取最后一条用户消息
  const lastUserMsg = lastFailedMessages.value[0]
  if (!lastUserMsg) return

  // 恢复输入框内容并重新发送
  inputText.value = lastUserMsg.content
  await sendMessage()
}

/**
 * 键盘事件处理：Enter 发送，Shift + Enter 换行
 */
function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

/**
 * 滚动消息列表到底部
 */
async function scrollToBottom(): Promise<void> {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

/**
 * 聚焦输入框
 */
function focusInput(): void {
  nextTick(() => {
    inputRef.value?.focus()
  })
}

/**
 * 当消息列表变化时（切换会话），滚动到底部
 */
watch(() => props.messages.length, () => {
  scrollToBottom()
})

onMounted(() => {
  checkApiKey()
  setupStreamListener()
  setupErrorListener()
  focusInput()
})

onUnmounted(() => {
  if (unsubscribeStream) {
    unsubscribeStream()
  }
  if (unsubscribeError) {
    unsubscribeError()
  }
})
</script>

<style scoped>
/* 对话主窗口布局 */
.chat-window {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background-color: #1a1a2e;
}

/* 头部 */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.8rem 1.2rem;
  background: #16213e;
  border-bottom: 1px solid #2a3a5a;
  flex-shrink: 0;
}

.chat-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #e94560;
  margin: 0;
}

.settings-btn {
  background: none;
  border: none;
  color: #a0a0b0;
  cursor: pointer;
  padding: 0.3rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.settings-btn:hover {
  color: #e0e0e0;
  background: #2a3a5a;
}

/* 未配置密钥提示 */
.no-key-hint {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #a0a0b0;
  gap: 1rem;
}

.primary-btn {
  background: #e94560;
  color: white;
  border: none;
  padding: 0.6rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
}

.primary-btn:hover {
  background: #ff6b8a;
}

/* 消息区域 */
.chat-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.2rem;
}

/* 滚动条样式 */
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #2a3a5a;
  border-radius: 3px;
}

/* 欢迎提示 */
.welcome {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6a7a8a;
  font-size: 0.95rem;
}

/* 消息样式 */
.message {
  display: flex;
  gap: 0.8rem;
  margin-bottom: 1.2rem;
  max-width: 80%;
}

.message.user {
  flex-direction: row-reverse;
  margin-left: auto;
}

.message.assistant {
  margin-right: auto;
}

/* 头像 */
.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.message.user .message-avatar {
  background: #e94560;
  color: white;
}

.message.assistant .message-avatar {
  background: #2a4a6a;
  color: #8ecae6;
}

/* 消息内容区 */
.message-body {
  position: relative;
}

.message-content {
  padding: 0.6rem 1rem;
  border-radius: 12px;
  font-size: 0.9rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.message.user .message-content {
  background: #e94560;
  color: white;
  border-top-right-radius: 4px;
}

.message.assistant .message-content {
  background: #16213e;
  color: #e0e0e0;
  border-top-left-radius: 4px;
}

/* 消息元信息（时间、耗时、Token） */
.message-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.3rem;
  font-size: 0.7rem;
  color: #6a7a8a;
}

.message-meta span {
  padding: 0.1rem 0.4rem;
  background: rgba(42, 58, 90, 0.4);
  border-radius: 4px;
}

.message.user .message-meta {
  justify-content: flex-end;
  background: transparent;
}

.message.user .message-meta span {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.75);
}

.meta-duration {
  color: #8ecae6;
}

.meta-tokens {
  color: #a0d0a0;
}

/* 流式输出 */
.message.streaming .message-content {
  border-left: 3px solid #e94560;
}

.streaming-cursor {
  color: #e94560;
  animation: blink 1s infinite;
  margin-left: 2px;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* 输入区域 */
.input-area {
  flex-shrink: 0;
  padding: 0.8rem 1.2rem;
  background: #16213e;
  border-top: 1px solid #2a3a5a;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  background: #0f3460;
  border: 1px solid #2a4a6a;
  border-radius: 12px;
  padding: 0.5rem 0.6rem 0.5rem 0.8rem;
  transition: border-color 0.2s;
}

.input-wrapper:focus-within {
  border-color: #e94560;
}

.input-wrapper textarea {
  flex: 1;
  background: transparent;
  border: none;
  color: #e0e0e0;
  font-size: 0.9rem;
  resize: none;
  outline: none;
  font-family: inherit;
  line-height: 1.5;
  max-height: 120px;
  padding: 0.2rem 0;
}

.input-wrapper textarea::placeholder {
  color: #5a6a7a;
}

.input-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

/* 发送按钮 */
.send-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: #e94560;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.send-btn:hover:not(:disabled) {
  background: #ff6b8a;
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 停止按钮 */
.stop-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: #ff4757;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.stop-btn:hover {
  background: #ff6b7a;
}

/* Token 统计 */
.usage-stats {
  display: flex;
  gap: 1.2rem;
  margin-top: 0.5rem;
  padding: 0.3rem 0;
  font-size: 0.75rem;
  color: #5a7a6a;
}

/* 错误提示 */
.error-toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: #4a1f1f;
  color: #ff8a8a;
  padding: 0.8rem 1.2rem;
  border-radius: 10px;
  font-size: 0.85rem;
  z-index: 100;
  max-width: 90%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.error-toast.auth {
  background: #3a2a1f;
  color: #ffb88a;
}

.error-toast.quota {
  background: #3f2a3f;
  color: #da8aff;
}

.error-content {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.error-icon {
  flex-shrink: 0;
  margin-bottom: 0.2rem;
}

.error-message {
  font-weight: 500;
}

.error-action {
  font-size: 0.8rem;
  opacity: 0.85;
}

.error-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.error-toast .link-btn {
  background: none;
  border: none;
  color: #8ecae6;
  text-decoration: underline;
  cursor: pointer;
  font-size: inherit;
  white-space: nowrap;
}

.error-toast .retry-btn {
  background: #e94560;
  color: white;
  border: none;
  padding: 0.3rem 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  white-space: nowrap;
  transition: background 0.2s;
}

.error-toast .retry-btn:hover {
  background: #ff6b8a;
}

.error-toast .close-btn {
  background: none;
  border: none;
  color: #ff8a8a;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0 0.2rem;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.error-toast .close-btn:hover {
  opacity: 1;
}
</style>

<!-- Markdown 渲染全局样式（非 scoped，用于 v-html 内容） -->
<style>
/* Markdown 内容样式 */
.markdown-body {
  white-space: normal;
  word-break: break-word;
}

.markdown-body p {
  margin: 0.4em 0;
}

.markdown-body p:first-child {
  margin-top: 0;
}

.markdown-body p:last-child {
  margin-bottom: 0;
}

.markdown-body h1, .markdown-body h2, .markdown-body h3,
.markdown-body h4, .markdown-body h5, .markdown-body h6 {
  margin: 0.8em 0 0.4em;
  font-weight: 600;
  color: #e0e0e0;
}

.markdown-body h1 { font-size: 1.3em; }
.markdown-body h2 { font-size: 1.2em; }
.markdown-body h3 { font-size: 1.1em; }

.markdown-body ul, .markdown-body ol {
  margin: 0.4em 0;
  padding-left: 1.5em;
}

.markdown-body li {
  margin: 0.2em 0;
}

.markdown-body blockquote {
  margin: 0.4em 0;
  padding: 0.2em 0.8em;
  border-left: 3px solid #3a5a7a;
  color: #a0a0b0;
  background: rgba(42, 74, 106, 0.2);
  border-radius: 0 4px 4px 0;
}

.markdown-body a {
  color: #8ecae6;
  text-decoration: none;
}

.markdown-body a:hover {
  text-decoration: underline;
}

.markdown-body code {
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 0.85em;
  background: rgba(15, 52, 96, 0.6);
  padding: 0.15em 0.4em;
  border-radius: 4px;
  color: #e94560;
}

.markdown-body pre {
  margin: 0.6em 0;
  border-radius: 8px;
  overflow-x: auto;
  background: #0a1628;
}

.markdown-body pre code {
  display: block;
  padding: 0.8em 1em;
  background: transparent;
  color: #e0e0e0;
  font-size: 0.85em;
  line-height: 1.5;
  border-radius: 8px;
}

.markdown-body table {
  border-collapse: collapse;
  margin: 0.6em 0;
  width: 100%;
}

.markdown-body th, .markdown-body td {
  border: 1px solid #2a3a5a;
  padding: 0.4em 0.8em;
  text-align: left;
}

.markdown-body th {
  background: #16213e;
  font-weight: 600;
}

.markdown-body hr {
  border: none;
  border-top: 1px solid #2a3a5a;
  margin: 0.8em 0;
}

.markdown-body img {
  max-width: 100%;
  border-radius: 6px;
}
</style>
