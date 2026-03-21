<script setup lang="ts">
/**
 * AI 文本编辑器弹窗组件
 * 用于邮件内容编辑，支持 AI 辅助功能
 * 使用 views/AiTextEditorView 作为核心编辑界面
 */
import { ref } from 'vue'
import AiTextEditorView from '../../../views/AiTextEditorView.vue'

/**
 * Props
 */
const props = defineProps<{
  initialContent?: string
}>()

/**
 * Emits
 */
const emit = defineEmits<{
  (e: 'confirm', content: string): void
  (e: 'cancel'): void
}>()

/**
 * 编辑内容
 */
const content = ref(props.initialContent || '')

/**
 * 确认
 */
const confirm = () => {
  emit('confirm', content.value)
}

/**
 * 取消
 */
const cancel = () => {
  emit('cancel')
}
</script>

<template>
  <div class="ai-editor-overlay" @click.self="cancel">
    <div class="ai-editor-modal">
      <!-- 头部 -->
      <div class="editor-header">
        <h3>📝 AI 文本编辑器</h3>
        <button class="close-btn" @click="cancel">×</button>
      </div>
      
      <!-- 主内容区：使用 AiTextEditorView -->
      <div class="main-content">
        <AiTextEditorView />
      </div>
      
      <!-- 底部按钮 -->
      <div class="editor-footer">
        <button class="cancel-btn" @click="cancel">取消</button>
        <button class="confirm-btn" @click="confirm">
          ✅ 确认使用
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-editor-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.ai-editor-modal {
  width: 95%;
  max-width: 1200px;
  height: 85vh;
  background: #1e1e2e;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 头部 */
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  flex-shrink: 0;
}

.editor-header h3 {
  margin: 0;
  color: white;
}

.close-btn {
  width: 32px;
  height: 32px;
  background: rgba(255,255,255,0.2);
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 20px;
  cursor: pointer;
}

/* 主内容区 */
.main-content {
  flex: 1;
  overflow: hidden;
}

.main-content :deep(.ai-text-editor) {
  height: 100%;
}

/* 底部 */
.editor-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #333;
  flex-shrink: 0;
}

.cancel-btn {
  padding: 10px 20px;
  background: #333;
  border: none;
  border-radius: 8px;
  color: #aaa;
  cursor: pointer;
}

.confirm-btn {
  padding: 10px 24px;
  background: #4ade80;
  border: none;
  border-radius: 8px;
  color: #000;
  font-weight: 500;
  cursor: pointer;
}
</style>
