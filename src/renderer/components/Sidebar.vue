<template>
  <!-- 侧边栏：会话列表、新建对话、切换/删除会话 -->
  <aside class="sidebar">
    <!-- 顶部：新建对话按钮 -->
    <div class="sidebar-header">
      <h2 class="sidebar-title">对话列表</h2>
      <button class="new-chat-btn" @click="$emit('newChat')" title="新建对话">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </button>
    </div>

    <!-- 会话列表 -->
    <div class="session-list">
      <div
        v-for="session in sessions"
        :key="session.id"
        :class="['session-item', { active: session.id === activeSessionId }]"
        @click="$emit('switchSession', session.id)"
      >
        <div class="session-info">
          <div class="session-title">{{ session.title }}</div>
          <div class="session-meta">
            <span class="session-time">{{ formatTime(session.updatedAt) }}</span>
            <span v-if="session.model" class="session-model">{{ session.model }}</span>
          </div>
        </div>
        <!-- 悬停显示删除按钮 -->
        <button
          class="delete-btn"
          @click.stop="$emit('deleteSession', session.id)"
          title="删除对话"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- 空列表提示 -->
      <div v-if="sessions.length === 0" class="empty-hint">
        暂无对话
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
/**
 * 侧边栏组件
 * 显示会话列表，支持新建、切换、删除对话
 */
import type { Session } from '@shared/session'

defineProps<{
  /** 会话列表（按时间倒序） */
  sessions: Session[]
  /** 当前活跃会话 ID */
  activeSessionId: string | null
}>()

defineEmits<{
  newChat: []
  switchSession: [id: string]
  deleteSession: [id: string]
}>()

/**
 * 格式化时间戳为可读字符串
 */
function formatTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  // 一分钟内
  if (diff < 60_000) return '刚刚'
  // 一小时内
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  // 今天内
  if (diff < 86_400_000) {
    return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  // 更早
  return new Date(timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
</script>

<style scoped>
/* 侧边栏容器 */
.sidebar {
  width: 240px;
  height: 100vh;
  background: #16213e;
  border-right: 1px solid #2a3a5a;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

/* 顶部区域 */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.8rem 1rem;
  border-bottom: 1px solid #2a3a5a;
  flex-shrink: 0;
}

.sidebar-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #a0a0b0;
  margin: 0;
}

/* 新建对话按钮 */
.new-chat-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid #2a4a6a;
  background: transparent;
  color: #8ecae6;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.new-chat-btn:hover {
  background: #2a4a6a;
  border-color: #8ecae6;
}

/* 会话列表区域 */
.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.4rem;
}

.session-list::-webkit-scrollbar {
  width: 4px;
}

.session-list::-webkit-scrollbar-track {
  background: transparent;
}

.session-list::-webkit-scrollbar-thumb {
  background: #2a3a5a;
  border-radius: 2px;
}

/* 会话条目 */
.session-item {
  display: flex;
  align-items: center;
  padding: 0.6rem 0.7rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  gap: 0.4rem;
}

.session-item:hover {
  background: #1a2a4a;
}

.session-item.active {
  background: #0f3460;
}

/* 会话信息 */
.session-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.session-title {
  font-size: 0.85rem;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-item.active .session-title {
  color: #8ecae6;
}

.session-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.2rem;
  font-size: 0.7rem;
  color: #5a6a7a;
}

.session-model {
  background: #2a3a5a;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  font-size: 0.65rem;
}

/* 删除按钮（悬停显示） */
.delete-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: #5a6a7a;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.15s;
  flex-shrink: 0;
}

.session-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: #4a1f1f;
  color: #ff8a8a;
}

/* 空列表提示 */
.empty-hint {
  text-align: center;
  color: #5a6a7a;
  font-size: 0.85rem;
  padding: 2rem 0;
}
</style>
