<script setup lang="ts">
/**
 * 历史版本面板组件
 */
import { computed } from 'vue'

/**
 * Props
 */
defineProps<{
  versions: Array<{
    id: string
    content: string
    timestamp: number
    model: string
  }>
}>()

/**
 * Emits
 */
const emit = defineEmits<{
  (e: 'compare', versionId: string): void
  (e: 'restore', versionId: string): void
}>()

/**
 * 格式化时间
 */
const formatTime = (ts: number): string => {
  const date = new Date(ts)
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

/**
 * 格式化日期
 */
const formatDate = (ts: number): string => {
  const date = new Date(ts)
  return date.toLocaleDateString('zh-CN', { 
    month: 'short', 
    day: 'numeric' 
  })
}

/**
 * 预览内容
 */
const previewContent = (content: string): string => {
  if (content.length <= 50) return content
  return content.substring(0, 50) + '...'
}
</script>

<template>
  <div class="history-panel">
    <div v-if="versions.length === 0" class="empty">
      暂无历史版本
    </div>
    
    <div v-else class="version-list">
      <div 
        v-for="(version, index) in versions" 
        :key="version.id"
        class="version-item"
      >
        <div class="version-header">
          <span class="version-time">
            {{ formatDate(version.timestamp) }} {{ formatTime(version.timestamp) }}
          </span>
          <span class="version-model">{{ version.model }}</span>
        </div>
        
        <div class="version-preview">
          {{ previewContent(version.content) }}
        </div>
        
        <div class="version-actions">
          <button 
            class="action-btn compare"
            @click="emit('compare', version.id)"
            title="对比"
          >
            📊 对比
          </button>
          <button 
            class="action-btn restore"
            @click="emit('restore', version.id)"
            title="恢复"
          >
            ↩️ 恢复
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-panel {
  max-height: 200px;
  overflow-y: auto;
  padding-top: 8px;
}

.empty {
  text-align: center;
  color: #666;
  font-size: 12px;
  padding: 20px;
}

.version-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.version-item {
  background: #0f0f23;
  border-radius: 6px;
  padding: 10px;
  border: 1px solid #333;
}

.version-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.version-time {
  font-size: 11px;
  color: #888;
}

.version-model {
  font-size: 10px;
  padding: 2px 6px;
  background: #333;
  border-radius: 4px;
  color: #667eea;
}

.version-preview {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 8px;
  line-height: 1.4;
}

.version-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
}

.action-btn.compare {
  background: #333;
  color: #aaa;
}

.action-btn.restore {
  background: #2d4a3e;
  color: #4ade80;
}

.action-btn:hover {
  opacity: 0.8;
}
</style>
