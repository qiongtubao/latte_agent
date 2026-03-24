<template>
  <div id="app">
    <!-- 对话主界面（默认视图） -->
    <ChatWindow v-if="view === 'chat'" @open-settings="view = 'settings'" />

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
 * 应用入口视图，默认显示对话主界面
 */
import { ref } from 'vue'
import { invoke, on } from './ipc/client'
import { IpcChannel } from '@shared/ipc'
import ChatWindow from './components/ChatWindow.vue'
import SettingsPanel from './components/SettingsPanel.vue'

// 视图切换：chat（默认）、settings、ipc（开发调试）
const view = ref<'chat' | 'settings' | 'ipc'>('chat')

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
