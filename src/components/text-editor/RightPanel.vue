<script setup lang="ts">
/**
 * 右侧 AI 对话面板组件
 * 包含：新建按钮、对话历史、多模型选择、输入框
 */
import { ref, computed, nextTick } from 'vue'
import ChatHistory from './ChatHistory.vue'
import ModelCheckbox from './ModelCheckbox.vue'

/**
 * Emits
 */
const emit = defineEmits<{
  (e: 'create-module'): void
  (e: 'send', prompt: string, models: string[]): void
}>()

/**
 * 对话历史
 */
const chatHistory = ref<Array<{
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  model?: string
}>>([])

/**
 * 可用模型列表
 */
const availableModels = ref([
  { id: 'qwen3.5:35b', name: 'Qwen 3.5 35B', provider: 'Ollama' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'deepseek-v3', name: 'DeepSeek V3', provider: 'Ollama' }
])

/**
 * 选中的模型
 */
const selectedModels = ref<string[]>(['qwen3.5:35b'])

/**
 * 当前输入
 */
const currentInput = ref('')

/**
 * 是否正在生成
 */
const isGenerating = ref(false)

/**
 * 对话容器引用
 */
const chatContainer = ref<HTMLElement | null>(null)

/**
 * 处理新建
 */
const handleCreate = () => {
  emit('create-module')
}

/**
 * 切换模型选择
 */
const toggleModel = (modelId: string) => {
  const index = selectedModels.value.indexOf(modelId)
  if (index > -1) {
    if (selectedModels.value.length > 1) {
      selectedModels.value.splice(index, 1)
    }
  } else {
    selectedModels.value.push(modelId)
  }
}

/**
 * 发送消息
 */
const sendMessage = async () => {
  if (!currentInput.value.trim() || isGenerating.value) return
  
  const prompt = currentInput.value.trim()
  currentInput.value = ''
  
  // 添加用户消息
  chatHistory.value.push({
    id: `msg-${Date.now()}`,
    role: 'user',
    content: prompt,
    timestamp: Date.now()
  })
  
  // 滚动到底部
  await nextTick()
  scrollToBottom()
  
  // 发送给父组件处理
  emit('send', prompt, [...selectedModels.value])
}

/**
 * 添加 AI 回复
 */
const addAssistantMessage = (content: string, model: string) => {
  chatHistory.value.push({
    id: `msg-${Date.now()}`,
    role: 'assistant',
    content,
    timestamp: Date.now(),
    model
  })
  scrollToBottom()
}

/**
 * 滚动到底部
 */
const scrollToBottom = () => {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

/**
 * 快捷键发送
 */
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    sendMessage()
  }
}

/**
 * 暴露方法
 */
defineExpose({
  addAssistantMessage,
  isGenerating
})
</script>

<template>
  <div class="right-panel">
    <!-- 新建按钮 -->
    <div class="panel-header">
      <button class="create-btn" @click="handleCreate">
        ➕ 新建文档
      </button>
    </div>
    
    <!-- 对话历史 -->
    <div class="chat-container" ref="chatContainer">
      <ChatHistory :messages="chatHistory" />
    </div>
    
    <!-- 模型选择 -->
    <div class="model-selection">
      <div class="model-header">
        <span>🎯 发送给模型</span>
        <span class="model-count">{{ selectedModels.length }} 个</span>
      </div>
      <ModelCheckbox 
        :models="availableModels"
        :selected="selectedModels"
        @toggle="toggleModel"
      />
    </div>
    
    <!-- 输入区 -->
    <div class="input-area">
      <textarea 
        v-model="currentInput"
        placeholder="输入消息... (Cmd+Enter 发送)"
        @keydown="handleKeydown"
        :disabled="isGenerating"
        rows="3"
      ></textarea>
      <button 
        class="send-btn" 
        @click="sendMessage"
        :disabled="!currentInput.trim() || isGenerating"
      >
        {{ isGenerating ? '生成中...' : '发送 📤' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.right-panel {
  width: 320px;
  background: #1e1e2e;
  border-left: 1px solid #333;
  display: flex;
  flex-direction: column;
}

/* 新建按钮 */
.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid #333;
}

.create-btn {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.create-btn:hover {
  opacity: 0.9;
}

/* 对话区域 */
.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

/* 模型选择 */
.model-selection {
  padding: 12px 16px;
  border-top: 1px solid #333;
}

.model-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #888;
  margin-bottom: 8px;
}

.model-count {
  color: #667eea;
}

/* 输入区 */
.input-area {
  padding: 12px 16px;
  border-top: 1px solid #333;
}

.input-area textarea {
  width: 100%;
  padding: 10px;
  background: #0f0f23;
  border: 1px solid #333;
  border-radius: 8px;
  color: white;
  font-size: 13px;
  resize: none;
  font-family: inherit;
}

.input-area textarea:focus {
  outline: none;
  border-color: #667eea;
}

.send-btn {
  width: 100%;
  margin-top: 10px;
  padding: 10px;
  background: #4ade80;
  color: #000;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.send-btn:disabled {
  background: #333;
  color: #666;
  cursor: not-allowed;
}
</style>
