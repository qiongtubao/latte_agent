<script setup lang="ts">
/**
 * 任务管理视图组件
 * 实现大任务拆分、子任务独立对话、结果合并功能
 */
import { ref, nextTick } from 'vue'

/**
 * 任务消息类型定义
 */
interface TaskMessage {
  role: 'user' | 'assistant'   // 消息角色
  content: string               // 消息内容
}

/**
 * 任务类型定义
 */
interface Task {
  id: string                    // 任务唯一标识 (UUID)
  description: string           // 任务描述
  status: 'in_progress' | 'completed'  // 任务状态
  completed: boolean             // 是否已完成
  messages: TaskMessage[]        // 对话消息列表
  createdAt: string              // 创建时间
}

/**
 * 任务列表数据
 */
const tasks = ref<Task[]>([])

/**
 * 当前激活的标签页：list=列表 / chat=对话
 */
const activeTab = ref<'list' | 'chat'>('list')

/**
 * 当前选中的任务对象
 */
const activeTask = ref<Task | null>(null)

/**
 * 任务对话输入框
 */
const taskInput = ref('')

/**
 * 是否显示创建任务弹窗
 */
const showCreateModal = ref(false)

/**
 * 是否显示合并结果弹窗
 */
const showMergeModal = ref(false)

/**
 * 合并结果数据
 */
const mergedTask = ref<Task | null>(null)

/**
 * 新任务表单数据
 */
const newTask = ref({ description: '' })

/**
 * 对话区域 DOM 引用
 */
const chatRef = ref<HTMLElement | null>(null)

/**
 * 创建新任务（拆分大任务）
 * 将大任务拆分为独立的子任务
 */
const createTask = (): void => {
  if (!newTask.value.description.trim()) return
  
  // 创建任务对象
  const task: Task = {
    id: crypto.randomUUID(),
    description: newTask.value.description,
    status: 'in_progress',
    completed: false,
    messages: [
      { 
        role: 'assistant', 
        content: `子任务已创建：${newTask.value.description}\n我会帮你完成这个子任务。请告诉我你的具体需求。` 
      }
    ],
    createdAt: new Date().toISOString().split('T')[0] as string
  }
  
  // 添加到任务列表
  tasks.value.push(task)
  
  // 重置表单
  showCreateModal.value = false
  newTask.value = { description: '' }
}

/**
 * 打开子任务对话
 * 切换到对话标签页并设置当前任务
 * @param task - 要打开的任务对象
 */
const openTaskChat = (task: Task): void => {
  activeTask.value = task
  activeTab.value = 'chat'
  // 滚动到底部
  nextTick(() => {
    if (chatRef.value) {
      chatRef.value.scrollTop = chatRef.value.scrollHeight
    }
  })
}

/**
 * 向子任务发送消息
 * 处理用户与子任务的对话交互
 */
const sendToTask = async (): Promise<void> => {
  // 验证输入
  if (!taskInput.value.trim() || !activeTask.value) return
  
  // 添加用户消息
  activeTask.value.messages.push({ 
    role: 'user', 
    content: taskInput.value 
  })
  
  const input = taskInput.value
  taskInput.value = ''
  
  // 检查是否标记为完成
  if (input.toLowerCase().includes('完成') || input.toLowerCase().includes('done')) {
    activeTask.value.completed = true
    activeTask.value.status = 'completed'
    activeTask.value.messages.push({ 
      role: 'assistant', 
      content: '✅ 子任务已完成！返回任务列表可以合并结果。' 
    })
    return
  }
  
  // 模拟子任务响应延迟
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // 随机选择响应内容
  const responses = [
    '收到，我继续处理。',
    '明白，还有其他要求吗？',
    '好的，我正在工作中...',
    '了解，让我分析一下。',
  ]
  
  // 添加子任务响应
  activeTask.value.messages.push({ 
    role: 'assistant', 
    content: responses[Math.floor(Math.random() * responses.length)]
  })
  
  // 滚动到底部
  nextTick(() => {
    if (chatRef.value) {
      chatRef.value.scrollTop = chatRef.value.scrollHeight
    }
  })
}

/**
 * 合并任务结果
 * 展示子任务的完成情况
 * @param task - 要合并的任务对象
 */
const mergeTask = (task: Task): void => {
  mergedTask.value = task
  showMergeModal.value = true
}
</script>

<template>
  <!-- 任务管理视图容器 -->
  <div class="tasks-view">
    <!-- 标题栏 -->
    <div class="tasks-header">
      <h2>📋 任务管理</h2>
      <button @click="showCreateModal = true" class="create-btn">
        + 拆分任务
      </button>
    </div>

    <!-- 标签页切换 -->
    <div class="tasks-tabs">
      <button 
        :class="['tab', { active: activeTab === 'list' }]"
        @click="activeTab = 'list'"
      >
        任务列表
      </button>
      <button 
        v-if="activeTask"
        :class="['tab', { active: activeTab === 'chat' }]"
        @click="activeTab = 'chat'"
      >
        对话: {{ activeTask.id.slice(0, 8) }}
      </button>
    </div>

    <!-- 任务列表视图 -->
    <div v-if="activeTab === 'list'" class="tasks-list">
      <!-- 空状态提示 -->
      <div v-if="tasks.length === 0" class="empty-state">
        <p>暂无任务</p>
        <p class="tip">拆分一个大任务开始吧！</p>
      </div>
      
      <!-- 任务卡片 -->
      <div 
        v-for="task in tasks" 
        :key="task.id"
        class="task-card"
        @click="openTaskChat(task)"
      >
        <!-- 任务状态图标 -->
        <div class="task-status">
          <span :class="['status-badge', task.status]">
            {{ task.status === 'completed' ? '✓' : '⏳' }}
          </span>
        </div>
        <!-- 任务信息 -->
        <div class="task-info">
          <h3>{{ task.description.slice(0, 50) }}{{ task.description.length > 50 ? '...' : '' }}</h3>
          <div class="task-meta">
            <span>消息: {{ task.messages?.length || 0 }}</span>
            <span>{{ task.createdAt }}</span>
          </div>
        </div>
        <!-- 合并结果按钮 -->
        <div class="task-actions">
          <button @click.stop="mergeTask(task)" class="merge-btn">
            合并结果
          </button>
        </div>
      </div>
    </div>

    <!-- 子任务对话视图 -->
    <div v-else-if="activeTab === 'chat' && activeTask" class="task-chat">
      <!-- 对话消息列表 -->
      <div class="chat-messages" ref="chatRef">
        <div 
          v-for="(msg, index) in activeTask.messages" 
          :key="index"
          :class="['message', msg.role]"
        >
          <div class="message-content">{{ msg.content }}</div>
        </div>
      </div>
      
      <!-- 对话输入区域 -->
      <div class="chat-input">
        <input 
          v-model="taskInput"
          @keyup.enter="sendToTask"
          placeholder="与子任务对话... (输入 '完成' 结束任务)"
        />
        <button @click="sendToTask">发送</button>
      </div>
    </div>

    <!-- 创建任务弹窗 -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal">
        <h3>拆分大任务</h3>
        <div class="form-group">
          <label>任务描述</label>
          <textarea 
            v-model="newTask.description" 
            placeholder="例如：帮我开发一个 Todo 应用"
            rows="4"
          ></textarea>
        </div>
        <div class="modal-actions">
          <button @click="showCreateModal = false" class="cancel-btn">取消</button>
          <button @click="createTask" class="confirm-btn">拆分任务</button>
        </div>
      </div>
    </div>

    <!-- 合并结果弹窗 -->
    <div v-if="showMergeModal" class="modal-overlay" @click.self="showMergeModal = false">
      <div class="modal">
        <h3>📊 任务合并结果</h3>
        <div class="merge-result">
          <p><strong>任务ID:</strong> {{ mergedTask?.id?.slice(0, 8) }}</p>
          <p><strong>描述:</strong> {{ mergedTask?.description }}</p>
          <p><strong>状态:</strong> {{ mergedTask?.status }}</p>
          <p><strong>消息数:</strong> {{ mergedTask?.messages?.length || 0 }}</p>
        </div>
        <div class="modal-actions">
          <button @click="showMergeModal = false" class="confirm-btn">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/**
 * 任务视图容器样式
 */
.tasks-view {
  padding: 20px;
}

/**
 * 标题栏样式
 */
.tasks-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.tasks-header h2 {
  font-size: 18px;
}

/**
 * 创建按钮样式
 */
.create-btn {
  padding: 10px 20px;
  border: none;
  background: #667eea;
  color: white;
  border-radius: 8px;
  cursor: pointer;
}

/**
 * 标签页容器样式
 */
.tasks-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

/**
 * 标签按钮样式
 */
.tab {
  padding: 8px 16px;
  border: none;
  background: #1e1e2e;
  color: #aaa;
  border-radius: 6px;
  cursor: pointer;
}

.tab.active {
  background: #667eea;
  color: white;
}

/**
 * 任务列表容器样式
 */
.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

/**
 * 空状态样式
 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.empty-state .tip {
  font-size: 12px;
  margin-top: 10px;
}

/**
 * 任务卡片样式
 */
.task-card {
  display: flex;
  align-items: center;
  gap: 15px;
  background: #1e1e2e;
  padding: 20px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.task-card:hover {
  background: #2d2d44;
}

/**
 * 任务状态徽章样式
 */
.task-status .status-badge {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

/* 已完成状态 - 绿色 */
.task-status .status-badge.completed {
  background: #4ade80;
  color: #000;
}

/* 进行中状态 - 橙色 */
.task-status .status-badge.in_progress {
  background: #f59e0b;
  color: #000;
}

/**
 * 任务信息样式
 */
.task-info {
  flex: 1;
}

.task-info h3 {
  font-size: 14px;
  margin-bottom: 8px;
}

/**
 * 任务元信息样式
 */
.task-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #666;
}

/**
 * 合并按钮样式
 */
.merge-btn {
  padding: 8px 16px;
  border: none;
  background: #4ade80;
  color: #000;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}

/* ==================== 子任务对话样式 ==================== */

/**
 * 对话容器样式
 */
.task-chat {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 180px);
}

/**
 * 对话消息列表样式
 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/**
 * 消息样式
 */
.message {
  margin-bottom: 15px;
}

/**
 * 用户消息样式
 */
.message.user {
  text-align: right;
}

/**
 * 消息气泡样式
 */
.message-content {
  display: inline-block;
  max-width: 70%;
  padding: 10px 15px;
  border-radius: 12px;
  background: #1e1e2e;
}

.message.user .message-content {
  background: #2d2d44;
}

/**
 * 对话输入区域样式
 */
.chat-input {
  display: flex;
  gap: 10px;
  padding: 15px 20px;
  border-top: 1px solid #333;
}

/**
 * 对话输入框样式
 */
.chat-input input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #333;
  border-radius: 8px;
  background: #1e1e2e;
  color: white;
}

/**
 * 对话发送按钮样式
 */
.chat-input button {
  padding: 12px 24px;
  border: none;
  background: #667eea;
  color: white;
  border-radius: 8px;
  cursor: pointer;
}

/* ==================== 弹窗样式 ==================== */

/**
 * 弹窗遮罩层样式
 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/**
 * 弹窗容器样式
 */
.modal {
  background: #1e1e2e;
  padding: 30px;
  border-radius: 16px;
  width: 450px;
  max-width: 90%;
}

.modal h3 {
  margin-bottom: 20px;
}

/**
 * 表单组样式
 */
.form-group {
  margin-bottom: 15px;
}

/**
 * 表单标签样式
 */
.form-group label {
  display: block;
  margin-bottom: 5px;
  font-size: 14px;
  color: #aaa;
}

/**
 * 文本域样式
 */
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #333;
  border-radius: 6px;
  background: #0f0f23;
  color: white;
  resize: vertical;
}

/**
 * 操作按钮容器样式
 */
.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

/**
 * 取消按钮样式
 */
.cancel-btn {
  flex: 1;
  padding: 10px;
  border: 1px solid #444;
  background: transparent;
  color: #aaa;
  border-radius: 6px;
  cursor: pointer;
}

/**
 * 确认按钮样式
 */
.confirm-btn {
  flex: 1;
  padding: 10px;
  border: none;
  background: #667eea;
  color: white;
  border-radius: 6px;
  cursor: pointer;
}

/**
 * 合并结果展示区样式
 */
.merge-result {
  background: #0f0f23;
  padding: 15px;
  border-radius: 8px;
}

.merge-result p {
  margin-bottom: 10px;
  font-size: 14px;
}
</style>
