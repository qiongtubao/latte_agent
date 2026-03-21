<script setup lang="ts">
/**
 * 文本模块组件
 * 单个文本编辑区域
 */
import { ref, watch } from 'vue'

/**
 * Props
 */
const props = defineProps<{
  id: string
  title: string
  content: string
  isActive: boolean
}>()

/**
 * Emits
 */
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'activate'): void
  (e: 'update:content', content: string): void
  (e: 'update:title', title: string): void
}>()

/**
 * 本地标题
 */
const localTitle = ref(props.title)

/**
 * 本地内容
 */
const localContent = ref(props.content)

/**
 * 是否正在编辑标题
 */
const isEditingTitle = ref(false)

/**
 * 同步 props
 */
watch(() => props.title, (newTitle) => {
  localTitle.value = newTitle
})

watch(() => props.content, (newContent) => {
  localContent.value = newContent
})

/**
 * 处理内容更新
 */
const handleContentUpdate = () => {
  emit('update:content', localContent.value)
}

/**
 * 开始编辑标题
 */
const startEditTitle = () => {
  isEditingTitle.value = true
}

/**
 * 完成标题编辑
 */
const finishEditTitle = () => {
  isEditingTitle.value = false
  emit('update:title', localTitle.value)
}
</script>

<template>
  <div 
    :class="['text-module', { active: isActive }]"
    @click="emit('activate')"
  >
    <!-- 头部 -->
    <div class="module-header">
      <div class="title-area">
        <input 
          v-if="isEditingTitle"
          v-model="localTitle"
          @blur="finishEditTitle"
          @keyup.enter="finishEditTitle"
          class="title-input"
          ref="titleInput"
        />
        <h4 v-else @dblclick="startEditTitle">
          {{ localTitle }}
        </h4>
      </div>
      <button class="close-btn" @click.stop="emit('close')" title="关闭">
        ×
      </button>
    </div>
    
    <!-- 工具栏 -->
    <div class="module-toolbar">
      <span class="char-count">{{ localContent.length }} 字</span>
    </div>
    
    <!-- 编辑区 -->
    <textarea 
      v-model="localContent"
      @input="handleContentUpdate"
      @click.stop
      class="module-editor"
      placeholder="在此输入内容..."
    ></textarea>
    
    <!-- 状态栏 -->
    <div class="module-status">
      <span class="status-item">📝 编辑中</span>
      <span class="status-item">{{ new Date().toLocaleTimeString() }}</span>
    </div>
  </div>
</template>

<style scoped>
.text-module {
  width: 400px;
  min-width: 400px;
  height: 100%;
  background: #1e1e2e;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.text-module.active {
  border-color: #667eea;
}

/* 头部 */
.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #333;
}

.title-area {
  flex: 1;
}

.title-area h4 {
  margin: 0;
  font-size: 14px;
  cursor: pointer;
}

.title-area h4:hover {
  color: #667eea;
}

.title-input {
  background: #0f0f23;
  border: 1px solid #667eea;
  border-radius: 4px;
  padding: 4px 8px;
  color: white;
  font-size: 14px;
  width: 100%;
}

.close-btn {
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  color: #666;
  font-size: 20px;
  cursor: pointer;
  border-radius: 4px;
}

.close-btn:hover {
  background: #ff4757;
  color: white;
}

/* 工具栏 */
.module-toolbar {
  padding: 8px 16px;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.char-count {
  font-size: 11px;
  color: #666;
}

/* 编辑器 */
.module-editor {
  flex: 1;
  padding: 16px;
  background: transparent;
  border: none;
  color: white;
  font-size: 13px;
  line-height: 1.6;
  resize: none;
  font-family: inherit;
}

.module-editor:focus {
  outline: none;
}

.module-editor::placeholder {
  color: #444;
}

/* 状态栏 */
.module-status {
  padding: 8px 16px;
  border-top: 1px solid #333;
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #666;
}
</style>
