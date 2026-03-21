<script setup lang="ts">
/**
 * 当前文本编辑组件
 * Notion 风格的块级文本编辑器
 */
import { ref, watch, nextTick } from 'vue'

/**
 * Props
 */
const props = defineProps<{
  content: string
}>()

/**
 * Emits
 */
const emit = defineEmits<{
  (e: 'update', content: string): void
}>()

/**
 * 本地编辑内容
 */
const localContent = ref(props.content)

/**
 * 编辑器引用
 */
const editorRef = ref<HTMLTextAreaElement | null>(null)

/**
 * 同步外部内容
 */
watch(() => props.content, (newContent) => {
  if (newContent !== localContent.value) {
    localContent.value = newContent
  }
})

/**
 * 处理输入
 */
const handleInput = () => {
  emit('update', localContent.value)
}

/**
 * 插入模板
 */
const insertTemplate = (template: string) => {
  if (!editorRef.value) return
  
  const start = editorRef.value.selectionStart
  const end = editorRef.value.selectionEnd
  const before = localContent.value.substring(0, start)
  const after = localContent.value.substring(end)
  
  localContent.value = before + template + after
  emit('update', localContent.value)
  
  nextTick(() => {
    if (editorRef.value) {
      editorRef.value.focus()
      editorRef.value.selectionStart = editorRef.value.selectionEnd = start + template.length
    }
  })
}

/**
 * 快捷键处理
 */
const handleKeydown = (e: KeyboardEvent) => {
  // Cmd/Ctrl + B: 加粗
  if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
    e.preventDefault()
    insertTemplate('**加粗文本**')
  }
  // Cmd/Ctrl + I: 斜体
  if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
    e.preventDefault()
    insertTemplate('*斜体文本*')
  }
  // Cmd/Ctrl + K: 代码
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    insertTemplate('`代码`')
  }
}

/**
 * 工具栏按钮
 */
const toolbarActions = [
  { icon: 'B', title: '加粗 (Cmd+B)', action: () => insertTemplate('**加粗**') },
  { icon: 'I', title: '斜体 (Cmd+I)', action: () => insertTemplate('*斜体*') },
  { icon: '</>', title: '代码 (Cmd+K)', action: () => insertTemplate('`代码`') },
  { icon: '#', title: '标题', action: () => insertTemplate('## 标题\n') },
  { icon: '-', title: '列表', action: () => insertTemplate('- 列表项\n') },
  { icon: '>', title: '引用', action: () => insertTemplate('> 引用内容\n') }
]
</script>

<template>
  <div class="current-text">
    <!-- 工具栏 -->
    <div class="toolbar">
      <button 
        v-for="(action, index) in toolbarActions" 
        :key="index"
        class="toolbar-btn"
        :title="action.title"
        @click="action.action"
      >
        {{ action.icon }}
      </button>
    </div>
    
    <!-- 编辑区 -->
    <textarea 
      ref="editorRef"
      v-model="localContent"
      @input="handleInput"
      @keydown="handleKeydown"
      placeholder="在此输入或粘贴内容..."
      class="text-editor"
    ></textarea>
    
    <!-- 统计信息 -->
    <div class="stats">
      <span>{{ localContent.length }} 字符</span>
      <span>{{ localContent.split(/\s+/).filter(w => w).length }} 词</span>
    </div>
  </div>
</template>

<style scoped>
.current-text {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* 工具栏 */
.toolbar {
  display: flex;
  gap: 4px;
  padding: 8px;
  background: #0f0f23;
  border-radius: 8px 8px 0 0;
  border: 1px solid #333;
  border-bottom: none;
}

.toolbar-btn {
  width: 28px;
  height: 28px;
  background: #1e1e2e;
  border: none;
  border-radius: 4px;
  color: #888;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
}

.toolbar-btn:hover {
  background: #333;
  color: white;
}

/* 编辑器 */
.text-editor {
  flex: 1;
  padding: 12px;
  background: #0f0f23;
  border: 1px solid #333;
  border-radius: 0 0 8px 8px;
  color: white;
  font-size: 13px;
  line-height: 1.6;
  resize: none;
  font-family: inherit;
}

.text-editor:focus {
  outline: none;
  border-color: #667eea;
}

.text-editor::placeholder {
  color: #444;
}

/* 统计信息 */
.stats {
  display: flex;
  gap: 15px;
  padding: 6px 10px;
  font-size: 11px;
  color: #666;
  background: #0f0f23;
  border-radius: 4px;
  margin-top: 6px;
}
</style>
