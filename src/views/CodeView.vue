<script setup lang="ts">
/**
 * 代码编辑器视图组件
 * 支持 Electron 环境下的命令执行
 */
import { ref, onMounted } from 'vue'

/**
 * 检测是否在 Electron 环境中运行
 */
const isElectron = ref(false)

/**
 * 支持的编程语言列表
 */
const languages = [
  { id: 'javascript', name: 'JavaScript', icon: '🟨' },
  { id: 'typescript', name: 'TypeScript', icon: '🔷' },
  { id: 'python', name: 'Python', icon: '🐍' },
  { id: 'bash', name: 'Bash', icon: '🖥️' },
  { id: 'sql', name: 'SQL', icon: '🗃️' },
]

/**
 * 当前选中的语言
 */
const selectedLanguage = ref('javascript')

/**
 * 代码内容
 */
const code = ref(`// 在这里编写代码
function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return \`Welcome to Latte Agent!\`;
}

// 调用函数
greet('World');

// 数组操作示例
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log('Doubled:', doubled);
`)

/**
 * 执行结果
 */
const output = ref('')

/**
 * 是否正在执行
 */
const isRunning = ref(false)

/**
 * 执行历史记录
 */
interface HistoryItem {
  code: string
  output: string
  language: string
  timestamp: string
}
const history = ref<HistoryItem[]>([])

/**
 * 组件挂载时检测环境
 */
onMounted(() => {
  isElectron.value = !!window.isElectron
})

/**
 * 执行代码
 * 根据不同语言使用不同的执行方式
 */
const runCode = async (): Promise<void> => {
  isRunning.value = true
  output.value = ''
  
  try {
    if (selectedLanguage.value === 'javascript' || selectedLanguage.value === 'typescript') {
      // JavaScript/TypeScript 使用 eval 执行
      await executeJavaScript()
    } else if (selectedLanguage.value === 'python') {
      // Python 执行
      await executePython()
    } else if (selectedLanguage.value === 'bash') {
      // Bash 执行
      await executeBash()
    } else if (selectedLanguage.value === 'sql') {
      // SQL 需要数据库连接
      output.value = '⚠️ SQL 执行需要数据库连接\n建议: 配置数据库连接后执行'
    }
    
    // 添加到历史记录
    history.value.unshift({
      code: code.value,
      output: output.value,
      language: selectedLanguage.value,
      timestamp: new Date().toLocaleString()
    })
    
    // 限制历史记录数量
    if (history.value.length > 20) {
      history.value = history.value.slice(0, 20)
    }
  } catch (error) {
    output.value = `❌ 执行错误: ${error}`
  } finally {
    isRunning.value = false
  }
}

/**
 * 执行 JavaScript 代码
 * 捕获 console.log 输出
 */
const executeJavaScript = async (): Promise<void> => {
  const logs: string[] = []
  
  // 保存原始 console.log
  const originalLog = console.log
  const originalError = console.error
  const originalWarn = console.warn
  
  // 重写 console 方法以捕获输出
  console.log = (...args) => {
    logs.push(args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' '))
  }
  console.error = (...args) => {
    logs.push('❌ ' + args.join(' '))
  }
  console.warn = (...args) => {
    logs.push('⚠️ ' + args.join(' '))
  }
  
  try {
    // 使用 Function 构造函数执行代码
    const fn = new Function(code.value)
    const result = fn()
    
    if (result !== undefined) {
      logs.push('📤 返回值: ' + (typeof result === 'object' ? JSON.stringify(result, null, 2) : result))
    }
    
    output.value = logs.length > 0 ? logs.join('\n') : '✅ 执行完成（无输出）'
  } catch (error) {
    output.value = `❌ 执行错误: ${error}`
  } finally {
    // 恢复原始 console
    console.log = originalLog
    console.error = originalError
    console.warn = originalWarn
  }
}

/**
 * 执行 Python 代码
 * 在 Electron 环境下调用系统 Python
 */
const executePython = async (): Promise<void> => {
  if (window.electronAPI) {
    // Electron 环境：通过 python3 命令执行
    const result = await window.electronAPI.executeCommand(`python3 -c "${code.value.replace(/"/g, '\\"')}"`)
    output.value = result.success ? result.output : `❌ ${result.output}`
  } else {
    // Web 环境：提示需要 Electron
    output.value = '⚠️ Python 执行需要 Electron 环境\n请在 Electron 中运行此应用'
  }
}

/**
 * 执行 Bash 代码
 * 在 Electron 环境下调用系统 Shell
 */
const executeBash = async (): Promise<void> => {
  if (window.electronAPI) {
    // Electron 环境：直接执行 Bash 命令
    const result = await window.electronAPI.executeCommand(code.value)
    output.value = result.success ? result.output : `❌ ${result.output}`
  } else {
    // Web 环境：提示需要 Electron
    output.value = '⚠️ Bash 执行需要 Electron 环境\n请在 Electron 中运行此应用'
  }
}

/**
 * 清空代码
 */
const clearCode = (): void => {
  code.value = ''
  output.value = ''
}

/**
 * 清空历史
 */
const clearHistory = (): void => {
  history.value = []
}

/**
 * 从历史记录加载代码
 */
const loadFromHistory = (item: HistoryItem): void => {
  code.value = item.code
  selectedLanguage.value = item.language
}

/**
 * 复制代码到剪贴板
 */
const copyCode = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(code.value)
    alert('代码已复制到剪贴板！')
  } catch {
    alert('复制失败，请手动复制')
  }
}
</script>

<template>
  <div class="code-view">
    <!-- 标题栏 -->
    <div class="code-header">
      <h2>💻 代码编辑器</h2>
      <div class="header-info">
        <div class="language-selector">
          <label>语言:</label>
          <select v-model="selectedLanguage">
            <option v-for="lang in languages" :key="lang.id" :value="lang.id">
              {{ lang.icon }} {{ lang.name }}
            </option>
          </select>
        </div>
        <div v-if="isElectron" class="env-badge electron">
          🖥️ Electron
        </div>
        <div v-else class="env-badge web">
          🌐 Web
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <button @click="runCode" :disabled="isRunning" class="run-btn">
        {{ isRunning ? '⏳ 执行中...' : '▶ 运行' }}
      </button>
      <button @click="clearCode" class="clear-btn">🗑️ 清空</button>
      <button @click="copyCode" class="copy-btn">📋 复制</button>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 代码编辑区 -->
      <div class="editor-panel">
        <div class="panel-header">
          <span>📝 代码</span>
          <span class="line-count">{{ code.split('\n').length }} 行</span>
        </div>
        <textarea 
          v-model="code"
          class="code-editor"
          spellcheck="false"
          placeholder="在这里编写代码..."
        ></textarea>
      </div>

      <!-- 输出区 -->
      <div class="output-panel">
        <div class="panel-header">
          <span>📤 输出</span>
          <button @click="output = ''" class="clear-output-btn">清空</button>
        </div>
        <pre class="output-content">{{ output || '点击"运行"查看输出结果...' }}</pre>
      </div>
    </div>

    <!-- 历史记录 -->
    <div class="history-panel" v-if="history.length > 0">
      <div class="panel-header">
        <span>📜 执行历史</span>
        <button @click="clearHistory" class="clear-history-btn">清空历史</button>
      </div>
      <div class="history-list">
        <div 
          v-for="(item, index) in history" 
          :key="index"
          class="history-item"
          @click="loadFromHistory(item)"
        >
          <span class="history-lang">{{ item.language }}</span>
          <span class="history-time">{{ item.timestamp }}</span>
          <pre class="history-preview">{{ item.code.slice(0, 50) }}...</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.code-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.code-header h2 {
  font-size: 18px;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.language-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.language-selector select {
  padding: 8px 12px;
  border: 1px solid #333;
  border-radius: 6px;
  background: #1e1e2e;
  color: white;
}

.env-badge {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
}

.env-badge.electron {
  background: #4ade80;
  color: #000;
}

.env-badge.web {
  background: #3b82f6;
  color: white;
}

.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.toolbar button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.run-btn {
  background: #4ade80;
  color: #000;
}

.run-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.clear-btn {
  background: #444;
  color: #aaa;
}

.copy-btn {
  background: #3b82f6;
  color: white;
}

.main-content {
  display: flex;
  gap: 15px;
  flex: 1;
  min-height: 0;
}

.editor-panel, .output-panel {
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

.line-count {
  font-size: 12px;
  color: #666;
}

.code-editor {
  flex: 1;
  padding: 15px;
  border: none;
  background: #0f0f23;
  color: #e2e8f0;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  tab-size: 2;
}

.code-editor:focus {
  outline: none;
}

.output-content {
  flex: 1;
  padding: 15px;
  margin: 0;
  background: #0f0f23;
  color: #4ade80;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.clear-output-btn, .clear-history-btn {
  padding: 4px 8px;
  border: none;
  background: transparent;
  color: #666;
  cursor: pointer;
  font-size: 12px;
}

.history-panel {
  margin-top: 15px;
  background: #1e1e2e;
  border-radius: 12px;
  overflow: hidden;
}

.history-list {
  max-height: 150px;
  overflow-y: auto;
}

.history-item {
  padding: 10px 15px;
  border-bottom: 1px solid #333;
  cursor: pointer;
  transition: background 0.2s;
}

.history-item:hover {
  background: #2d2d44;
}

.history-lang {
  display: inline-block;
  padding: 2px 8px;
  background: #667eea;
  color: white;
  border-radius: 4px;
  font-size: 11px;
  margin-right: 10px;
}

.history-time {
  font-size: 12px;
  color: #666;
}

.history-preview {
  margin: 5px 0 0;
  font-size: 12px;
  color: #888;
  font-family: monospace;
}
</style>
