<script setup lang="ts">
/**
 * 流程图/画图设计视图组件
 * 支持流程图、思维导图、时序图等多种图表类型
 */
import { ref, onMounted, watch, nextTick } from 'vue'

/**
 * 图表类型列表
 */
const diagramTypes = [
  { id: 'flowchart', name: '流程图', icon: '📊' },
  { id: 'sequence', name: '时序图', icon: '📈' },
  { id: 'class', name: '类图', icon: '📐' },
  { id: 'state', name: '状态图', icon: '🔄' },
  { id: 'mindmap', name: '思维导图', icon: '🧠' },
]

/**
 * 当前选中的图表类型
 */
const selectedType = ref('flowchart')

/**
 * 示例模板
 */
const templates: Record<string, string> = {
  flowchart: `graph TD
    A[开始] --> B{是否登录?}
    B -->|是| C[进入主页]
    B -->|否| D[登录页面]
    D --> E[输入账号密码]
    E --> F{验证通过?}
    F -->|是| C
    F -->|否| G[显示错误]
    G --> D
    C --> H[结束]`,
  
  sequence: `sequenceDiagram
    participant 用户
    participant 前端
    participant 后端
    participant 数据库
    
    用户->>前端: 点击登录
    前端->>后端: 发送登录请求
    后端->>数据库: 查询用户信息
    数据库-->>后端: 返回用户数据
    后端-->>前端: 返回Token
    前端-->>用户: 登录成功`,
  
  class: `classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +String breed
        +bark()
    }
    class Cat {
        +String color
        +meow()
    }
    Animal <|-- Dog
    Animal <|-- Cat`,
  
  state: `stateDiagram-v2
    [*] --> 待处理
    待处理 --> 处理中: 开始处理
    处理中 --> 已完成: 处理成功
    处理中 --> 失败: 处理出错
    失败 --> 处理中: 重试
    已完成 --> [*]`,
  
  mindmap: `mindmap
  root((项目开发))
    需求分析
      用户调研
      功能规划
    设计阶段
      UI设计
      架构设计
    开发阶段
      前端开发
      后端开发
      测试
    部署上线
      服务器配置
      域名绑定`,
}

/**
 * 当前编辑的图表代码
 */
const diagramCode = ref(templates.flowchart)

/**
 * 预览区域 DOM 引用
 */
const previewRef = ref<HTMLElement | null>(null)

/**
 * 是否正在渲染
 */
const isRendering = ref(false)

/**
 * 历史记录
 */
interface DiagramHistory {
  code: string
  type: string
  timestamp: string
}
const history = ref<DiagramHistory[]>([])

/**
 * 切换图表类型时加载对应模板
 */
watch(selectedType, (newType) => {
  diagramCode.value = templates[newType] || ''
  renderDiagram()
})

/**
 * 渲染图表
 * 使用 Mermaid 库渲染图表
 */
const renderDiagram = async (): Promise<void> => {
  if (!previewRef.value) return
  
  isRendering.value = true
  
  try {
    // 动态导入 mermaid
    const mermaid = (await import('mermaid')).default
    
    // 配置 mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
    })
    
    // 生成唯一 ID
    const id = `mermaid-${Date.now()}`
    
    // 渲染图表
    const { svg } = await mermaid.render(id, diagramCode.value)
    previewRef.value.innerHTML = svg
  } catch (error) {
    previewRef.value.innerHTML = `
      <div style="color: #ff4757; padding: 20px;">
        ❌ 渲染错误: ${error}
        <br><br>
        <span style="color: #888;">请检查图表语法是否正确</span>
      </div>
    `
  } finally {
    isRendering.value = false
  }
}

/**
 * 保存到历史记录
 */
const saveToHistory = (): void => {
  history.value.unshift({
    code: diagramCode.value,
    type: selectedType.value,
    timestamp: new Date().toLocaleString()
  })
  
  if (history.value.length > 10) {
    history.value = history.value.slice(0, 10)
  }
}

/**
 * 从历史记录加载
 */
const loadFromHistory = (item: DiagramHistory): void => {
  diagramCode.value = item.code
  selectedType.value = item.type
  renderDiagram()
}

/**
 * 清空编辑器
 */
const clearEditor = (): void => {
  diagramCode.value = ''
  if (previewRef.value) {
    previewRef.value.innerHTML = ''
  }
}

/**
 * 重置为模板
 */
const resetToTemplate = (): void => {
  diagramCode.value = templates[selectedType.value] || ''
  renderDiagram()
}

/**
 * 复制代码
 */
const copyCode = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(diagramCode.value)
    alert('代码已复制到剪贴板！')
  } catch {
    alert('复制失败')
  }
}

/**
 * 导出为 SVG
 */
const exportSVG = (): void => {
  if (!previewRef.value) return
  
  const svg = previewRef.value.querySelector('svg')
  if (!svg) {
    alert('没有可导出的图表')
    return
  }
  
  const svgData = new XMLSerializer().serializeToString(svg)
  const blob = new Blob([svgData], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `diagram-${Date.now()}.svg`
  a.click()
  
  URL.revokeObjectURL(url)
}

/**
 * 组件挂载时初始化渲染
 */
onMounted(() => {
  nextTick(() => {
    renderDiagram()
  })
})
</script>

<template>
  <div class="diagram-view">
    <!-- 标题栏 -->
    <div class="diagram-header">
      <h2>🎨 图表设计</h2>
      <div class="type-selector">
        <label>类型:</label>
        <select v-model="selectedType">
          <option v-for="type in diagramTypes" :key="type.id" :value="type.id">
            {{ type.icon }} {{ type.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <button @click="renderDiagram" :disabled="isRendering" class="render-btn">
        {{ isRendering ? '⏳ 渲染中...' : '🎨 渲染' }}
      </button>
      <button @click="resetToTemplate" class="reset-btn">🔄 重置模板</button>
      <button @click="copyCode" class="copy-btn">📋 复制代码</button>
      <button @click="exportSVG" class="export-btn">📥 导出SVG</button>
      <button @click="clearEditor" class="clear-btn">🗑️ 清空</button>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 编辑区 -->
      <div class="editor-panel">
        <div class="panel-header">
          <span>📝 Mermaid 代码</span>
          <a href="https://mermaid.js.org/intro/" target="_blank" class="help-link">
            📚 文档
          </a>
        </div>
        <textarea 
          v-model="diagramCode"
          class="code-editor"
          spellcheck="false"
          placeholder="输入 Mermaid 图表代码..."
        ></textarea>
      </div>

      <!-- 预览区 -->
      <div class="preview-panel">
        <div class="panel-header">
          <span>👁️ 预览</span>
          <button @click="saveToHistory" class="save-btn">💾 保存</button>
        </div>
        <div ref="previewRef" class="preview-content">
          <div class="loading-placeholder">
            点击"渲染"查看图表...
          </div>
        </div>
      </div>
    </div>

    <!-- 历史记录 -->
    <div class="history-panel" v-if="history.length > 0">
      <div class="panel-header">
        <span>📜 历史记录</span>
      </div>
      <div class="history-list">
        <div 
          v-for="(item, index) in history" 
          :key="index"
          class="history-item"
          @click="loadFromHistory(item)"
        >
          <span class="history-type">{{ diagramTypes.find(t => t.id === item.type)?.icon }} {{ item.type }}</span>
          <span class="history-time">{{ item.timestamp }}</span>
        </div>
      </div>
    </div>

    <!-- 快捷提示 -->
    <div class="tips-panel">
      <h4>💡 快捷提示</h4>
      <ul>
        <li><strong>流程图:</strong> graph TD / graph LR（从上到下 / 从左到右）</li>
        <li><strong>节点形状:</strong> A[矩形] A(圆角) A{菱形} A((圆形))</li>
        <li><strong>连线:</strong> --> 箭头 --- 无箭头 -.-> 虚线</li>
        <li><strong>标签:</strong> A-->|标签|B</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
/**
 * 图表视图容器
 */
.diagram-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
}

/**
 * 标题栏样式
 */
.diagram-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.diagram-header h2 {
  font-size: 18px;
}

.type-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.type-selector select {
  padding: 8px 12px;
  border: 1px solid #333;
  border-radius: 6px;
  background: #1e1e2e;
  color: white;
}

/**
 * 工具栏样式
 */
.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.toolbar button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.render-btn {
  background: #4ade80;
  color: #000;
}

.render-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reset-btn {
  background: #f59e0b;
  color: #000;
}

.copy-btn {
  background: #3b82f6;
  color: white;
}

.export-btn {
  background: #8b5cf6;
  color: white;
}

.clear-btn {
  background: #444;
  color: #aaa;
}

/**
 * 主内容区
 */
.main-content {
  display: flex;
  gap: 15px;
  flex: 1;
  min-height: 0;
}

.editor-panel, .preview-panel {
  flex: 1;
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

.help-link {
  color: #667eea;
  text-decoration: none;
  font-size: 12px;
}

.help-link:hover {
  text-decoration: underline;
}

.save-btn {
  padding: 4px 10px;
  border: none;
  background: #4ade80;
  color: #000;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

/**
 * 代码编辑器样式
 */
.code-editor {
  flex: 1;
  padding: 15px;
  border: none;
  background: #0f0f23;
  color: #e2e8f0;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: none;
}

.code-editor:focus {
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
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-placeholder {
  color: #666;
  font-size: 14px;
}

/* Mermaid 图表样式覆盖 */
:deep(.preview-content svg) {
  max-width: 100%;
  height: auto;
}

/**
 * 历史记录面板
 */
.history-panel {
  margin-top: 15px;
  background: #1e1e2e;
  border-radius: 12px;
  overflow: hidden;
}

.history-list {
  display: flex;
  gap: 10px;
  padding: 10px;
  overflow-x: auto;
}

.history-item {
  padding: 8px 15px;
  background: #16213e;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}

.history-item:hover {
  background: #2d2d44;
}

.history-type {
  font-size: 12px;
  margin-right: 10px;
}

.history-time {
  font-size: 11px;
  color: #666;
}

/**
 * 提示面板
 */
.tips-panel {
  margin-top: 15px;
  padding: 15px;
  background: #1e1e2e;
  border-radius: 12px;
}

.tips-panel h4 {
  font-size: 14px;
  margin-bottom: 10px;
  color: #f59e0b;
}

.tips-panel ul {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.tips-panel li {
  font-size: 12px;
  color: #888;
}

.tips-panel strong {
  color: #4ade80;
}
</style>
