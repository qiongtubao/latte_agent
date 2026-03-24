<template>
  <div class="settings-panel">
    <h2>设置</h2>

    <!-- API 密钥配置 -->
    <div class="setting-group">
      <label>API 密钥</label>
      <div class="api-key-input">
        <input
          :type="showKey ? 'text' : 'password'"
          v-model="apiKey"
          placeholder="输入 Anthropic API 密钥"
          :disabled="saving"
        />
        <button class="toggle-btn" @click="showKey = !showKey">
          {{ showKey ? '隐藏' : '显示' }}
        </button>
      </div>
      <p class="hint" v-if="settings?.hasApiKey && !apiKey">
        已配置密钥（显示为空表示未修改）
      </p>
    </div>

    <!-- 模型选择 -->
    <div class="setting-group">
      <label>默认模型</label>
      <select v-model="defaultModel" :disabled="!models.length">
        <option v-for="model in models" :key="model" :value="model">
          {{ model }}
        </option>
      </select>
    </div>

    <!-- 高级设置 -->
    <div class="setting-group">
      <label>最大 Token 数</label>
      <input type="number" v-model.number="maxTokens" min="1" max="32000" />
    </div>

    <div class="setting-group">
      <label>温度 (Temperature)</label>
      <input type="range" v-model.number="temperature" min="0" max="2" step="0.1" />
      <span class="value">{{ temperature }}</span>
    </div>

    <!-- 操作按钮 -->
    <div class="actions">
      <button @click="validateKey" :disabled="!apiKey || validating" class="secondary">
        {{ validating ? '验证中...' : '验证密钥' }}
      </button>
      <button @click="saveSettings" :disabled="saving" class="primary">
        {{ saving ? '保存中...' : '保存设置' }}
      </button>
    </div>

    <!-- 状态反馈 -->
    <div v-if="message" :class="['message', message.type]">
      {{ message.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 设置面板组件
 * 用于配置 API 密钥和 AI 参数
 */
import { ref, onMounted, watch } from 'vue'
import { invoke } from '../ipc/client'
import { IpcChannel, SettingsData } from '@shared/ipc'

// 状态
const apiKey = ref('')
const defaultModel = ref('claude-sonnet-4-6')
const maxTokens = ref(4096)
const temperature = ref(1)
const models = ref<string[]>([])
const settings = ref<SettingsData | null>(null)

const showKey = ref(false)
const saving = ref(false)
const validating = ref(false)
const message = ref<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

/**
 * 加载当前设置
 */
async function loadSettings(): Promise<void> {
  try {
    settings.value = await invoke(IpcChannel.SETTINGS_GET)
    defaultModel.value = settings.value.defaultModel
    maxTokens.value = settings.value.maxTokens
    temperature.value = settings.value.temperature
  } catch (e) {
    showMessage('error', '加载设置失败: ' + (e instanceof Error ? e.message : String(e)))
  }
}

/**
 * 加载可用模型列表
 */
async function loadModels(): Promise<void> {
  try {
    const result = await invoke(IpcChannel.AI_GET_MODELS)
    models.value = result.models
  } catch {
    models.value = ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5-20251001']
  }
}

/**
 * 验证 API 密钥
 */
async function validateKey(): Promise<void> {
  if (!apiKey.value) return
  validating.value = true
  message.value = null
  try {
    const result = await invoke(IpcChannel.AI_VALIDATE_KEY, { apiKey: apiKey.value })
    if (result.valid) {
      showMessage('success', 'API 密钥有效')
    } else {
      showMessage('error', result.error || 'API 密钥无效')
    }
  } catch (e) {
    showMessage('error', '验证失败: ' + (e instanceof Error ? e.message : String(e)))
  } finally {
    validating.value = false
  }
}

/**
 * 保存设置
 */
async function saveSettings(): Promise<void> {
  saving.value = true
  message.value = null
  try {
    const updateData: Record<string, unknown> = {
      defaultModel: defaultModel.value,
      maxTokens: maxTokens.value,
      temperature: temperature.value,
    }
    // 只有在用户输入了新密钥时才保存密钥
    if (apiKey.value) {
      updateData.apiKey = apiKey.value
    }
    settings.value = await invoke(IpcChannel.SETTINGS_SET, updateData)
    showMessage('success', '设置已保存')
    apiKey.value = '' // 清空密钥输入框
  } catch (e) {
    showMessage('error', '保存失败: ' + (e instanceof Error ? e.message : String(e)))
  } finally {
    saving.value = false
  }
}

/**
 * 显示提示消息
 */
function showMessage(type: 'success' | 'error' | 'info', text: string): void {
  message.value = { type, text }
  setTimeout(() => {
    message.value = null
  }, 3000)
}

// 组件挂载时加载数据
onMounted(() => {
  loadSettings()
  loadModels()
})
</script>

<style scoped>
.settings-panel {
  background: #16213e;
  border-radius: 12px;
  padding: 1.5rem 2rem;
  min-width: 400px;
}

h2 {
  font-size: 1.3rem;
  margin-bottom: 1.5rem;
  color: #e94560;
}

.setting-group {
  margin-bottom: 1.2rem;
}

.setting-group label {
  display: block;
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
  color: #a0a0b0;
}

.setting-group input[type='text'],
.setting-group input[type='password'],
.setting-group input[type='number'],
.setting-group select {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid #2a4a6a;
  border-radius: 6px;
  background: #0f3460;
  color: #e0e0e0;
  font-size: 0.95rem;
}

.setting-group input:focus,
.setting-group select:focus {
  outline: none;
  border-color: #e94560;
}

.setting-group input[type='range'] {
  width: calc(100% - 50px);
  vertical-align: middle;
}

.setting-group .value {
  display: inline-block;
  width: 40px;
  text-align: right;
  color: #8ecae6;
}

.api-key-input {
  display: flex;
  gap: 0.5rem;
}

.api-key-input input {
  flex: 1;
}

.toggle-btn {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
  background: #2a4a6a;
  color: #8ecae6;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.toggle-btn:hover {
  background: #3a5a7a;
}

.hint {
  font-size: 0.8rem;
  color: #6a8a9a;
  margin-top: 0.3rem;
}

.actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.actions button {
  flex: 1;
  padding: 0.7rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

.actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.actions button.primary {
  background: #e94560;
  color: white;
}

.actions button.primary:hover:not(:disabled) {
  background: #ff6b8a;
}

.actions button.secondary {
  background: #2a4a6a;
  color: #8ecae6;
}

.actions button.secondary:hover:not(:disabled) {
  background: #3a5a7a;
}

.message {
  margin-top: 1rem;
  padding: 0.8rem;
  border-radius: 6px;
  font-size: 0.9rem;
}

.message.success {
  background: #1a4a3a;
  color: #6ecaa0;
}

.message.error {
  background: #4a1f1f;
  color: #ff8a8a;
}

.message.info {
  background: #2a4a6a;
  color: #8ecae6;
}
</style>
