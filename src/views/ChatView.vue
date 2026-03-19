<script setup lang="ts">
/**
 * 对话视图组件
 * 实现与 AI 的交互功能，支持意图识别、命令建议和执行
 */
import { ref, nextTick, inject, onMounted, onUnmounted } from 'vue'

/**
 * 消息类型定义
 */
interface Message {
  role: 'user' | 'assistant' | 'system'  // 消息角色：用户/AI/系统
  content: string                          // 消息内容
  commands?: string[]                       // 建议执行的命令列表
}

/**
 * 消息列表
 */
const messages = ref<Message[]>([
  { 
    role: 'assistant', 
    content: '你好！我是 Latte Agent。\n\n我可以帮你：\n1. 回答问题\n2. 执行本地命令（需你确认）\n3. 创建可复用的技能\n4. 拆分大任务为子任务\n\n有什么我可以帮你的？' 
  }
])

/**
 * 用户输入文本
 */
const inputText = ref('')

/**
 * 是否正在加载中
 */
const isLoading = ref(false)

/**
 * 消息列表 DOM 引用
 */
const messagesRef = ref<HTMLElement | null>(null)

/**
 * 注入命令确认函数（从父组件 App.vue 提供）
 */
const requestCommandConfirm = inject<(command: string) => void>('requestCommandConfirm')

/**
 * 滚动到消息底部
 */
const scrollToBottom = (): void => {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

/**
 * 格式化消息内容，将换行符转换为 HTML 换行标签
 * @param text - 原始文本
 * @returns 格式化后的 HTML
 */
const formatMessage = (text: string): string => {
  return text.replace(/\n/g, '<br>')
}

/**
 * 发送消息给 AI 处理
 */
const sendMessage = async (): Promise<void> => {
  // 输入为空或正在加载时忽略
  if (!inputText.value.trim() || isLoading.value) return
  
  const userInput = inputText.value.trim()
  
  // 添加用户消息
  messages.value.push({ role: 'user', content: userInput })
  inputText.value = ''
  isLoading.value = true
  scrollToBottom()
  
  // 模拟 AI 响应延迟（实际项目中应该调用 LLM API）
  await new Promise(resolve => setTimeout(resolve, 800))
  
  // 生成 AI 响应
  const response = generateResponse(userInput)
  messages.value.push(response)
  isLoading.value = false
  scrollToBottom()
}

/**
 * 生成 AI 响应
 * 分析用户输入，识别意图并生成相应回复
 * @param input - 用户输入
 * @returns 响应消息对象
 */
const generateResponse = (input: string): Message => {
  const lower = input.toLowerCase()
  
  // 检测命令模式 - 列出文件
  if (lower.includes('ls') || lower.includes('列出') || lower.includes('list')) {
    return {
      role: 'assistant',
      content: '我理解你想查看文件列表。',
      commands: ['ls -la', 'ls -la ~/']
    }
  }
  
  // 检测命令模式 - 创建目录
  if (lower.includes('mkdir') || lower.includes('创建目录')) {
    return {
      role: 'assistant',
      content: '好的，我来帮你创建目录。',
      commands: ['mkdir new-directory']
    }
  }
  
  // 检测命令模式 - Git 操作
  if (lower.includes('git') || lower.includes('提交')) {
    return {
      role: 'assistant',
      content: '你想执行 Git 操作。',
      commands: ['git status']
    }
  }
  
  // 普通对话响应 - 随机选择
  const responses = [
    '我明白了。请告诉我更多细节？',
    '好的，我可以帮你完成这个任务。',
    '收到！还有其他需要吗？',
    '理解。你想让我执行什么操作？',
  ]
  
  return {
    role: 'assistant',
    content: responses[Math.floor(Math.random() * responses.length)]
  }
}

/**
 * 请求执行命令（触发确认弹窗）
 * @param command - 要执行的命令
 */
const requestExecute = (command: string): void => {
  if (requestCommandConfirm) {
    requestCommandConfirm(command)
  }
}

/**
 * 组件挂载时监听命令执行事件
 */
onMounted(() => {
  // 监听自定义命令执行事件
  window.addEventListener('execute-command', ((e: CustomEvent) => {
    messages.value.push({ 
      role: 'system', 
      content: `⚡ 执行命令: ${e.detail}` 
    })
    scrollToBottom()
  }) as EventListener)
})
</script>

<template>
  <!-- 对话视图容器 -->
  <div class="chat-view">
    <!-- 对话标题 -->
    <div class="chat-header">
      <h2>💬 与 AI 对话</h2>
    </div>
    
    <!-- 消息列表区域 -->
    <div class="messages" ref="messagesRef">
      <!-- 遍历显示所有消息 -->
      <div 
        v-for="(msg, index) in messages" 
        :key="index"
        :class="['message', msg.role]"
      >
        <!-- 消息头像 -->
        <div class="message-avatar">
          {{ msg.role === 'user' ? '👤' : '🤖' }}
        </div>
        <!-- 消息内容 -->
        <div class="message-content">
          <!-- 消息文本 -->
          <div class="message-text" v-html="formatMessage(msg.content)"></div>
          <!-- 建议命令列表 -->
          <div v-if="msg.commands" class="message-commands">
            <p class="commands-tip">📋 建议执行的命令：</p>
            <div v-for="(cmd, i) in msg.commands" :key="i" class="command-item">
              <code>{{ cmd }}</code>
              <button @click="requestExecute(cmd)" class="run-btn">▶ 运行</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 加载中提示 -->
      <div v-if="isLoading" class="message assistant">
        <div class="message-avatar">🤖</div>
        <div class="message-content">
          <div class="loading">思考中...</div>
        </div>
      </div>
    </div>
    
    <!-- 输入区域 -->
    <div class="input-area">
      <input 
        v-model="inputText"
        @keyup.enter="sendMessage"
        placeholder="输入消息... (输入命令直接执行)"
        :disabled="isLoading"
      />
      <button @click="sendMessage" :disabled="isLoading || !inputText.trim()">
        发送
      </button>
    </div>
  </div>
</template>

<style scoped>
/**
 * 对话视图容器样式
 */
.chat-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/**
 * 对话标题样式
 */
.chat-header {
  padding: 15px 20px;
  border-bottom: 1px solid #333;
}

.chat-header h2 {
  font-size: 18px;
}

/**
 * 消息列表容器样式
 */
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/**
 * 单条消息样式
 */
.message {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

/**
 * 用户消息居右显示
 */
.message.user {
  flex-direction: row-reverse;
}

/**
 * 消息头像样式
 */
.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

/**
 * 用户消息头像颜色
 */
.message.user .message-avatar {
  background: #667eea;
}

/**
 * 消息气泡样式
 */
.message-content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  background: #1e1e2e;
}

/**
 * 用户消息气泡颜色
 */
.message.user .message-content {
  background: #2d2d44;
}

/**
 * 消息文本样式
 */
.message-text {
  line-height: 1.6;
}

/**
 * 命令建议区域样式
 */
.message-commands {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #444;
}

/**
 * 命令提示文字
 */
.commands-tip {
  font-size: 12px;
  color: #888;
  margin-bottom: 10px;
}

/**
 * 单个命令项样式
 */
.command-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #0f0f23;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 8px;
}

/**
 * 命令代码样式
 */
.command-item code {
  font-family: monospace;
  color: #4ade80;
}

/**
 * 运行按钮样式
 */
.run-btn {
  padding: 4px 12px;
  border: none;
  background: #667eea;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.run-btn:hover {
  background: #764ba2;
}

/**
 * 加载中文字样式
 */
.loading {
  color: #888;
}

/**
 * 输入区域样式
 */
.input-area {
  display: flex;
  gap: 10px;
  padding: 15px 20px;
  border-top: 1px solid #333;
}

/**
 * 输入框样式
 */
.input-area input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #333;
  border-radius: 8px;
  background: #1e1e2e;
  color: white;
  font-size: 14px;
}

.input-area input:focus {
  outline: none;
  border-color: #667eea;
}

/**
 * 发送按钮样式
 */
.input-area button {
  padding: 12px 24px;
  border: none;
  background: #667eea;
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.input-area button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
