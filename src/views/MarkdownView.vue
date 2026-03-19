<script setup lang="ts">
/**
 * Markdown 编辑器视图组件
 * 支持实时预览、语法高亮、导出功能
 */
import { ref, watch, onMounted, computed } from 'vue'

/**
 * Markdown 内容
 */
const markdownContent = ref(`# 🥤 Latte Agent 使用指南

## 简介

Latte Agent 是一个智能 AI 助手，支持：

- 💬 **智能对话** - 与 AI 自然交互
- 🔧 **命令执行** - 安全执行本地命令
- 📦 **技能系统** - 创建可复用的命令技能
- 📋 **任务管理** - 拆分大任务为子任务

## 快速开始

### 安装

\`\`\`bash
cd latte_agent
npm install
npm run dev
\`\`\`

### 使用

1. 打开浏览器访问 \`http://localhost:5174\`
2. 在对话界面输入你的需求
3. AI 会分析并建议执行的命令
4. 确认后执行命令

## 功能特性

### 对话系统

| 功能 | 说明 |
|------|------|
| 意图识别 | 自动识别用户意图 |
| 命令建议 | 智能生成命令 |
| 安全确认 | 执行前需确认 |

### 代码示例

\`\`\`javascript
// 示例：创建一个技能
const skill = {
  name: 'hello',
  description: '打招呼',
  command: 'echo "Hello, \\${name}!"',
  parameters: [{ name: 'name', default: 'World' }]
}
\`\`\`

### 引用

> "代码是写给人看的，顺便给机器执行。"
> — Donald Knuth

### 列表

1. 第一步：安装依赖
2. 第二步：启动项目
3. 第三步：开始使用

- [x] 已完成功能
- [ ] 待开发功能
- [ ] 规划中功能

## 联系方式

- GitHub: [latte-agent](https://github.com)
- Email: support@latte-agent.com

---

*Made with ❤️ by Latte Team*
`)

/**
 * 是否显示预览
 */
const showPreview = ref(true)

/**
 * 是否显示分屏
 */
const isSplitView = ref(true)

/**
 * 编辑器字数统计
 */
const wordCount = computed(() => {
  return markdownContent.value.length
})

/**
 * 行数统计
 */
const lineCount = computed(() => {
  return markdownContent.value.split('\n').length
})

/**
 * 渲染后的 HTML
 */
const renderedHtml = ref('')

/**
 * 解析 Markdown 为 HTML
 */
const parseMarkdown = async (): Promise<string> => {
  try {
    // 动态导入 marked 库
    const { marked } = await import('marked')
    
    // 配置 marked
    marked.setOptions({
      breaks: true,
      gfm: true,
    })
    
    return await marked(markdownContent.value) as string
  } catch (error) {
    console.error('Markdown 解析错误:', error)
    return '<p style="color: red;">解析错误</p>'
  }
}

/**
 * 更新预览
 */
watch(markdownContent, async () => {
  if (showPreview.value) {
    renderedHtml.value = await parseMarkdown()
  }
}, { immediate: true })

/**
 * 切换预览
 */
const togglePreview = (): void => {
  showPreview.value = !showPreview.value
}

/**
 * 切换分屏模式
 */
const toggleSplitView = (): void => {
  isSplitView.value = !isSplitView.value
}

/**
 * 清空内容
 */
const clearContent = (): void => {
  if (confirm('确定要清空所有内容吗？')) {
    markdownContent.value = ''
  }
}

/**
 * 复制 Markdown
 */
const copyMarkdown = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(markdownContent.value)
    alert('已复制到剪贴板！')
  } catch {
    alert('复制失败')
  }
}

/**
 * 复制渲染后的 HTML
 */
const copyHtml = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(renderedHtml.value)
    alert('HTML 已复制到剪贴板！')
  } catch {
    alert('复制失败')
  }
}

/**
 * 导出为 Markdown 文件
 */
const exportMarkdown = (): void => {
  const blob = new Blob([markdownContent.value], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `document-${Date.now()}.md`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * 导出为 HTML 文件
 */
const exportHtml = (): void => {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Export</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.6;
      color: #333;
    }
    pre { background: #f5f5f5; padding: 15px; border-radius: 8px; overflow-x: auto; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; }
    blockquote { border-left: 4px solid #667eea; margin: 0; padding-left: 20px; color: #666; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    img { max-width: 100%; }
  </style>
</head>
<body>
${renderedHtml.value}
</body>
</html>`
  
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `document-${Date.now()}.html`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * 插入标题
 */
const insertHeading = (level: number): void => {
  const prefix = '#'.repeat(level) + ' '
  insertText(prefix)
}

/**
 * 插入粗体
 */
const insertBold = (): void => {
  insertText('****', 2)
}

/**
 * 插入斜体
 */
const insertItalic = (): void => {
  insertText('**', 1)
}

/**
 * 插入代码块
 */
const insertCode = (): void => {
  insertText('```\n\n```', 4)
}

/**
 * 插入链接
 */
const insertLink = (): void => {
  insertText('[链接文字](url)', 1)
}

/**
 * 插入图片
 */
const insertImage = (): void => {
  insertText('![图片描述](图片URL)', 2)
}

/**
 * 插入列表
 */
const insertList = (): void => {
  insertText('- ')
}

/**
 * 插入引用
 */
const insertQuote = (): void => {
  insertText('> ')
}

/**
 * 插入表格
 */
const insertTable = (): void => {
  const table = `| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 内容 | 内容 | 内容 |`
  insertText(table)
}

/**
 * 通用插入文本方法
 */
const insertText = (text: string, cursorOffset = 0): void => {
  const textarea = document.querySelector('.md-editor') as HTMLTextAreaElement
  if (!textarea) return
  
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  
  markdownContent.value = 
    markdownContent.value.substring(0, start) + 
    text + 
    markdownContent.value.substring(end)
  
  // 设置光标位置
  nextTick(() => {
    textarea.focus()
    textarea.setSelectionRange(start + cursorOffset, start + cursorOffset)
  })
}

/**
 * 导入 Markdown 文件
 */
const importFile = (): void => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.md,.markdown,.txt'
  
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (e) => {
      markdownContent.value = e.target?.result as string
    }
    reader.readAsText(file)
  }
  
  input.click()
}

/**
 * Vue nextTick
 */
import { nextTick } from 'vue'
</script>

<template>
  <div class="markdown-view">
    <!-- 标题栏 -->
    <div class="md-header">
      <h2>📝 Markdown 编辑器</h2>
      <div class="stats">
        <span>{{ wordCount }} 字符</span>
        <span>{{ lineCount }} 行</span>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <!-- 格式化工具 -->
      <div class="tool-group">
        <button @click="insertHeading(1)" title="一级标题">H1</button>
        <button @click="insertHeading(2)" title="二级标题">H2</button>
        <button @click="insertHeading(3)" title="三级标题">H3</button>
        <button @click="insertBold" title="粗体"><b>B</b></button>
        <button @click="insertItalic" title="斜体"><i>I</i></button>
        <button @click="insertCode" title="代码块">{ }</button>
        <button @click="insertLink" title="链接">🔗</button>
        <button @click="insertImage" title="图片">🖼️</button>
        <button @click="insertList" title="列表">📋</button>
        <button @click="insertQuote" title="引用">💬</button>
        <button @click="insertTable" title="表格">📊</button>
      </div>
      
      <!-- 视图切换 -->
      <div class="tool-group">
        <button @click="toggleSplitView" :class="{ active: isSplitView }">
          {{ isSplitView ? '📑 分屏' : '📄 单页' }}
        </button>
        <button @click="togglePreview" :class="{ active: showPreview }">
          {{ showPreview ? '👁️ 预览' : '👁️‍🗨️ 预览' }}
        </button>
      </div>
      
      <!-- 操作按钮 -->
      <div class="tool-group">
        <button @click="importFile" class="import-btn">📥 导入</button>
        <button @click="copyMarkdown" class="copy-btn">📋 复制</button>
        <button @click="exportMarkdown" class="export-btn">📥 导出MD</button>
        <button @click="exportHtml" class="export-btn">📥 导出HTML</button>
        <button @click="clearContent" class="clear-btn">🗑️ 清空</button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content" :class="{ 'split-view': isSplitView && showPreview, 'single-view': !isSplitView || !showPreview }">
      <!-- 编辑区 -->
      <div class="editor-panel" v-show="!isSplitView || !showPreview || isSplitView">
        <div class="panel-header">
          <span>✏️ 编辑</span>
        </div>
        <textarea 
          v-model="markdownContent"
          class="md-editor"
          spellcheck="false"
          placeholder="在这里输入 Markdown 内容..."
        ></textarea>
      </div>

      <!-- 预览区 -->
      <div class="preview-panel" v-show="showPreview">
        <div class="panel-header">
          <span>👁️ 预览</span>
          <button @click="copyHtml" class="copy-html-btn">复制HTML</button>
        </div>
        <div class="preview-content" v-html="renderedHtml"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/**
 * Markdown 视图容器
 */
.markdown-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
}

/**
 * 标题栏样式
 */
.md-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.md-header h2 {
  font-size: 18px;
}

.stats {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #666;
}

/**
 * 工具栏样式
 */
.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
  align-items: center;
}

.tool-group {
  display: flex;
  gap: 5px;
  padding: 5px;
  background: #1e1e2e;
  border-radius: 8px;
}

.toolbar button {
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: #aaa;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.toolbar button:hover {
  background: #333;
  color: white;
}

.toolbar button.active {
  background: #667eea;
  color: white;
}

.import-btn, .copy-btn, .export-btn, .clear-btn {
  background: #333 !important;
}

.import-btn:hover, .copy-btn:hover, .export-btn:hover {
  background: #444 !important;
}

.clear-btn:hover {
  background: #ff4757 !important;
  color: white !important;
}

/**
 * 主内容区
 */
.main-content {
  flex: 1;
  display: flex;
  gap: 15px;
  min-height: 0;
}

.split-view .editor-panel,
.split-view .preview-panel {
  flex: 1;
}

.single-view .editor-panel,
.single-view .preview-panel {
  flex: 1;
}

.editor-panel, .preview-panel {
  display: flex;
  flex-direction: column;
  background: #1e1e2e;
  border-radius: 12px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background: #16213e;
  font-size: 13px;
  color: #aaa;
}

.copy-html-btn {
  padding: 4px 10px;
  border: none;
  background: #667eea;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

/**
 * 编辑器样式
 */
.md-editor {
  flex: 1;
  padding: 15px;
  border: none;
  background: #0f0f23;
  color: #e2e8f0;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
}

.md-editor:focus {
  outline: none;
}

/**
 * 预览区样式
 */
.preview-content {
  flex: 1;
  padding: 20px;
  background: #0f0f23;
  overflow: auto;
  line-height: 1.8;
}

/* Markdown 渲染样式 */
:deep(.preview-content) {
  color: #e2e8f0;
}

:deep(.preview-content h1) {
  font-size: 2em;
  border-bottom: 2px solid #667eea;
  padding-bottom: 10px;
  margin-bottom: 20px;
}

:deep(.preview-content h2) {
  font-size: 1.5em;
  border-bottom: 1px solid #444;
  padding-bottom: 8px;
  margin-top: 30px;
}

:deep(.preview-content h3) {
  font-size: 1.25em;
  margin-top: 20px;
}

:deep(.preview-content p) {
  margin: 15px 0;
}

:deep(.preview-content ul, .preview-content ol) {
  padding-left: 25px;
  margin: 15px 0;
}

:deep(.preview-content li) {
  margin: 5px 0;
}

:deep(.preview-content code) {
  background: #1e1e2e;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', monospace;
  font-size: 0.9em;
  color: #4ade80;
}

:deep(.preview-content pre) {
  background: #1e1e2e;
  padding: 15px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 15px 0;
}

:deep(.preview-content pre code) {
  background: transparent;
  padding: 0;
}

:deep(.preview-content blockquote) {
  border-left: 4px solid #667eea;
  margin: 15px 0;
  padding: 10px 20px;
  background: #1e1e2e;
  color: #aaa;
}

:deep(.preview-content table) {
  border-collapse: collapse;
  width: 100%;
  margin: 15px 0;
}

:deep(.preview-content th),
:deep(.preview-content td) {
  border: 1px solid #333;
  padding: 10px;
  text-align: left;
}

:deep(.preview-content th) {
  background: #1e1e2e;
}

:deep(.preview-content img) {
  max-width: 100%;
  border-radius: 8px;
}

:deep(.preview-content a) {
  color: #667eea;
  text-decoration: none;
}

:deep(.preview-content a:hover) {
  text-decoration: underline;
}

:deep(.preview-content hr) {
  border: none;
  border-top: 1px solid #333;
  margin: 30px 0;
}
</style>
