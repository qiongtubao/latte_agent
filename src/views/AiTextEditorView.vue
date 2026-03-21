<script setup lang="ts">
/**
 * AI 文本编辑器视图
 * 严格按照 ai_text_editor_design.pen 实现
 *
 * 布局：
 * ┌──────────────────────────────────────────────────────┐
 * │  左侧面板 1 (280px)  │  左侧面板 2 (280px)  │  右侧面板 (320px)  │
 * │                      │                      │                    │
 * │  🤖 模型选择         │  🤖 模型选择         │  ➕ 新建             │
 * │  📤 保存             │  📤 保存   │  💬 对话历史          │
 * │  📝 文本内容         │  📝 文本内容         │  [输入框]            │
 * │  📚 历史版本         │  📚 历史版本         │  [发送按钮]          │
 * └──────────────────────────────────────────────────────┘
 */
import { ref, computed, onMounted, nextTick } from 'vue'

// ============ 类型定义 ============

interface LeftPanel {
  id: string
  title: string
  content: string
  createdAt: number
  selectedModel: string
  showModelDropdown: boolean
  showSyncDropdown: boolean
  showHistory: boolean
  historyVersions: HistoryVersion[]
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  model?: string
}

interface HistoryVersion {
  id: string
  content: string
  timestamp: number
  model: string
}

interface ModelOption {
  id: string
  name: string
  provider: string
}

// ============ 状态 ============

/** 可用模型列表 */
const availableModels = ref<ModelOption[]>([
  { id: 'qwen3.5:35b', name: 'qwen3.5:35b', provider: 'Ollama' }
])

/** 同步目标列表 */
const syncTargets = [
  { id: 'email', name: '📧 邮件内容' },
  { id: 'markdown', name: '📝 Markdown 文档' },
  { id: 'clipboard', name: '📋 剪贴板' },
  { id: 'file', name: '💾 保存为文件' }
]

/** 左侧面板列表 */
const leftPanels = ref<LeftPanel[]>([
  {
    id: 'panel-1',
    title: '左侧面板 1',
    content: '',
    createdAt: Date.now(),
    selectedModel: 'qwen3.5:35b',
    showModelDropdown: false,
    showSyncDropdown: false,
    showHistory: false,
    historyVersions: []
  }
])

/** 对话历史（右侧） */
const chatHistory = ref<ChatMessage[]>([])

/** 右侧输入框内容 */
const inputText = ref('')

/** 是否正在生成 */
const isGenerating = ref(false)

/** 对话历史容器引用 */
const chatContainerRef = ref<HTMLElement | null>(null)

/** 当前激活的面板 ID */
const activePanelId = ref('panel-1')

/** 保存确认弹窗状态 */
const showSaveConfirm = ref(false)

// ============ 计算属性 ============

/** 当前激活的面板 */
const activePanel = computed(() =>
  leftPanels.value.find(p => p.id === activePanelId.value) || leftPanels.value[0]
)

// ============ 方法 ============

/** 加载 Ollama 模型列表 */
const loadModels = async () => {
  try {
    const res = await fetch('http://localhost:11434/api/tags')
    const data = await res.json()
    if (data.models?.length > 0) {
      availableModels.value = data.models.map((m: any) => ({
        id: m.name,
        name: m.name,
        provider: 'Ollama'
      }))
      // 更新所有面板的默认模型
      leftPanels.value.forEach(panel => {
        panel.selectedModel = availableModels.value[0].id
      })
    }
  } catch {
    // 保持默认模型
  }
}

/** 选择模型 */
const selectModel = (modelId: string, panelId: string) => {
  const panel = leftPanels.value.find(p => p.id === panelId)
  if (panel) {
    panel.selectedModel = modelId
    panel.showModelDropdown = false
  }
}

/** 同步到目标模块 */
const syncToTarget = (targetId: string, panelId: string) => {
  const panel = leftPanels.value.find(p => p.id === panelId)
  if (panel) {
    panel.showSyncDropdown = false
    const content = panel.content
    if (!content.trim()) return

    if (targetId === 'clipboard') {
      navigator.clipboard.writeText(content)
      alert('已复制到剪贴板')
    } else if (targetId === 'email') {
      // 触发邮件模块
      window.dispatchEvent(new CustomEvent('open-email-with-content', { detail: content }))
    } else if (targetId === 'file') {
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `text-${Date.now()}.txt`
      a.click()
      URL.revokeObjectURL(url)
    }
  }
}

/** 新建左侧面板 */
const createPanel = () => {
  const id = `panel-${Date.now()}`
  const num = leftPanels.value.length + 1
  leftPanels.value.push({
    id,
    title: `左侧面板 ${num}`,
    content: '',
    createdAt: Date.now(),
    selectedModel: availableModels.value[0]?.id || 'qwen3.5:35b',
    showModelDropdown: false,
    showSyncDropdown: false,
    showHistory: false,
    historyVersions: []
  })
  activePanelId.value = id
}

/** 删除左侧面板 */
const deletePanel = (panelId: string) => {
  if (leftPanels.value.length <= 1) return
  const idx = leftPanels.value.findIndex(p => p.id === panelId)
  leftPanels.value.splice(idx, 1)
  activePanelId.value = leftPanels.value[0].id
}

/** 保存当前版本到历史 */
const saveVersion = (content: string, model: string, panelId: string) => {
  if (!content.trim()) return
  const panel = leftPanels.value.find(p => p.id === panelId)
  if (panel) {
    panel.historyVersions.unshift({
      id: `v-${Date.now()}`,
      content,
      timestamp: Date.now(),
      model
    })
    if (panel.historyVersions.length > 20) panel.historyVersions.pop()
  }
}

/** 恢复历史版本 */
const restoreVersion = (version: HistoryVersion, panelId: string) => {
  const panel = leftPanels.value.find(p => p.id === panelId)
  if (panel) {
    saveVersion(panel.content, panel.selectedModel, panelId)
    panel.content = version.content
  }
}

/** 格式化时间 */
const formatTime = (ts: number) => {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

/** 调用 Ollama */
const callOllama = async (prompt: string, model: string): Promise<string> => {
  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false
    })
  })
  const data = await res.json()
  return data.response?.trim() || ''
}

/** 发送消息 */
const sendMessage = async () => {
  if (!inputText.value.trim() || isGenerating.value) return

  const prompt = inputText.value.trim()
  inputText.value = ''

  // 添加用户消息
  chatHistory.value.push({
    id: `msg-${Date.now()}`,
    role: 'user',
    content: prompt,
    timestamp: Date.now()
  })

  await nextTick()
  scrollChatToBottom()

  isGenerating.value = true

  try {
    if (!activePanel.value) return

    // 构建带上下文的 prompt
    const contextPrompt = activePanel.value.content
      ? `当前文本内容：\n${activePanel.value.content}\n\n用户请求：${prompt}`
      : prompt

    const result = await callOllama(contextPrompt, activePanel.value.selectedModel)

    // 保存旧版本
    if (activePanel.value.content) {
      saveVersion(activePanel.value.content, activePanel.value.selectedModel, activePanel.value.id)
    }

    // 更新当前面板内容
    activePanel.value.content = result

    // 添加 AI 消息
    chatHistory.value.push({
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: result,
      timestamp: Date.now(),
      model: activePanel.value.selectedModel
    })
  } catch (err) {
    chatHistory.value.push({
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `❌ 请求失败，请确认 Ollama 正在运行`,
      timestamp: Date.now()
    })
  }

  isGenerating.value = false
  await nextTick()
  scrollChatToBottom()
}

/** 快捷键发送 */
const handleKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault()
    sendMessage()
  }
}

/** 滚动对话到底部 */
const scrollChatToBottom = () => {
  if (chatContainerRef.value) {
    chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
  }
}

onMounted(() => {
  loadModels()
})
</script>

<template>
  <div class="ai-text-editor">

    <!-- ============ 左侧面板组 ============ -->
    <div class="left-panels">
      <div
        v-for="panel in leftPanels"
        :key="panel.id"
        :class="['left-panel', { active: activePanelId === panel.id }]"
      >
        <!-- 面板标题 -->
        <div class="panel-header">
          <div class="panel-title" @click="activePanelId = panel.id">{{ panel.title }}</div>
          <button
            v-if="leftPanels.length > 1"
            class="delete-panel-btn"
            @click.stop="deletePanel(panel.id)"
            title="删除面板"
          >×</button>
        </div>

        <div class="panel-content">
          <!-- 模型选择 -->
          <div class="panel-block">
            <div class="block-label">🤖 模型选择</div>
            <div class="dropdown-wrapper" @click.stop>
              <div class="dropdown-trigger" @click="panel.showModelDropdown = !panel.showModelDropdown">
                <span>{{ panel.selectedModel }}</span>
                <span class="arrow">▼</span>
              </div>
              <div v-if="panel.showModelDropdown" class="dropdown-menu">
                <div
                  v-for="model in availableModels"
                  :key="model.id"
                  :class="['dropdown-item', { active: panel.selectedModel === model.id }]"
                  @click="selectModel(model.id, panel.id)"
                >
                  {{ model.name }}
                </div>
              </div>
            </div>
          </div>

          <!-- 保存 -->
          <div class="panel-block">
            <div class="block-label">📤 保存</div>
            <div class="save-section" @click.stop>
              <button class="sync-btn" @click="saveVersion(panel.content, panel.selectedModel, panel.id); showSaveConfirm = true">
                保存
              </button>
              
              <!-- 保存确认弹窗 -->
              <div v-if="showSaveConfirm" class="save-confirm-modal" @click.stop>
                <div class="save-confirm-content" @click.stop>
                  <div class="save-confirm-title">保存确认</div>
                  <div class="save-confirm-message">已保存到历史记录，是否继续？</div>
                  <div class="save-confirm-buttons">
                    <button class="confirm-btn" @click="showSaveConfirm = false">确认</button>
                    <button class="cancel-btn" @click="showSaveConfirm = false">取消</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 文本内容 -->
          <div class="panel-block text-module-block" @click="activePanelId = panel.id">
            <div class="block-header">
              <span class="block-label">📝 文本内容</span>
            </div>
            <textarea
              class="module-textarea"
              v-model="panel.content"
              placeholder="[AI 返回的文本内容将显示在这里...]"
              @click.stop="activePanelId = panel.id"
            ></textarea>
          </div>

          <!-- 历史版本 -->
          <div class="panel-block">
            <div
              class="block-header clickable"
              @click="panel.showHistory = !panel.showHistory"
            >
              <span class="block-label">📚 历史版本</span>
              <span class="arrow">{{ panel.showHistory ? '▼' : '▶' }}</span>
            </div>

            <div v-if="panel.showHistory" class="history-list">
              <div v-if="panel.historyVersions.length === 0" class="history-empty">
                暂无历史版本
              </div>
              <div
                v-for="(v, i) in panel.historyVersions"
                :key="v.id"
                class="history-item"
                @click="restoreVersion(v, panel.id)"
                :title="'点击恢复此版本'"
              >
                <span class="history-arrow">▶</span>
                <span class="history-time">{{ formatTime(v.timestamp) }} 版本 {{ panel.historyVersions.length - i }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ 右侧面板 ============ -->
    <div class="right-panel">

      <!-- 新建按钮 -->
      <button class="create-btn" @click="createPanel">
        ➕ 新建
      </button>

      <!-- 对话历史 -->
      <div class="chat-block">
        <div class="block-label">💬 选择文本的历史记录</div>
        <div class="chat-history" ref="chatContainerRef">
          <div v-if="chatHistory.length === 0" class="chat-empty">
            <p>开始 AI 对话</p>
            <p class="chat-hint">输入消息，AI 会处理当前文本</p>
          </div>
          <div
            v-for="msg in chatHistory"
            :key="msg.id"
            :class="['chat-msg', msg.role]"
          >
            <div class="msg-header">
              <span>{{ msg.role === 'user' ? '👤 你' : '🤖 AI' }}</span>
              <span class="msg-time">{{ formatTime(msg.timestamp) }}</span>
            </div>
            <div class="msg-content">{{ msg.content }}</div>
          </div>
          <div v-if="isGenerating" class="chat-msg assistant">
            <div class="msg-header"><span>🤖 AI</span></div>
            <div class="msg-content generating">生成中...</div>
          </div>
        </div>
      </div>

      <!-- 输入区 -->
      <div class="input-block">
        <textarea
          class="chat-input"
          v-model="inputText"
          placeholder="输入消息..."
          @keydown="handleKeydown"
          :disabled="isGenerating"
          rows="3"
        ></textarea>
        <div class="input-footer">
          <span class="input-hint">Cmd+Enter 发送</span>
          <button
            class="send-btn"
            @click="sendMessage"
            :disabled="!inputText.trim() || isGenerating"
          >
            {{ isGenerating ? '生成中...' : '发送 📤' }}
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* ============ 整体布局 ============ */
.ai-text-editor {
  display: flex;
  height: 100%;
  background: #0f0f23;
  color: #e0e0e0;
  font-family: 'Inter', -apple-system, sans-serif;
  overflow: hidden;
}

/* ============ 左侧面板组 ============ */
.left-panels {
  display: flex;
  overflow-x: auto;
  flex-shrink: 0;
}

.left-panels::-webkit-scrollbar {
  height: 4px;
}

.left-panels::-webkit-scrollbar-thumb {
  background: #3d3d5c;
  border-radius: 2px;
}

/* ============ 左侧面板 ============ */
.left-panel {
  width: 280px;
  min-width: 280px;
  background: #1e1e2e;
  border-right: 1px solid #2d2d3f;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.2s ease;
}

.left-panel.active {
  box-shadow: inset 0 0 0 2px #667eea;
  z-index: 10;
}

/* 面板标题 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #2d2d3f;
  background: #1e1e2e;
  flex-shrink: 0;
}

.panel-title {
  font-size: 14px;
  font-weight: 500;
  color: #e0e0e0;
  cursor: pointer;
}

.panel-title:hover {
  color: #fff;
}

.delete-panel-btn {
  width: 20px;
  height: 20px;
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.delete-panel-btn:hover {
  background: #ff4757;
  color: white;
}

/* 面板内容 */
.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-content::-webkit-scrollbar {
  width: 4px;
}

.panel-content::-webkit-scrollbar-thumb {
  background: #3d3d5c;
  border-radius: 2px;
}

/* ============ 通用块 ============ */
.panel-block {
  background: #2d2d3f;
  border-radius: 8px;
  padding: 12px;
}

.panel-block.text-module-block {
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.panel-block.text-module-block:hover {
  border-color: #3d3d5c;
}

.left-panel.active .panel-block.text-module-block {
  border-color: #667eea;
}

.block-label {
  font-size: 13px;
  font-weight: 500;
  color: #e0e0e0;
  margin-bottom: 8px;
  display: block;
}

.block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.block-header .block-label {
  margin-bottom: 0;
}

.block-header.clickable {
  cursor: pointer;
}

.block-header.clickable:hover .block-label {
  color: #fff;
}

.arrow {
  font-size: 10px;
  color: #888;
}

/* ============ 下拉框 ============ */
.dropdown-wrapper {
  position: relative;
}

.dropdown-trigger {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #3d3d5c;
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  color: #fff;
}

.dropdown-trigger:hover {
  background: #4d4d6a;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #3d3d5c;
  border-radius: 6px;
  border: 1px solid #4d4d6a;
  z-index: 100;
  overflow: hidden;
}

.dropdown-item {
  padding: 10px 12px;
  font-size: 13px;
  cursor: pointer;
  color: #e0e0e0;
}

.dropdown-item:hover {
  background: #4d4d6a;
}

.dropdown-item.active {
  color: #667eea;
}

/* ============ 同步按钮 ============ */
.sync-btn {
  width: 100%;
  padding: 8px 12px;
  background: #667eea;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  text-align: center;
  transition: background 0.2s ease;
}

.sync-btn:hover {
  background: #5a6fd6;
}

/* ============ 保存确认弹窗 ============ */
.save-section {
  position: relative;
}

.save-confirm-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.save-confirm-content {
  background: #2d2d3f;
  border-radius: 8px;
  padding: 20px;
  width: 300px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.save-confirm-title {
  font-size: 16px;
  font-weight: 600;
  color: #e0e0e0;
  margin-bottom: 12px;
  text-align: center;
}

.save-confirm-message {
  font-size: 14px;
  color: #b0b0b0;
  margin-bottom: 20px;
  text-align: center;
}

.save-confirm-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.confirm-btn {
  padding: 8px 16px;
  background: #667eea;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}

.confirm-btn:hover {
  background: #5a6fd6;
}

.cancel-btn {
  padding: 8px 16px;
  background: #3d3d5c;
  border: none;
  border-radius: 6px;
  color: #e0e0e0;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}

.cancel-btn:hover {
  background: #4d4d6a;
}

/* ============ 文本模块 ============ */
.module-textarea {
  width: 100%;
  min-height: 200px;
  background: #3d3d5c;
  border: none;
  border-radius: 6px;
  padding: 12px;
  color: #e0e0e0;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  font-family: inherit;
  transition: all 0.2s ease;
}

.module-textarea:focus {
  outline: none;
  box-shadow: 0 0 0 2px #667eea;
}

.module-textarea::placeholder {
  color: #888;
}

/* ============ 历史版本 ============ */
.history-list {
  background: #3d3d5c;
  border-radius: 6px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-empty {
  text-align: center;
  color: #666;
  font-size: 12px;
  padding: 12px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: #e0e0e0;
  transition: background 0.2s ease;
}

.history-item:hover {
  background: #4d4d6a;
}

.history-arrow {
  font-size: 10px;
  color: #888;
}

.history-time {
  flex: 1;
}

/* ============ 右侧面板 ============ */
.right-panel {
  width: 320px;
  min-width: 320px;
  background: #1e1e2e;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  overflow: hidden;
  border-left: 1px solid #2d2d3f;
}

/* 新建按钮 */
.create-btn {
  width: 100%;
  height: 48px;
  background: #667eea;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s ease;
}

.create-btn:hover {
  background: #5a6fd6;
}

/* 对话历史 */
.chat-block {
  flex: 1;
  background: #2d2d3f;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.chat-history {
  flex: 1;
  background: #3d3d5c;
  border-radius: 6px;
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-history::-webkit-scrollbar {
  width: 4px;
}

.chat-history::-webkit-scrollbar-thumb {
  background: #4d4d6a;
  border-radius: 2px;
}

.chat-empty {
  text-align: center;
  color: #666;
  padding: 30px 0;
}

.chat-hint {
  font-size: 12px;
  color: #555;
  margin-top: 6px;
}

.chat-msg {
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
}

.chat-msg.user {
  background: #4d4d6a;
}

.chat-msg.assistant {
  background: #667eea;
}

.msg-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 6px;
  opacity: 0.8;
}

.msg-time {
  font-size: 11px;
}

.msg-content {
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.generating {
  opacity: 0.7;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

/* 输入区 */
.input-block {
  background: #2d2d3f;
  border-radius: 8px;
  padding: 12px;
  flex-shrink: 0;
}

.chat-input {
  width: 100%;
  background: #3d3d5c;
  border: none;
  border-radius: 6px;
  padding: 12px;
  color: #e0e0e0;
  font-size: 14px;
  resize: none;
  font-family: inherit;
  line-height: 1.5;
  transition: all 0.2s ease;
}

.chat-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px #667eea;
}

.chat-input::placeholder {
  color: #888;
}

.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.input-hint {
  font-size: 11px;
  color: #666;
}

.send-btn {
  height: 30px;
  padding: 0 16px;
  background: #4ade80;
  border: none;
  border-radius: 6px;
  color: #000;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}

.send-btn:disabled {
  background: #3d3d5c;
  color: #666;
  cursor: not-allowed;
}

.send-btn:not(:disabled):hover {
  background: #22c55e;
}
</style>
