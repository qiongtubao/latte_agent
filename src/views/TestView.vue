<script setup lang="ts">
/**
 * 测试视图组件
 * 连接本地 Ollama 模型进行测试，验证意图识别和命令提取功能
 */
import { ref, onMounted } from 'vue'

/**
 * 测试结果类型定义
 */
interface TestResult {
  input: string               // 用户输入
  output: string              // LLM 输出
  command?: string            // 提取的命令
  executed?: boolean          // 是否已执行
  executionResult?: string    // 执行结果
  success?: boolean           // 是否成功
  timestamp: string          // 测试时间
}

/**
 * 测试用例类型定义
 */
interface TestCase {
  name: string               // 测试名称
  input: string              // 用户输入
  expectedCommand: string    // 预期命令关键词
}

/**
 * 是否正在运行测试
 */
const isRunning = ref(false)

/**
 * 当前正在执行的测试名称
 */
const currentTest = ref('')

/**
 * 测试结果列表
 */
const testResults = ref<TestResult[]>([])

/**
 * 选中的模型名称
 */
const selectedModel = ref('qwen3.5:35b')

/**
 * 可用模型列表
 */
const availableModels = ref<string[]>([])

/**
 * 测试用例列表
 */
const testCases: TestCase[] = [
  {
    name: '列出文件',
    input: '帮我列出当前目录的文件',
    expectedCommand: 'ls'
  },
  {
    name: '创建目录',
    input: '创建一个名为 test-dir 的目录',
    expectedCommand: 'mkdir'
  },
  {
    name: 'Git 状态',
    input: '查看 git 仓库状态',
    expectedCommand: 'git status'
  },
  {
    name: 'Node 版本',
    input: '检查 nodejs 版本',
    expectedCommand: 'node -v'
  }
]

/**
 * 组件挂载时获取可用模型
 */
onMounted(async () => {
  await fetchModels()
})

/**
 * 获取 Ollama 可用模型列表
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
    console.error('获取模型列表失败:', error)
  }
}

/**
 * 调用 Ollama API 生成响应
 * @param prompt - 用户输入提示
 * @returns LLM 响应文本
 */
const callOllama = async (prompt: string): Promise<string> => {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: selectedModel.value,
      prompt: `你是一个智能助手。用户可能会要求你执行本地命令。请分析用户意图，生成要执行的命令。

用户输入: ${prompt}

请直接输出要执行的命令（如果有），不要输出其他内容。如果没有命令需要执行，请输出"无命令"。
注意：如果用户要求执行危险命令（如 rm -rf /），请输出"拒绝执行"。
`
    })
  })

  const data = await response.json()
  return data.response?.trim() || ''
}

/**
 * 执行本地命令
 * @param command - 要执行的命令
 * @returns 命令输出结果
 */
const executeCommand = async (command: string): Promise<string> => {
  try {
    // 尝试调用 exec API
    const response = await fetch('http://localhost:11434/api/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: command,
        timeout: 30000
      })
    })
    const data = await response.json()
    return data.output || data.error || '命令执行完成'
  } catch (error) {
    // 如果没有 exec API，返回提示
    return `执行功能待实现: ${command}`
  }
}

/**
 * 运行单个测试用例
 * 1. 发送输入给 Ollama 分析
 * 2. 从响应中提取命令
 * 3. 验证命令是否匹配预期
 * 4. 执行命令并记录结果
 * @param testCase - 测试用例对象
 */
const runSingleTest = async (testCase: TestCase): Promise<void> => {
  isRunning.value = true
  currentTest.value = testCase.name

  // 初始化结果对象
  const result: TestResult = {
    input: testCase.input,
    output: '',
    timestamp: new Date().toLocaleString()
  }

  try {
    // 步骤1: 发送给 Ollama 分析意图
    const llmResponse = await callOllama(testCase.input)
    result.output = llmResponse

    // 步骤2: 从响应中提取命令
    const commandMatch = llmResponse.match(/[a-zA-Z].+/)
    if (commandMatch) {
      result.command = commandMatch[0].trim()
      
      // 步骤3: 验证命令是否匹配预期
      const isCommandMatch = result.command.toLowerCase().includes(testCase.expectedCommand.toLowerCase())
      
      if (isCommandMatch) {
        // 步骤4: 执行命令
        result.executed = true
        result.executionResult = await executeCommand(result.command)
        result.success = true
      } else {
        result.success = false
        result.executionResult = `命令不匹配: 期望 ${testCase.expectedCommand}, 实际 ${result.command}`
      }
    } else {
      result.success = false
      result.executionResult = '未识别到命令'
    }
  } catch (error) {
    result.output = `错误: ${error}`
    result.success = false
  }

  // 添加到结果列表
  testResults.value.unshift(result)
  isRunning.value = false
  currentTest.value = ''
}

/**
 * 顺序运行所有测试用例
 */
const runAllTests = async (): Promise<void> => {
  for (const testCase of testCases) {
    await runSingleTest(testCase)
    // 避免请求过快，间隔1秒
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}

/**
 * 清空测试结果
 */
const clearResults = (): void => {
  testResults.value = []
}

/**
 * 获取结果状态图标
 * @param result - 测试结果对象
 * @returns 状态图标字符
 */
const getStatusIcon = (result: TestResult): string => {
  if (!result.success) return '❌'
  return '✅'
}
</script>

<template>
  <!-- 测试视图容器 -->
  <div class="test-view">
    <!-- 标题栏 -->
    <div class="test-header">
      <h2>🧪 Ollama 测试</h2>
      
      <!-- 模型选择器 -->
      <div class="model-selector">
        <label>选择模型:</label>
        <select v-model="selectedModel">
          <option v-for="model in availableModels" :key="model" :value="model">
            {{ model }}
          </option>
        </select>
      </div>
    </div>

    <!-- 测试控制按钮 -->
    <div class="test-controls">
      <button 
        @click="runAllTests" 
        :disabled="isRunning"
        class="run-all-btn"
      >
        {{ isRunning ? '测试中...' : '运行全部测试' }}
      </button>
      
      <button @click="clearResults" class="clear-btn">
        清空结果
      </button>
    </div>

    <!-- 当前测试提示 -->
    <div v-if="currentTest" class="current-test">
      正在测试: {{ currentTest }}
    </div>

    <!-- 测试结果列表 -->
    <div class="test-results">
      <div 
        v-for="(result, index) in testResults" 
        :key="index"
        :class="['result-card', result.success ? 'success' : 'error']"
      >
        <!-- 结果头部 -->
        <div class="result-header">
          <span class="status-icon">{{ getStatusIcon(result) }}</span>
          <span class="timestamp">{{ result.timestamp }}</span>
        </div>
        
        <!-- 用户输入 -->
        <div class="result-section">
          <label>用户输入:</label>
          <p>{{ result.input }}</p>
        </div>
        
        <!-- LLM 输出 -->
        <div class="result-section">
          <label>LLM 输出:</label>
          <pre>{{ result.output }}</pre>
        </div>
        
        <!-- 提取的命令 -->
        <div v-if="result.command" class="result-section">
          <label>提取命令:</label>
          <code>{{ result.command }}</code>
        </div>
        
        <!-- 执行结果 -->
        <div v-if="result.executionResult" class="result-section">
          <label>执行结果:</label>
          <pre>{{ result.executionResult }}</pre>
        </div>
      </div>
    </div>

    <!-- 测试用例列表 -->
    <div class="test-cases">
      <h3>测试用例</h3>
      <div 
        v-for="testCase in testCases" 
        :key="testCase.name"
        class="test-case"
      >
        <span class="case-name">{{ testCase.name }}</span>
        <span class="case-input">{{ testCase.input }}</span>
        <span class="case-expected">预期: {{ testCase.expectedCommand }}</span>
        <button 
          @click="runSingleTest(testCase)" 
          :disabled="isRunning"
          class="case-btn"
        >
          测试
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/**
 * 测试视图容器样式
 */
.test-view {
  padding: 20px;
}

/**
 * 标题栏样式
 */
.test-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.test-header h2 {
  font-size: 18px;
}

/**
 * 模型选择器样式
 */
.model-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.model-selector select {
  padding: 8px 12px;
  border: 1px solid #333;
  border-radius: 6px;
  background: #1e1e2e;
  color: white;
}

/**
 * 测试控制按钮容器样式
 */
.test-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

/**
 * 运行全部按钮样式
 */
.run-all-btn, .clear-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.run-all-btn {
  background: #4ade80;
  color: #000;
}

.run-all-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.clear-btn {
  background: #444;
  color: #aaa;
}

/**
 * 当前测试提示样式
 */
.current-test {
  padding: 10px;
  background: #f59e0b;
  color: #000;
  border-radius: 8px;
  margin-bottom: 20px;
}

/**
 * 测试结果列表容器样式
 */
.test-results {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 30px;
}

/**
 * 结果卡片样式
 */
.result-card {
  background: #1e1e2e;
  border-radius: 12px;
  padding: 20px;
  border-left: 4px solid;
}

/* 成功状态 - 绿色左边框 */
.result-card.success {
  border-left-color: #4ade80;
}

/* 失败状态 - 红色左边框 */
.result-card.error {
  border-left-color: #ff4757;
}

/**
 * 结果头部样式
 */
.result-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
}

.status-icon {
  font-size: 20px;
}

.timestamp {
  color: #666;
  font-size: 12px;
}

/**
 * 结果区块样式
 */
.result-section {
  margin-bottom: 12px;
}

.result-section label {
  display: block;
  font-size: 12px;
  color: #888;
  margin-bottom: 5px;
}

.result-section p {
  margin: 0;
}

.result-section pre {
  background: #0f0f23;
  padding: 10px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 13px;
}

.result-section code {
  background: #0f0f23;
  padding: 5px 10px;
  border-radius: 4px;
  color: #4ade80;
}

/**
 * 测试用例区域样式
 */
.test-cases {
  border-top: 1px solid #333;
  padding-top: 20px;
}

.test-cases h3 {
  margin-bottom: 15px;
  font-size: 16px;
}

/**
 * 测试用例卡片样式
 */
.test-case {
  display: flex;
  align-items: center;
  gap: 15px;
  background: #1e1e2e;
  padding: 12px 15px;
  border-radius: 8px;
  margin-bottom: 10px;
}

/**
 * 用例名称样式
 */
.case-name {
  font-weight: bold;
  color: #667eea;
  min-width: 80px;
}

/**
 * 用例输入样式
 */
.case-input {
  flex: 1;
  color: #aaa;
}

/**
 * 预期命令样式
 */
.case-expected {
  color: #4ade80;
  font-size: 12px;
}

/**
 * 用例测试按钮样式
 */
.case-btn {
  padding: 6px 12px;
  border: none;
  background: #667eea;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.case-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
