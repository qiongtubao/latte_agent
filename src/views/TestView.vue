<script setup lang="ts">
/**
 * 高级测试视图组件
 * 支持任务拆解、并发/串行/混合执行测试
 */
import { ref, onMounted, computed } from 'vue'

/**
 * 子任务类型
 */
interface SubTask {
  id: string                    // 任务唯一 ID
  name: string                  // 任务名称
  prompt: string                // 发送给 LLM 的提示
  command?: string              // 提取的命令
  status: 'pending' | 'running' | 'success' | 'error'  // 任务状态
  output?: string               // LLM 输出
  executionResult?: string      // 命令执行结果
  startTime?: number            // 开始时间戳
  endTime?: number              // 结束时间戳
  dependsOn?: string[]          // 依赖的任务 ID 列表
}

/**
 * 复杂任务类型
 */
interface ComplexTask {
  id: string                    // 任务 ID
  name: string                  // 任务名称
  description: string           // 任务描述
  subtasks: SubTask[]           // 子任务列表
  executionMode: 'serial' | 'parallel' | 'mixed'  // 执行模式
  status: 'pending' | 'running' | 'completed' | 'error'
  startTime?: number
  endTime?: number
}

/**
 * 测试场景类型
 */
interface TestScenario {
  id: string
  name: string
  description: string
  executionMode: 'serial' | 'parallel' | 'mixed'
  tasks: Array<{
    name: string
    prompt: string
    dependsOn?: string[]
  }>
}

/**
 * 可用模型列表
 */
const availableModels = ref<string[]>([])

/**
 * 选中的模型
 */
const selectedModel = ref('qwen3.5:35b')

/**
 * 当前运行的任务
 */
const currentTask = ref<ComplexTask | null>(null)

/**
 * 历史任务列表
 */
const taskHistory = ref<ComplexTask[]>([])

/**
 * 是否正在执行
 */
const isRunning = ref(false)

/**
 * 执行日志
 */
const executionLog = ref<string[]>([])

/**
 * 预设测试场景
 */
const testScenarios: TestScenario[] = [
  {
    id: 'serial-analysis',
    name: '串行分析 - 项目检查',
    description: '按顺序检查项目状态：文件列表 → Git 状态 → 依赖检查',
    executionMode: 'serial',
    tasks: [
      { name: '列出文件', prompt: '执行 ls -la 列出当前目录所有文件' },
      { name: 'Git 状态', prompt: '执行 git status 查看仓库状态' },
      { name: '依赖检查', prompt: '执行 npm ls --depth=0 查看项目依赖' }
    ]
  },
  {
    id: 'parallel-info',
    name: '并发获取 - 系统信息',
    description: '并发获取多个系统信息：Node版本、Python版本、系统信息',
    executionMode: 'parallel',
    tasks: [
      { name: 'Node版本', prompt: '执行 node -v 获取 Node.js 版本' },
      { name: 'Python版本', prompt: '执行 python3 --version 获取 Python 版本' },
      { name: '系统信息', prompt: '执行 uname -a 获取系统信息' },
      { name: '磁盘空间', prompt: '执行 df -h 查看磁盘使用情况' }
    ]
  },
  {
    id: 'mixed-workflow',
    name: '混合模式 - 构建流程',
    description: '混合执行：先并发检查环境，再串行执行构建',
    executionMode: 'mixed',
    tasks: [
      { name: '检查 Node', prompt: '执行 node -v 检查 Node.js 版本', dependsOn: [] },
      { name: '检查 npm', prompt: '执行 npm -v 检查 npm 版本', dependsOn: [] },
      { name: '安装依赖', prompt: '执行 npm install 安装项目依赖', dependsOn: ['检查 Node', '检查 npm'] },
      { name: '运行构建', prompt: '执行 npm run build 构建项目', dependsOn: ['安装依赖'] },
      { name: '检查构建产物', prompt: '执行 ls -la dist/ 查看构建输出', dependsOn: ['运行构建'] }
    ]
  },
  {
    id: 'complex-pipeline',
    name: '复杂流水线 - 数据处理',
    description: '模拟数据处理流水线：准备 → 处理 → 验证 → 清理',
    executionMode: 'mixed',
    tasks: [
      { name: '创建临时目录', prompt: '执行 mkdir -p /tmp/test-data 创建测试目录', dependsOn: [] },
      { name: '生成测试数据', prompt: '执行 echo "test data" > /tmp/test-data/input.txt 生成测试文件', dependsOn: ['创建临时目录'] },
      { name: '处理数据 A', prompt: '执行 cat /tmp/test-data/input.txt 读取数据', dependsOn: ['生成测试数据'] },
      { name: '处理数据 B', prompt: '执行 wc -l /tmp/test-data/input.txt 统计行数', dependsOn: ['生成测试数据'] },
      { name: '汇总结果', prompt: '执行 ls -la /tmp/test-data/ 查看处理结果', dependsOn: ['处理数据 A', '处理数据 B'] },
      { name: '清理临时文件', prompt: '执行 rm -rf /tmp/test-data 清理测试目录', dependsOn: ['汇总结果'] }
    ]
  }
]

/**
 * 统计信息
 */
const stats = computed(() => {
  const total = currentTask.value?.subtasks.length || 0
  const completed = currentTask.value?.subtasks.filter(t => t.status === 'success').length || 0
  const failed = currentTask.value?.subtasks.filter(t => t.status === 'error').length || 0
  const running = currentTask.value?.subtasks.filter(t => t.status === 'running').length || 0
  return { total, completed, failed, running }
})

/**
 * 组件挂载
 */
onMounted(async () => {
  await fetchModels()
})

/**
 * 获取 Ollama 模型列表
 */
const fetchModels = async (): Promise<void> => {
  try {
    const res = await fetch('http://localhost:11434/api/tags')
    const data = await res.json()
    availableModels.value = data.models.map((m: any) => m.name)
    if (availableModels.value.length > 0 && !selectedModel.value) {
      selectedModel.value = availableModels.value[0]
    }
  } catch (error) {
    addLog('❌ 无法连接到 Ollama，请确保 Ollama 正在运行')
  }
}

/**
 * 添加日志
 */
const addLog = (message: string): void => {
  const timestamp = new Date().toLocaleTimeString()
  executionLog.value.unshift(`[${timestamp}] ${message}`)
}

/**
 * 调用 Ollama API
 */
const callOllama = async (prompt: string): Promise<string> => {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: selectedModel.value,
      prompt: `你是命令行助手。根据用户需求，输出要执行的命令。
只输出命令本身，不要有其他解释。
如果涉及危险操作，输出 "BLOCKED"。

用户需求: ${prompt}`,
      stream: false
    })
  })
  const data = await response.json()
  return data.response?.trim() || ''
}

/**
 * 执行命令（模拟）
 */
const executeCommand = async (command: string): Promise<string> => {
  // 实际项目中可以调用 Electron 的 IPC 或后端 API
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`✅ 命令已执行: ${command}\n(模拟输出)`)
    }, 500 + Math.random() * 1000)
  })
}

/**
 * 创建复杂任务
 */
const createComplexTask = (scenario: TestScenario): ComplexTask => {
  const taskId = `task-${Date.now()}`
  const subtasks: SubTask[] = scenario.tasks.map((t, index) => ({
    id: `subtask-${index}`,
    name: t.name,
    prompt: t.prompt,
    status: 'pending' as const,
    dependsOn: t.dependsOn || []
  }))

  return {
    id: taskId,
    name: scenario.name,
    description: scenario.description,
    subtasks,
    executionMode: scenario.executionMode,
    status: 'pending'
  }
}

/**
 * 执行单个子任务
 */
const executeSubtask = async (subtask: SubTask): Promise<void> => {
  subtask.status = 'running'
  subtask.startTime = Date.now()
  addLog(`🚀 开始执行: ${subtask.name}`)

  try {
    // 1. 调用 LLM 获取命令
    const llmOutput = await callOllama(subtask.prompt)
    subtask.output = llmOutput

    // 2. 提取命令
    const commandMatch = llmOutput.match(/^[\w\s\-\/\.\|><&]+$/m)
    if (commandMatch && !llmOutput.includes('BLOCKED')) {
      subtask.command = commandMatch[0].trim()
      
      // 3. 执行命令
      subtask.executionResult = await executeCommand(subtask.command)
      subtask.status = 'success'
      addLog(`✅ 完成: ${subtask.name} → ${subtask.command}`)
    } else {
      subtask.status = 'error'
      subtask.executionResult = '未识别到有效命令或命令被阻止'
      addLog(`⚠️ 跳过: ${subtask.name} - 未识别命令`)
    }
  } catch (error) {
    subtask.status = 'error'
    subtask.executionResult = String(error)
    addLog(`❌ 失败: ${subtask.name} - ${error}`)
  }

  subtask.endTime = Date.now()
}

/**
 * 检查任务依赖是否满足
 */
const checkDependencies = (subtask: SubTask, allSubtasks: SubTask[]): boolean => {
  if (!subtask.dependsOn || subtask.dependsOn.length === 0) return true
  
  return subtask.dependsOn.every(depName => {
    const dep = allSubtasks.find(t => t.name === depName)
    return dep && dep.status === 'success'
  })
}

/**
 * 串行执行
 */
const executeSerial = async (task: ComplexTask): Promise<void> => {
  for (const subtask of task.subtasks) {
    await executeSubtask(subtask)
  }
}

/**
 * 并发执行
 */
const executeParallel = async (task: ComplexTask): Promise<void> => {
  await Promise.all(task.subtasks.map(subtask => executeSubtask(subtask)))
}

/**
 * 混合执行（基于依赖关系）
 */
const executeMixed = async (task: ComplexTask): Promise<void> => {
  const pending = [...task.subtasks]
  const maxIterations = task.subtasks.length * 10 // 防止死循环
  let iterations = 0

  while (pending.length > 0 && iterations < maxIterations) {
    iterations++
    
    // 找出所有依赖已满足的任务
    const readyTasks = pending.filter(t => 
      t.status === 'pending' && checkDependencies(t, task.subtasks)
    )

    if (readyTasks.length === 0) {
      // 检查是否有任务卡住
      const stuckTasks = pending.filter(t => t.status === 'pending')
      if (stuckTasks.length > 0) {
        addLog(`⚠️ ${stuckTasks.length} 个任务因依赖未满足被跳过`)
        stuckTasks.forEach(t => {
          t.status = 'error'
          t.executionResult = '依赖任务未完成'
        })
        break
      }
    }

    // 并发执行所有就绪任务
    if (readyTasks.length > 0) {
      await Promise.all(readyTasks.map(subtask => executeSubtask(subtask)))
      // 从 pending 中移除已完成的任务
      pending.splice(0, pending.length, ...pending.filter(t => t.status === 'pending'))
    }

    await new Promise(r => setTimeout(r, 100))
  }
}

/**
 * 运行测试场景
 */
const runScenario = async (scenario: TestScenario): Promise<void> => {
  if (isRunning.value) return

  isRunning.value = true
  executionLog.value = []
  
  const task = createComplexTask(scenario)
  currentTask.value = task
  task.status = 'running'
  task.startTime = Date.now()

  addLog(`📋 开始执行: ${scenario.name}`)
  addLog(`🔄 执行模式: ${scenario.executionMode}`)

  try {
    switch (scenario.executionMode) {
      case 'serial':
        await executeSerial(task)
        break
      case 'parallel':
        await executeParallel(task)
        break
      case 'mixed':
        await executeMixed(task)
        break
    }
    
    task.status = 'completed'
    addLog(`🎉 任务完成！成功: ${stats.value.completed}/${stats.value.total}`)
  } catch (error) {
    task.status = 'error'
    addLog(`❌ 任务失败: ${error}`)
  }

  task.endTime = Date.now()
  taskHistory.value.unshift(task)
  isRunning.value = false
}

/**
 * 清空日志
 */
const clearLog = (): void => {
  executionLog.value = []
}

/**
 * 清空历史
 */
const clearHistory = (): void => {
  taskHistory.value = []
  currentTask.value = null
}

/**
 * 获取状态图标
 */
const getStatusIcon = (status: string): string => {
  switch (status) {
    case 'pending': return '⏳'
    case 'running': return '🔄'
    case 'success': return '✅'
    case 'error': return '❌'
    default: return '❓'
  }
}

/**
 * 获取执行模式标签样式
 */
const getModeClass = (mode: string): string => {
  return `mode-${mode}`
}

/**
 * 格式化执行时间
 */
const formatDuration = (start?: number, end?: number): string => {
  if (!start || !end) return '-'
  const ms = end - start
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}
</script>

<template>
  <div class="advanced-test-view">
    <!-- 标题栏 -->
    <div class="test-header">
      <h2>🧪 高级测试模块</h2>
      <div class="model-selector">
        <label>模型:</label>
        <select v-model="selectedModel" :disabled="isRunning">
          <option v-for="model in availableModels" :key="model" :value="model">
            {{ model }}
          </option>
        </select>
      </div>
    </div>

    <!-- 测试场景选择 -->
    <div class="scenarios-section">
      <h3>📦 测试场景</h3>
      <div class="scenarios-grid">
        <div 
          v-for="scenario in testScenarios" 
          :key="scenario.id"
          :class="['scenario-card', getModeClass(scenario.executionMode)]"
        >
          <div class="scenario-header">
            <span class="scenario-mode">{{ scenario.executionMode.toUpperCase() }}</span>
            <h4>{{ scenario.name }}</h4>
          </div>
          <p class="scenario-desc">{{ scenario.description }}</p>
          <div class="scenario-tasks">
            <span v-for="t in scenario.tasks" :key="t.name" class="task-tag">
              {{ t.name }}
            </span>
          </div>
          <button 
            @click="runScenario(scenario)"
            :disabled="isRunning"
            class="run-btn"
          >
            {{ isRunning ? '执行中...' : '运行' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 当前任务状态 -->
    <div v-if="currentTask" class="current-task-section">
      <div class="task-header">
        <h3>🔄 {{ currentTask.name }}</h3>
        <span :class="['status-badge', currentTask.status]">
          {{ currentTask.status }}
        </span>
      </div>
      
      <!-- 进度条 -->
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${(stats.completed / stats.total) * 100}%` }"
        ></div>
      </div>
      
      <!-- 统计信息 -->
      <div class="stats-row">
        <span>总任务: {{ stats.total }}</span>
        <span>✅ 完成: {{ stats.completed }}</span>
        <span>❌ 失败: {{ stats.failed }}</span>
        <span>🔄 运行中: {{ stats.running }}</span>
      </div>

      <!-- 子任务列表 -->
      <div class="subtasks-grid">
        <div 
          v-for="subtask in currentTask.subtasks" 
          :key="subtask.id"
          :class="['subtask-card', subtask.status]"
        >
          <div class="subtask-header">
            <span class="status-icon">{{ getStatusIcon(subtask.status) }}</span>
            <span class="subtask-name">{{ subtask.name }}</span>
          </div>
          
          <div v-if="subtask.dependsOn?.length" class="dependencies">
            依赖: {{ subtask.dependsOn.join(', ') }}
          </div>
          
          <div v-if="subtask.command" class="command-display">
            <code>{{ subtask.command }}</code>
          </div>
          
          <div v-if="subtask.executionResult" class="result-preview">
            {{ subtask.executionResult.slice(0, 100) }}...
          </div>
          
          <div v-if="subtask.startTime" class="timing">
            {{ formatDuration(subtask.startTime, subtask.endTime || Date.now()) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 执行日志 -->
    <div class="log-section">
      <div class="log-header">
        <h3>📜 执行日志</h3>
        <button @click="clearLog" class="clear-btn">清空</button>
      </div>
      <div class="log-container">
        <div v-for="(log, index) in executionLog" :key="index" class="log-entry">
          {{ log }}
        </div>
        <div v-if="executionLog.length === 0" class="log-empty">
          暂无日志
        </div>
      </div>
    </div>

    <!-- 历史记录 -->
    <div v-if="taskHistory.length > 0" class="history-section">
      <div class="history-header">
        <h3>📚 历史记录</h3>
        <button @click="clearHistory" class="clear-btn">清空</button>
      </div>
      <div class="history-list">
        <div v-for="task in taskHistory" :key="task.id" class="history-item">
          <span class="history-name">{{ task.name }}</span>
          <span :class="['history-status', task.status]">{{ task.status }}</span>
          <span class="history-time">
            {{ formatDuration(task.startTime, task.endTime) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.advanced-test-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

/* 标题栏 */
.test-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.test-header h2 {
  font-size: 20px;
}

.model-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.model-selector select {
  padding: 8px 12px;
  background: #1e1e2e;
  border: 1px solid #333;
  border-radius: 6px;
  color: white;
  min-width: 180px;
}

/* 场景区 */
.scenarios-section {
  margin-bottom: 25px;
}

.scenarios-section h3 {
  margin-bottom: 15px;
  font-size: 16px;
}

.scenarios-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 15px;
}

.scenario-card {
  background: #1e1e2e;
  border-radius: 12px;
  padding: 15px;
  border-top: 3px solid;
}

.scenario-card.mode-serial { border-top-color: #f59e0b; }
.scenario-card.mode-parallel { border-top-color: #22c55e; }
.scenario-card.mode-mixed { border-top-color: #8b5cf6; }

.scenario-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.scenario-mode {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #333;
  color: #aaa;
  font-weight: bold;
}

.scenario-header h4 {
  font-size: 14px;
  margin: 0;
}

.scenario-desc {
  font-size: 12px;
  color: #888;
  margin-bottom: 12px;
}

.scenario-tasks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.task-tag {
  font-size: 11px;
  padding: 3px 8px;
  background: #0f0f23;
  border-radius: 4px;
  color: #aaa;
}

.run-btn {
  width: 100%;
  padding: 10px;
  border: none;
  background: #667eea;
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
}

.run-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 当前任务 */
.current-task-section {
  background: #1e1e2e;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 25px;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.task-header h3 {
  font-size: 16px;
  margin: 0;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  text-transform: uppercase;
}

.status-badge.pending { background: #333; color: #888; }
.status-badge.running { background: #f59e0b; color: #000; }
.status-badge.completed { background: #22c55e; color: #000; }
.status-badge.error { background: #ff4757; color: white; }

/* 进度条 */
.progress-bar {
  height: 6px;
  background: #333;
  border-radius: 3px;
  margin-bottom: 15px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #22c55e);
  transition: width 0.3s;
}

/* 统计行 */
.stats-row {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: #888;
  margin-bottom: 20px;
}

/* 子任务网格 */
.subtasks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.subtask-card {
  background: #0f0f23;
  border-radius: 8px;
  padding: 12px;
  border-left: 3px solid;
}

.subtask-card.pending { border-left-color: #666; }
.subtask-card.running { border-left-color: #f59e0b; }
.subtask-card.success { border-left-color: #22c55e; }
.subtask-card.error { border-left-color: #ff4757; }

.subtask-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.status-icon {
  font-size: 14px;
}

.subtask-name {
  font-size: 13px;
  font-weight: 500;
}

.dependencies {
  font-size: 11px;
  color: #666;
  margin-bottom: 8px;
}

.command-display {
  background: #1a1a2e;
  padding: 6px 10px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.command-display code {
  font-size: 11px;
  color: #4ade80;
}

.result-preview {
  font-size: 11px;
  color: #888;
  margin-bottom: 8px;
  word-break: break-all;
}

.timing {
  font-size: 10px;
  color: #666;
  text-align: right;
}

/* 日志区 */
.log-section {
  background: #1e1e2e;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 25px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.log-header h3 {
  font-size: 14px;
  margin: 0;
}

.clear-btn {
  padding: 4px 12px;
  background: #333;
  border: none;
  border-radius: 4px;
  color: #aaa;
  cursor: pointer;
  font-size: 12px;
}

.log-container {
  max-height: 200px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 12px;
}

.log-entry {
  padding: 4px 0;
  color: #aaa;
  border-bottom: 1px solid #1a1a2e;
}

.log-empty {
  text-align: center;
  color: #666;
  padding: 20px;
}

/* 历史记录 */
.history-section {
  background: #1e1e2e;
  border-radius: 12px;
  padding: 15px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.history-header h3 {
  font-size: 14px;
  margin: 0;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #0f0f23;
  border-radius: 6px;
}

.history-name {
  font-size: 13px;
}

.history-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
}

.history-status.completed { background: #22c55e; color: #000; }
.history-status.error { background: #ff4757; color: white; }

.history-time {
  font-size: 12px;
  color: #666;
}
</style>
