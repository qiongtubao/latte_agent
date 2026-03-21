<script setup lang="ts">
/**
 * 对话历史组件
 */
import { computed } from 'vue'

/**
 * Props
 */
defineProps<{
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: number
    model?: string
  }>
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
</script>

<template>
  <div class="chat-history">
    <div v-if="messages.length === 0" class="empty">
      <p>💬 开始 AI 对话</p>
      <p class="hint">输入消息获取 AI 帮助</p>
    </div>
    
    <div 
      v-for="message in messages" 
      :key="message.id"
      :class="['message', message.role]"
    >
      <div class="message-header">
        <span class="role">
          {{ message.role === 'user' ? '👤 你' : '🤖 AI' }}
        </span>
        <span class="time">{{ formatTime(message.timestamp) }}</span>
        <span v-if="message.model" class="model">{{ message.model }}</span>
      </div>
      <div class="message-content">
        {{ message.content }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-history {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty {
  text-align: center;
  color: #666;
  padding: 40px 20px;
}

.empty p {
  margin: 5px 0;
}

.empty .hint {
  font-size: 12px;
  color: #444;
}

.message {
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
}

.message.user {
  background: #2d4a3e;
}

.message.assistant {
  background: #1a1a2e;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.role {
  font-weight: 500;
  font-size: 12px;
}

.time {
  font-size: 10px;
  color: #666;
}

.model {
  font-size: 10px;
  padding: 2px 6px;
  background: rgba(102, 126, 234, 0.2);
  border-radius: 4px;
  color: #667eea;
}

.message-content {
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
