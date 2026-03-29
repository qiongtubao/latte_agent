<template>
  <div class="settings-panel">
    <h2>设置</h2>

    <div class="settings-layout">
      <!-- 左侧：档案列表 -->
      <div class="profile-sidebar">
        <div class="sidebar-header">
          <span>配置档案</span>
          <button class="add-btn" @click="createNewProfile" title="新建档案">+</button>
        </div>
        <div class="profile-list">
          <div
            v-for="profile in profiles"
            :key="profile.id"
            :class="['profile-item', { active: profile.id === activeProfileId }]"
            @click="switchToProfile(profile.id)"
          >
            <span class="profile-name">{{ profile.alias || profile.defaultModel }}</span>
            <span class="profile-provider">{{ providerLabel(profile.aiProvider) }}</span>
          </div>
          <div v-if="profiles.length === 0" class="empty-hint">
            暂无保存的配置
          </div>
        </div>
      </div>

      <!-- 右侧：配置表单 -->
      <div class="settings-form">
        <!-- 档案别名 -->
        <div class="setting-group">
          <label>档案别名</label>
          <input
            type="text"
            v-model="alias"
            placeholder="为这个配置取个名字，如 '本地 Llama3'"
            :disabled="saving"
          />
        </div>

        <!-- AI 提供商选择 -->
        <div class="setting-group">
          <label>AI 提供商</label>
          <select v-model="aiProvider" @change="onProviderChange">
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="ollama">Ollama (本地)</option>
            <option value="openai-compatible">自定义 API</option>
          </select>
        </div>

        <!-- Base URL 配置（Ollama 和自定义 API 显示） -->
        <div class="setting-group" v-if="aiProvider !== 'anthropic'">
          <label>{{ aiProvider === 'ollama' ? 'Ollama 地址' : 'API 地址' }}</label>
          <input
            type="text"
            v-model="baseUrl"
            :placeholder="aiProvider === 'ollama' ? 'http://localhost:11434' : 'https://api.openai.com'"
            :disabled="saving"
          />
          <p class="hint" v-if="aiProvider === 'ollama'">
            确保 Ollama 服务已启动
            <button class="link-btn" @click="fetchOllamaModels" :disabled="fetchingModels">
              {{ fetchingModels ? '获取中...' : '刷新模型列表' }}
            </button>
          </p>
        </div>

        <!-- API 密钥配置（Anthropic 和自定义 API 显示） -->
        <div class="setting-group" v-if="aiProvider !== 'ollama'">
          <label>API 密钥</label>
          <div class="api-key-input">
            <input
              :type="showKey ? 'text' : 'password'"
              v-model="apiKey"
              :placeholder="aiProvider === 'anthropic' ? '输入 Anthropic API 密钥' : '输入 API 密钥（可选）'"
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

        <!-- 模型选择（下拉 + 手动输入） -->
        <div class="setting-group">
          <label>默认模型</label>
          <!-- 下拉选择已知模型 -->
          <select v-model="defaultModel" :disabled="!models.length" v-if="!isCustomModel">
            <option value="">-- 请选择模型 --</option>
            <option v-for="model in models" :key="model" :value="model">
              {{ model }}
            </option>
          </select>
          <!-- 手动输入模式（Ollama 支持自定义输入） -->
          <input
            v-if="isCustomModel"
            type="text"
            v-model="defaultModel"
            placeholder="输入自定义模型名称"
            :disabled="saving"
          />
          <!-- 切换手动输入（仅 Ollama 时可用） -->
          <button
            v-if="aiProvider === 'ollama'"
            class="link-btn"
            @click="isCustomModel = !isCustomModel"
          >
            {{ isCustomModel ? '从列表选择' : '手动输入模型名' }}
          </button>
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
          <button @click="testConnection" :disabled="!canTest || testing" class="secondary">
            {{ testing ? '测试中...' : '测试连接' }}
          </button>
          <button @click="saveProfile" :disabled="saving || !canSave" class="primary">
            {{ saving ? '保存中...' : (editingProfileId ? '更新档案' : '保存为档案') }}
          </button>
          <button
            v-if="editingProfileId"
            @click="deleteProfile"
            :disabled="deleting"
            class="danger"
          >
            {{ deleting ? '删除中...' : '删除档案' }}
          </button>
        </div>

        <!-- 状态反馈 -->
        <div v-if="message" :class="['message', message.type]">
          {{ message.text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 设置面板组件（支持多配置档案管理）
 * 功能：档案列表、别名、Ollama 动态模型、测试连接、保存/删除/切换档案
 */
import { ref, onMounted, computed } from 'vue'
import { invoke } from '../ipc/client'
import { IpcChannel, SettingsData } from '@shared/ipc'
import type { ModelProfile } from '@shared/ipc'

// ===== 状态 =====

// 档案列表与激活状态
const profiles = ref<ModelProfile[]>([])
const activeProfileId = ref<string | null>(null)
const editingProfileId = ref<string | null>(null)

// 当前编辑的配置字段
const alias = ref('')
const aiProvider = ref('anthropic')
const baseUrl = ref('')
const apiKey = ref('')
const defaultModel = ref('claude-sonnet-4-6')
const maxTokens = ref(4096)
const temperature = ref(1)
const models = ref<string[]>([])
const isCustomModel = ref(false)
const settings = ref<SettingsData | null>(null)

// UI 状态
const showKey = ref(false)
const saving = ref(false)
const testing = ref(false)
const deleting = ref(false)
const fetchingModels = ref(false)
const message = ref<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

// ===== 计算属性 =====

/** 是否可以测试连接 */
const canTest = computed(() => {
  if (aiProvider.value === 'ollama') {
    return baseUrl.value.length > 0 && defaultModel.value.length > 0
  }
  return (apiKey.value.length > 0 || settings.value?.hasApiKey) && defaultModel.value.length > 0
})

/** 是否可以保存 */
const canSave = computed(() => {
  return defaultModel.value.length > 0 && aiProvider.value.length > 0
})

// ===== 档案操作 =====

/** 加载所有档案 */
async function loadProfiles(): Promise<void> {
  try {
    const result = await invoke(IpcChannel.PROFILE_LIST)
    profiles.value = result.profiles
  } catch (e) {
    showMessage('error', '加载档案列表失败: ' + (e instanceof Error ? e.message : String(e)))
  }
}

/** 获取当前激活的档案 */
async function loadActiveProfile(): Promise<void> {
  try {
    const result = await invoke(IpcChannel.PROFILE_GET_ACTIVE)
    if (result.profile) {
      activeProfileId.value = result.profile.id
      applyProfileToForm(result.profile)
    }
  } catch {
    // 没有激活的档案，使用全局设置
  }
}

/** 切换到指定档案 */
async function switchToProfile(profileId: string): Promise<void> {
  try {
    await invoke(IpcChannel.PROFILE_ACTIVATE, { profileId })
    activeProfileId.value = profileId
    // 重新加载激活的档案到表单
    await loadActiveProfile()
    showMessage('info', '已切换配置')
  } catch (e) {
    showMessage('error', '切换失败: ' + (e instanceof Error ? e.message : String(e)))
  }
}

/** 创建新档案（清空表单） */
function createNewProfile(): void {
  editingProfileId.value = null
  alias.value = ''
  aiProvider.value = 'anthropic'
  baseUrl.value = ''
  apiKey.value = ''
  defaultModel.value = ''
  maxTokens.value = 4096
  temperature.value = 1
  models.value = []
  isCustomModel.value = false
}

/** 保存档案（新增或更新） */
async function saveProfile(): Promise<void> {
  saving.value = true
  message.value = null
  try {
    const profile: ModelProfile = {
      id: editingProfileId.value || '',
      alias: alias.value,
      aiProvider: aiProvider.value,
      baseUrl: baseUrl.value,
      defaultModel: defaultModel.value,
      maxTokens: maxTokens.value,
      temperature: temperature.value,
      isCustomModel: isCustomModel.value,
      createdAt: 0, // 后端会自动设置
      updatedAt: 0, // 后端会自动设置
    }
    const result = await invoke(IpcChannel.PROFILE_SAVE, { profile })
    editingProfileId.value = result.profile.id
    // 刷新档案列表
    await loadProfiles()
    // 自动激活新保存的档案
    await switchToProfile(result.profile.id)
    showMessage('success', editingProfileId.value ? '档案已更新' : '档案已保存')
    apiKey.value = '' // 清空密钥输入框
  } catch (e) {
    showMessage('error', '保存失败: ' + (e instanceof Error ? e.message : String(e)))
  } finally {
    saving.value = false
  }
}

/** 删除当前编辑的档案 */
async function deleteProfile(): Promise<void> {
  if (!editingProfileId.value) return
  deleting.value = true
  message.value = null
  try {
    await invoke(IpcChannel.PROFILE_DELETE, { profileId: editingProfileId.value })
    editingProfileId.value = null
    await loadProfiles()
    showMessage('success', '档案已删除')
  } catch (e) {
    showMessage('error', '删除失败: ' + (e instanceof Error ? e.message : String(e)))
  } finally {
    deleting.value = false
  }
}

/** 将档案数据应用到表单 */
function applyProfileToForm(profile: ModelProfile): void {
  editingProfileId.value = profile.id
  alias.value = profile.alias
  aiProvider.value = profile.aiProvider
  baseUrl.value = profile.baseUrl
  defaultModel.value = profile.defaultModel
  maxTokens.value = profile.maxTokens
  temperature.value = profile.temperature
  isCustomModel.value = profile.isCustomModel
  // 加载对应提供商的模型列表
  loadModels().then(() => {
    // 如果保存的模型不在列表中，自动添加（处理 Ollama 动态获取的模型）
    if (defaultModel.value && !models.value.includes(defaultModel.value)) {
      models.value.unshift(defaultModel.value)
    }
  })
}

// ===== 提供商与模型 =====

/** 获取提供商显示标签 */
function providerLabel(provider: string): string {
  switch (provider) {
    case 'anthropic': return 'Anthropic'
    case 'ollama': return 'Ollama'
    case 'openai-compatible': return '自定义'
    default: return provider
  }
}

/** 提供商变更时更新模型列表 */
async function onProviderChange(): Promise<void> {
  defaultModel.value = ''
  models.value = []
  isCustomModel.value = false
  await loadModels()
}

/** 加载可用模型列表（静态列表） */
async function loadModels(): Promise<void> {
  try {
    const result = await invoke(IpcChannel.AI_GET_MODELS)
    models.value = result.models
    if (models.value.length > 0 && !defaultModel.value) {
      defaultModel.value = models.value[0]
    }
  } catch {
    // 静态列表加载失败，使用默认值
    if (aiProvider.value === 'ollama') {
      models.value = ['llama3', 'llama2', 'mistral', 'codellama', 'qwen2']
    } else if (aiProvider.value === 'openai-compatible') {
      models.value = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o']
    } else {
      models.value = ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5-20251001']
    }
    if (!defaultModel.value && models.value.length > 0) {
      defaultModel.value = models.value[0]
    }
  }
}

/** 从 Ollama 服务动态获取模型列表 */
async function fetchOllamaModels(): Promise<void> {
  fetchingModels.value = true
  console.log('[SettingsPanel] 开始获取 Ollama 模型列表, baseUrl:', baseUrl.value)
  try {
    const result = await invoke(IpcChannel.OLLAMA_FETCH_MODELS, { baseUrl: baseUrl.value || undefined })
    console.log('[SettingsPanel] Ollama 模型列表结果:', result)
    if (result.success && result.models.length > 0) {
      models.value = result.models
      if (!defaultModel.value || !result.models.includes(defaultModel.value)) {
        defaultModel.value = result.models[0]
      }
      isCustomModel.value = false
      showMessage('success', `已获取 ${result.models.length} 个模型`)
    } else {
      showMessage('error', result.error || '未获取到模型，请确认 Ollama 服务已启动')
    }
  } catch (e) {
    showMessage('error', '获取模型失败: ' + (e instanceof Error ? e.message : String(e)))
  } finally {
    fetchingModels.value = false
  }
}

// ===== 连接测试 =====

/** 测试当前配置的连接 */
async function testConnection(): Promise<void> {
  testing.value = true
  message.value = null
  try {
    const params: { apiKey?: string; baseUrl?: string; provider?: string } = {}
    if (apiKey.value) {
      params.apiKey = apiKey.value
    }
    if (baseUrl.value) {
      params.baseUrl = baseUrl.value
    }
    // 传递当前选择的提供商，确保 handler 使用正确的验证逻辑
    params.provider = aiProvider.value
    const result = await invoke(IpcChannel.AI_VALIDATE_KEY, params)
    if (result.valid) {
      showMessage('success', aiProvider.value === 'ollama' ? 'Ollama 连接成功' : 'API 密钥有效')
    } else {
      showMessage('error', result.error || (aiProvider.value === 'ollama' ? 'Ollama 连接失败' : 'API 密钥无效'))
    }
  } catch (e) {
    showMessage('error', '测试失败: ' + (e instanceof Error ? e.message : String(e)))
  } finally {
    testing.value = false
  }
}

// ===== 工具方法 =====

/** 显示提示消息（3 秒后自动消失） */
function showMessage(type: 'success' | 'error' | 'info', text: string): void {
  message.value = { type, text }
  setTimeout(() => {
    message.value = null
  }, 3000)
}

/** 加载全局设置（用于初始化） */
async function loadSettings(): Promise<void> {
  try {
    settings.value = await invoke(IpcChannel.SETTINGS_GET)
    if (!activeProfileId.value) {
      // 没有激活的档案时，使用全局设置填充表单
      aiProvider.value = settings.value.aiProvider || 'anthropic'
      baseUrl.value = settings.value.baseUrl || ''
      defaultModel.value = settings.value.defaultModel
      maxTokens.value = settings.value.maxTokens
      temperature.value = settings.value.temperature
    }
  } catch (e) {
    showMessage('error', '加载设置失败: ' + (e instanceof Error ? e.message : String(e)))
  }
}

// ===== 初始化 =====
onMounted(async () => {
  await loadSettings()
  await loadProfiles()
  await loadActiveProfile()
  // 如果仍无模型列表，加载默认列表
  if (models.value.length === 0) {
    await loadModels()
  }
})
</script>

<style scoped>
.settings-panel {
  background: #16213e;
  border-radius: 12px;
  padding: 1.5rem;
  min-width: 700px;
  max-height: 80vh;
  overflow-y: auto;
}

h2 {
  font-size: 1.3rem;
  margin-bottom: 1.2rem;
  color: #e94560;
}

/* 布局：左右分栏 */
.settings-layout {
  display: flex;
  gap: 1.5rem;
}

/* 左侧档案列表 */
.profile-sidebar {
  width: 180px;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.6rem;
  font-size: 0.9rem;
  color: #a0a0b0;
}

.add-btn {
  width: 24px;
  height: 24px;
  border: 1px solid #3a5a7a;
  border-radius: 4px;
  background: transparent;
  color: #8ecae6;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-btn:hover {
  background: #2a4a6a;
}

.profile-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 400px;
  overflow-y: auto;
}

.profile-item {
  padding: 0.5rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition: background 0.2s;
}

.profile-item:hover {
  background: #1a3a5a;
}

.profile-item.active {
  background: #0f3460;
  border-left: 3px solid #e94560;
}

.profile-name {
  font-size: 0.85rem;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-provider {
  font-size: 0.7rem;
  color: #6a8a9a;
}

.empty-hint {
  font-size: 0.8rem;
  color: #4a6a7a;
  text-align: center;
  padding: 1rem 0;
}

/* 右侧表单 */
.settings-form {
  flex: 1;
  min-width: 0;
}

.setting-group {
  margin-bottom: 1rem;
}

.setting-group label {
  display: block;
  margin-bottom: 0.3rem;
  font-size: 0.85rem;
  color: #a0a0b0;
}

.setting-group input[type='text'],
.setting-group input[type='password'],
.setting-group input[type='number'],
.setting-group select {
  width: 100%;
  padding: 0.5rem 0.7rem;
  border: 1px solid #2a4a6a;
  border-radius: 6px;
  background: #0f3460;
  color: #e0e0e0;
  font-size: 0.9rem;
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
  font-size: 0.85rem;
}

.api-key-input {
  display: flex;
  gap: 0.4rem;
}

.api-key-input input {
  flex: 1;
}

.toggle-btn {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
  background: #2a4a6a;
  color: #8ecae6;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.toggle-btn:hover {
  background: #3a5a7a;
}

.link-btn {
  background: none;
  border: none;
  color: #8ecae6;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.link-btn:hover {
  color: #a0e0ff;
}

.link-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hint {
  font-size: 0.75rem;
  color: #6a8a9a;
  margin-top: 0.2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 操作按钮 */
.actions {
  display: flex;
  gap: 0.8rem;
  margin-top: 1.2rem;
  flex-wrap: wrap;
}

.actions button {
  padding: 0.6rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

.actions button:disabled {
  opacity: 0.5;
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

.actions button.danger {
  background: #4a1f1f;
  color: #ff8a8a;
}

.actions button.danger:hover:not(:disabled) {
  background: #6a2f2f;
}

/* 状态消息 */
.message {
  margin-top: 0.8rem;
  padding: 0.6rem;
  border-radius: 6px;
  font-size: 0.85rem;
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
