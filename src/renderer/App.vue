<template>
  <div id="app">
    <!-- 主布局：侧边栏 + 主内容区 -->
    <template v-if="view === 'chat'">
      <div class="main-layout">
        <!-- 侧边栏 -->
        <Sidebar
          :sessions="sortedSessions"
          :activeSessionId="activeSessionId"
          @newChat="createSession"
          @switchSession="switchSession"
          @deleteSession="deleteSession"
        />

        <!-- 主内容区 -->
        <div class="main-content">
          <!-- 对话主界面 -->
          <ChatWindow
            v-if="activeSessionId"
            :messages="activeMessages"
            @openSettings="view = 'settings'"
            @messagesChange="onMessagesChange"
            @newChat="createSession"
            @deleteSession="deleteSession(activeSessionId!)"
          />

          <!-- 无活跃会话时提示新建 -->
          <div v-else class="no-session-hint">
            <p>选择一个对话或新建对话</p>
            <button class="primary-btn" @click="createSession">新建对话</button>
          </div>
        </div>
      </div>
    </template>

    <!-- 设置面板（覆盖层） -->
    <div v-else-if="view === 'settings'" class="settings-overlay">
      <SettingsPanel />
      <button class="back-btn" @click="view = 'chat'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        返回对话
      </button>
    </div>

    <!-- IPC 测试面板（开发调试用） -->
    <div v-else-if="view === 'ipc'" class="dev-panel">
      <h2>IPC 通信测试</h2>
      <div class="test-section">
        <button @click="testPing" :disabled="loading">测试 Ping/Pong</button>
        <button @click="getAppInfo" :disabled="loading">获取应用信息</button>
      </div>

      <div v-if="loading" class="status loading">通信中...</div>

      <div v-if="pingResult" class="result">
        <strong>Ping 结果:</strong>
        <pre>{{ JSON.stringify(pingResult, null, 2) }}</pre>
      </div>

      <div v-if="appInfo" class="result">
        <strong>应用信息:</strong>
        <pre>{{ JSON.stringify(appInfo, null, 2) }}</pre>
      </div>

      <div v-if="error" class="error">
        <strong>错误:</strong> {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * App 根组件
 * 应用入口视图，管理会话状态和视图切换
 */
import { ref, computed, onMounted } from 'vue'
import { invoke, on } from './ipc/client'
import { IpcChannel } from '@shared/ipc'
import { generateSessionId } from '@shared/session'
import type { Session, ChatMessage } from '@shared/session'
import ChatWindow from './components/ChatWindow.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import Sidebar from './components/Sidebar.vue'

// 视图切换：chat（默认）、settings、ipc（开发调试）
const view = ref<'chat' | 'settings' | 'ipc'>('chat')

// ==================== 会话管理 ====================

/** 所有会话列表 */
const sessions = ref<Session[]>([])
/** 当前活跃会话 ID */
const activeSessionId = ref<string | null>(null)

/** 会话列表按更新时间倒序排列 */
const sortedSessions = computed(() =>
  [...sessions.value].sort((a, b) => b.updatedAt - a.updatedAt)
)

/** 当前活跃会话 */
const activeSession = computed(() =>
  sessions.value.find(s => s.id === activeSessionId.value) ?? null
)

/** 当前会话的消息列表 */
const activeMessages = computed<ChatMessage[]>(
  () => activeSession.value?.messages ?? []
)

/**
 * 将会话持久化到主进程存储
 * 使用深拷贝去除 Vue 响应式代理，避免 IPC 序列化丢失数据
 */
async function persistSession(session: Session): Promise<void> {
  try {
    // 深拷贝确保去除 Vue 响应式代理，避免 IPC 序列化问题
    const plainSession: Session = JSON.parse(JSON.stringify(session))
    await invoke(IpcChannel.SESSION_SAVE, { session: plainSession })
  } catch (e) {
    console.error('保存会话失败:', e)
  }
}

/**
 * 创建新会话
 */
function createSession(): void {
  const session: Session = {
    id: generateSessionId(),
    title: '新对话',
    model: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  }
  sessions.value.push(session)
  activeSessionId.value = session.id
  // 持久化新会话
  persistSession(session)
}

/**
 * 切换到指定会话
 */
function switchSession(id: string): void {
  activeSessionId.value = id
}

/**
 * 删除指定会话
 */
async function deleteSession(id: string): Promise<void> {
  const index = sessions.value.findIndex(s => s.id === id)
  if (index === -1) return

  sessions.value.splice(index, 1)

  // 从持久化存储中删除
  try {
    await invoke(IpcChannel.SESSION_DELETE, { sessionId: id })
  } catch (e) {
    console.error('删除会话失败:', e)
  }

  // 如果删除的是当前会话，切换到最近的会话
  if (activeSessionId.value === id) {
    activeSessionId.value = sortedSessions.value.length > 0
      ? sortedSessions.value[0].id
      : null
  }
}

/**
 * 消息列表更新回调（来自 ChatWindow）
 */
function onMessagesChange(updatedMessages: ChatMessage[]): void {
  if (!activeSession.value) return

  // 更新会话消息
  activeSession.value.messages = updatedMessages
  activeSession.value.updatedAt = Date.now()

  // 根据第一条用户消息自动设置标题
  if (activeSession.value.title === '新对话') {
    const firstUserMsg = updatedMessages.find(m => m.role === 'user')
    if (firstUserMsg) {
      activeSession.value.title = firstUserMsg.content.slice(0, 30) +
        (firstUserMsg.content.length > 30 ? '...' : '')
    }
  }

  // 自动保存会话到持久化存储
  persistSession(activeSession.value)
}

// ==================== IPC 测试 ====================

/**
 * 应用启动时加载历史会话
 */
onMounted(async () => {
  try {
    const result = await invoke(IpcChannel.SESSION_LOAD_ALL)
    if (result.sessions.length > 0) {
      sessions.value = result.sessions
      // 激活最近更新的会话
      const latest = result.sessions.sort((a, b) => b.updatedAt - a.updatedAt)[0]
      activeSessionId.value = latest.id
    }
  } catch (e) {
    console.error('加载历史会话失败:', e)
  }
})

// IPC 测试状态
const loading = ref(false)
const pingResult = ref<{ message: string; timestamp: number; echoTimestamp: number } | null>(null)
const appInfo = ref<{ name: string; version: string; platform: string } | null>(null)
const error = ref<string | null>(null)

/**
 * 测试 ping/pong 双向通信
 */
async function testPing(): Promise<void> {
  loading.value = true
  error.value = null
  pingResult.value = null

  try {
    pingResult.value = await invoke(IpcChannel.PING, { timestamp: Date.now() })
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

/**
 * 获取应用信息
 */
async function getAppInfo(): Promise<void> {
  loading.value = true
  error.value = null
  appInfo.value = null

  try {
    appInfo.value = await invoke(IpcChannel.GET_APP_INFO)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

// 监听主进程推送的通知事件
on(IpcChannel.NOTIFICATION, (data) => {
  console.log('收到主进程通知:', data)
})
</script>

<style>
/* 全局基础样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #1a1a2e;
  color: #e0e0e0;
}

#app {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* 主布局：侧边栏 + 内容区 */
.main-layout {
  display: flex;
  width: 100%;
  height: 100vh;
}

.main-content {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

/* 无会话提示 */
.no-session-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 1rem;
  color: #5a6a7a;
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

/* 设置面板覆盖层 */
.settings-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 2rem;
  background: #1a1a2e;
}

.settings-overlay .settings-panel {
  min-width: 420px;
}

.back-btn {
  margin-top: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: #2a4a6a;
  color: #8ecae6;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}

.back-btn:hover {
  background: #3a5a7a;
}

/* IPC 开发调试面板 */
.dev-panel {
  padding: 2rem;
}

h2 {
  font-size: 1.3rem;
  margin-bottom: 1rem;
  color: #e94560;
}

.test-section {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

button {
  background: #e94560;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: background 0.2s;
}

button:hover:not(:disabled) {
  background: #ff6b8a;
}

button:disabled {
  background: #555;
  cursor: not-allowed;
}

.status {
  padding: 0.5rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.status.loading {
  background: #2a4a6a;
  color: #8ecae6;
}

.result {
  background: #16213e;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 0.8rem;
}

.result pre {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #a0d2db;
  white-space: pre-wrap;
}

.error {
  background: #4a1f1f;
  border-radius: 6px;
  padding: 1rem;
  color: #ff8a8a;
}
</style>
