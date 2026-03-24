<template>
  <div id="app">
    <h1>Latte Agent</h1>
    <p>Electron + Vue3 应用已成功启动</p>

    <!-- IPC 测试区域 -->
    <div class="ipc-test">
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
 * 应用入口视图，包含 IPC 通信测试
 */
import { ref } from 'vue'
import { invoke, on } from './ipc/client'
import { IpcChannel } from '@shared/ipc'

// 状态
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
    // 发送 ping 请求
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

// 监听主进程推送的通知事件（演示双向通信）
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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: #e94560;
}

h2 {
  font-size: 1.3rem;
  margin-bottom: 1rem;
  color: #e94560;
}

p {
  font-size: 1.1rem;
  color: #a0a0b0;
  margin-bottom: 2rem;
}

/* IPC 测试区域样式 */
.ipc-test {
  background: #16213e;
  border-radius: 12px;
  padding: 1.5rem 2rem;
  margin-top: 1rem;
  min-width: 400px;
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
  background: #0f3460;
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
