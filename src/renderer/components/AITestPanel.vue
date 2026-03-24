<template>
  <div class="ai-test">
    <h2>AI 对话测试</h2>

    <!-- 未配置密钥提示 -->
    <div v-if="!hasKey" class="no-key-hint">
      <p>未配置 API 密钥，请先前往设置页面配置</p>
      <button @click="$emit('openSettings')" class="primary">前往设置</button>
    </div>

    <!-- AI 对话区域 -->
    <div v-else class="chat-area">
      <!-- 消息列表 -->
      <div class="messages" ref="messagesContainer">
        <div v-for="(msg, i) in messages" :key="i" :class="['message', msg.role]">
          <div class="role-label">{{ msg.role === 'user' ? '用户' : 'AI' }}</div>
          <div class="content">{{ msg.content }}</div>
        </div>
        <!-- 流式输出中的 AI 消息 -->
        <div v-if="streamingContent" class="message assistant streaming">
          <div class="role-label">AI</div>
          <div class="content">
            {{ streamingContent }}<span class="cursor">|</span>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="input-area">
        <textarea
          v-model="inputText"
          placeholder="输入测试消息..."
          :disabled="loading"
          @keydown.enter.ctrl="sendMessage"
          rows="3"
        />
        <div class="input-actions">
          <span class="hint">Ctrl + Enter 发送</span>
          <div class="buttons">
            <!-- 停止生成按钮 -->
            <button
              v-if="isStreaming"
              @click="stopStream"
              class="stop-btn"
            >
              停止生成
            </button>
            <!-- 发送按钮 -->
            <button
              @click="sendMessage"
              :disabled="!inputText.trim() || loading"
              class="primary"
            >
              {{ loading ? '发送中...' : '发送' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Token 使用统计 -->
      <div v-if="lastUsage" class="usage-stats">
        <span>输入 Tokens: {{ lastUsage.inputTokens }}</span>
        <span>输出 Tokens: {{ lastUsage.outputTokens }}</span>
        <span>模型: {{ lastUsage.model }}</span>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error">
      <strong>错误:</strong> {{ error }}
      <button v-if="error.includes('密钥')" @click="$emit('openSettings')" class="link-btn">
        前往设置
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * AI 对话测试组件
 * 支持流式输出和停止生成功能
 */
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { invoke, on } from '../ipc/client'
import { IpcChannel, AIResponseData, StreamChunkData } from '@shared/ipc'

defineEmits<{ openSettings: [] }>()

// 状态
const hasKey = ref(false)
const messages = ref<Array<{ role: 'user' | 'assistant'; content: string }>>([])
const inputText = ref('')
const loading = ref(false)
const isStreaming = ref(false) // 是否正在流式输出
const streamingContent = ref('') // 流式输出的累积内容
const error = ref<string | null>(null)
const lastUsage = ref<{ inputTokens: number; outputTokens: number; model: string } | null>(null)
const messagesContainer = ref<HTMLElement | null>(null)

// 取消监听函数
let unsubscribeStream: (() => void) | null = null

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
 * 监听流式数据块
 */
function setupStreamListener(): void {
  // 取消之前的监听
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
      // 更新输出 token 数
      if (lastUsage.value && data.outputTokens) {
        lastUsage.value.outputTokens = data.outputTokens
      }
    } else if (data.type === 'message_stop') {
      // 消息结束，将流式内容添加到消息列表
      if (streamingContent.value) {
        messages.value.push({
          role: 'assistant',
          content: streamingContent.value,
        })
      }
      streamingContent.value = ''
      isStreaming.value = false
      loading.value = false
      scrollToBottom()
    }
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
  streamingContent.value = ''
  inputText.value = ''

  // 添加用户消息
  messages.value.push({ role: 'user', content: text })

  try {
    // 使用流式接口
    await invoke(IpcChannel.AI_SEND_MESSAGE_STREAM, {
      messages: [{ role: 'user', content: text }],
    })
    // 流式响应通过事件处理，这里不需要等待
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    isStreaming.value = false
    loading.value = false
  }
}

/**
 * 停止流式生成
 */
async function stopStream(): Promise<void> {
  try {
    await invoke(IpcChannel.AI_STOP_STREAM)
    // 如果有部分内容，保存到消息列表
    if (streamingContent.value) {
      messages.value.push({
        role: 'assistant',
        content: streamingContent.value + ' [已停止]',
      })
    }
    streamingContent.value = ''
    isStreaming.value = false
    loading.value = false
    scrollToBottom()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

/**
 * 滚动到底部
 */
async function scrollToBottom(): Promise<void> {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

onMounted(() => {
  checkApiKey()
  setupStreamListener()
})

onUnmounted(() => {
  // 清理监听器
  if (unsubscribeStream) {
    unsubscribeStream()
  }
})
</script>

<style scoped>
.ai-test {
  background: #16213e;
  border-radius: 12px;
  padding: 1.5rem 2rem;
  min-width: 400px;
}

h2 {
  font-size: 1.3rem;
  margin-bottom: 1rem;
  color: #e94560;
}

.no-key-hint {
  text-align: center;
  padding: 2rem;
  color: #a0a0b0;
}

.no-key-hint button {
  margin-top: 1rem;
}

.no-key-hint .primary {
  background: #e94560;
  color: white;
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.messages {
  min-height: 150px;
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 1rem;
  padding: 0.5rem;
  border-radius: 6px;
  background: #0f3460;
}

.message {
  margin-bottom: 0.8rem;
  padding: 0.6rem 0.8rem;
  border-radius: 6px;
}

.message.user {
  background: #1a3a5a;
}

.message.assistant {
  background: #1a2a3a;
}

.message.streaming {
  border-left: 3px solid #e94560;
}

.role-label {
  font-size: 0.75rem;
  color: #6a8a9a;
  margin-bottom: 0.3rem;
}

.content {
  font-size: 0.9rem;
  color: #e0e0e0;
  white-space: pre-wrap;
}

/* 流式输出光标动画 */
.cursor {
  animation: blink 1s infinite;
  color: #e94560;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.input-area textarea {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid #2a4a6a;
  border-radius: 6px;
  background: #0f3460;
  color: #e0e0e0;
  font-size: 0.9rem;
  resize: vertical;
  font-family: inherit;
}

.input-area textarea:focus {
  outline: none;
  border-color: #e94560;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
}

.input-actions .hint {
  font-size: 0.8rem;
  color: #6a8a9a;
}

.buttons {
  display: flex;
  gap: 0.5rem;
}

.input-actions .primary {
  background: #e94560;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}

.input-actions .primary:hover:not(:disabled) {
  background: #ff6b8a;
}

.input-actions .primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 停止按钮样式 */
.stop-btn {
  background: #ff4757;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.stop-btn:hover {
  background: #ff6b7a;
}

.usage-stats {
  display: flex;
  gap: 1.5rem;
  margin-top: 0.8rem;
  padding: 0.6rem 0.8rem;
  background: #0f3460;
  border-radius: 6px;
  font-size: 0.8rem;
  color: #6ecaa0;
}

.error {
  background: #4a1f1f;
  border-radius: 6px;
  padding: 1rem;
  margin-top: 1rem;
  color: #ff8a8a;
}

.link-btn {
  background: none;
  border: none;
  color: #8ecae6;
  text-decoration: underline;
  cursor: pointer;
  margin-left: 0.5rem;
  font-size: inherit;
}
</style>
