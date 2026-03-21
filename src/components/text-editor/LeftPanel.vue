<script setup lang="ts">
/**
 * 左侧面板组件
 * 包含：模型选择、同步选择、当前文本、历史版本
 */
import { ref, computed, onMounted } from 'vue'
import ModelSelector from './ModelSelector.vue'
import CurrentText from './CurrentText.vue'
import HistoryPanel from './HistoryPanel.vue'

/**
 * Props
 */
defineProps<{
  showHistory: boolean
}>()

/**
 * Emits
 */
const emit = defineEmits<{
  (e: 'toggle-history'): void
  (e: 'compare', versionId: string): void
}>()

/**
 * 当前选中的模型
 */
const selectedModel = ref('qwen3.5:35b')

/**
 * 同步目标
 */
const syncTarget = ref<string | null>(null)

/**
 * 同步目标列表
 */
const syncTargets = [
  { id: 'email', name: '邮件内容', icon: '📧' },
  { id: 'markdown', name: 'Markdown 文档', icon: '📝' },
  { id: 'clipboard', name: '剪贴板', icon: '📋' },
  { id: 'file', name: '保存为文件', icon: '💾' }
]

/**
 * 当前文本内容
 */
const currentText = ref('')

/**
 * 历史版本列表
 */
const historyVersions = ref<Array<{
  id: string
  content: string
  timestamp: number
  model: string
}>>([])

/**
 * 处理模型变更
 */
const handleModelChange = (model: string) => {
  selectedModel.value = model
}

/**
 * 处理同步
 */
const handleSync = (targetId: string) => {
  syncTarget.value = targetId
  // TODO: 实现同步逻辑
  console.log('同步到:', targetId)
}

/**
 * 处理文本更新
 */
const handleTextUpdate = (content: string) => {
  currentText.value = content
}

/**
 * 保存版本
 */
const saveVersion = () => {
  if (!currentText.value.trim()) return
  
  historyVersions.value.unshift({
    id: `version-${Date.now()}`,
    content: currentText.value,
    timestamp: Date.now(),
    model: selectedModel.value
  })
  
  // 限制历史数量
  if (historyVersions.value.length > 20) {
    historyVersions.value.pop()
  }
}

/**
 * 格式化时间
 */
const formatTime = (ts: number): string => {
  const date = new Date(ts)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

/**
 * 暴露方法给父组件
 */
defineExpose({
  saveVersion,
  updateText: (content: string) => { currentText.value = content }
})
</script>

<template>
  <div class="left-panel">
    <!-- 模型选择 -->
    <div class="panel-section">
      <h3>🤖 模型选择</h3>
      <ModelSelector 
        :selected="selectedModel"
        @change="handleModelChange"
      />
    </div>
    
    <!-- 同步到其他模块 -->
    <div class="panel-section">
      <h3>📤 同步到</h3>
      <div class="sync-buttons">
        <button 
          v-for="target in syncTargets" 
          :key="target.id"
          class="sync-btn"
          @click="handleSync(target.id)"
          :title="target.name"
        >
          {{ target.icon }}
        </button>
      </div>
    </div>
    
    <!-- 当前文本 -->
    <div class="panel-section flex-grow">
      <div class="section-header">
        <h3>📝 当前文本</h3>
        <button class="save-version-btn" @click="saveVersion" title="保存版本">
          💾
        </button>
      </div>
      <CurrentText 
        :content="currentText"
        @update="handleTextUpdate"
      />
    </div>
    
    <!-- 历史版本 -->
    <div class="panel-section history-section">
      <div class="section-header clickable" @click="emit('toggle-history')">
        <h3>📚 历史版本</h3>
        <span class="toggle-icon">{{ showHistory ? '▼' : '▶' }}</span>
      </div>
      
      <HistoryPanel 
        v-if="showHistory"
        :versions="historyVersions"
        @compare="(id) => emit('compare', id)"
      />
    </div>
  </div>
</template>

<style scoped>
.left-panel {
  width: 280px;
  background: #1e1e2e;
  border-right: 1px solid #333;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-section {
  padding: 12px 16px;
  border-bottom: 1px solid #333;
}

.panel-section.flex-grow {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-bottom: none;
}

.panel-section h3 {
  font-size: 13px;
  font-weight: 500;
  margin: 0 0 10px;
  color: #888;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header.clickable {
  cursor: pointer;
}

.section-header.clickable:hover h3 {
  color: #fff;
}

.toggle-icon {
  font-size: 10px;
  color: #666;
}

.save-version-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
}

.save-version-btn:hover {
  transform: scale(1.1);
}

/* 同步按钮 */
.sync-buttons {
  display: flex;
  gap: 8px;
}

.sync-btn {
  flex: 1;
  padding: 8px;
  background: #0f0f23;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s;
}

.sync-btn:hover {
  background: #2d2d44;
  transform: translateY(-2px);
}

/* 历史区域 */
.history-section {
  max-height: 200px;
  overflow: hidden;
}
</style>
