<script setup lang="ts">
/**
 * 应用主组件
 * 包含顶部标题栏、左侧导航栏、内容区域和命令确认弹窗
 */
import { ref, provide } from 'vue'
import ChatView from './views/ChatView.vue'
import SkillsView from './views/SkillsView.vue'
import TasksView from './views/TasksView.vue'
import TestView from './views/TestView.vue'
import CodeView from './views/CodeView.vue'
import DiagramView from './views/DiagramView.vue'
import MarkdownView from './views/MarkdownView.vue'
import ImageEditorView from './views/ImageEditorView.vue'
import Model3DView from './views/Model3DView.vue'
import AiTextEditorView from './views/AiTextEditorView.vue'
import ConfirmModal from './components/ConfirmModal.vue'

/**
 * 导航标签类型
 */
type TabId = 'chat' | 'skills' | 'tasks' | 'test' | 'code' | 'diagram' | 'markdown' | 'image' | 'model3d' | 'aitext'

/**
 * 导航标签配置
 */
interface Tab {
  id: TabId      // 标签唯一标识
  name: string   // 标签显示名称
  icon: string   // 标签图标
}

/**
 * 当前选中的导航标签
 */
const currentTab = ref<TabId>('chat')

/**
 * 是否显示命令确认弹窗
 */
const showConfirm = ref(false)

/**
 * 待执行的命令
 */
const pendingCommand = ref('')

/**
 * 导航标签列表
 */
const tabs: Tab[] = [
  { id: 'chat', name: '对话', icon: '💬' },
  { id: 'aitext', name: 'AI写作', icon: '✍️' },
  { id: 'code', name: '代码', icon: '💻' },
  { id: 'diagram', name: '图表', icon: '🎨' },
  { id: 'markdown', name: '文档', icon: '📝' },
  { id: 'image', name: '修图', icon: '🖼️' },
  { id: 'model3d', name: '3D', icon: '🎮' },
  { id: 'skills', name: '技能', icon: '📦' },
  { id: 'tasks', name: '任务', icon: '📋' },
  { id: 'test', name: '测试', icon: '🧪' },
]

/**
 * 提供命令确认机制给子组件使用
 * @param command - 需要执行的命令
 */
const requestCommandConfirm = (command: string): void => {
  pendingCommand.value = command
  showConfirm.value = true
}

/**
 * 用户确认执行命令
 */
const executeConfirmed = (): void => {
  showConfirm.value = false
  // 发送自定义事件，通知执行命令
  window.dispatchEvent(new CustomEvent('execute-command', { detail: pendingCommand.value }))
  pendingCommand.value = ''
}

/**
 * 用户取消执行命令
 */
const cancelExecute = (): void => {
  showConfirm.value = false
  pendingCommand.value = ''
}

// 将命令确认函数提供给子组件使用
provide('requestCommandConfirm', requestCommandConfirm)
</script>

<template>
  <!-- 应用容器 -->
  <div class="app-container">
    <!-- 顶部标题栏 -->
    <header class="app-header">
      <h1>🥤 Latte Agent</h1>
      <p>AI 助手 - 本地命令执行 + 技能生成</p>
    </header>
    
    <!-- 主内容区域 -->
    <main class="app-main">
      <!-- 左侧导航栏 -->
      <div class="sidebar">
        <nav class="nav-menu">
          <button 
            v-for="tab in tabs" 
            :key="tab.id"
            :class="['nav-btn', { active: currentTab === tab.id }]"
            @click="currentTab = tab.id"
          >
            {{ tab.icon }} {{ tab.name }}
          </button>
        </nav>
      </div>
      
      <!-- 内容展示区域 -->
      <div class="content">
        <!-- 根据当前标签显示对应组件 -->
        <ChatView v-if="currentTab === 'chat'" />
        <CodeView v-else-if="currentTab === 'code'" />
        <DiagramView v-else-if="currentTab === 'diagram'" />
        <MarkdownView v-else-if="currentTab === 'markdown'" />
        <ImageEditorView v-else-if="currentTab === 'image'" />
        <Model3DView v-else-if="currentTab === 'model3d'" />
        <AiTextEditorView v-else-if="currentTab === 'aitext'" />
        <SkillsView v-else-if="currentTab === 'skills'" />
        <TasksView v-else-if="currentTab === 'tasks'" />
        <TestView v-else-if="currentTab === 'test'" />
      </div>
    </main>

    <!-- 命令确认弹窗：仅在需要确认时显示 -->
    <ConfirmModal 
      v-if="showConfirm"
      :command="pendingCommand"
      @confirm="executeConfirmed"
      @cancel="cancelExecute"
    />
  </div>
</template>

<style>
/**
 * 全局样式重置
 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/**
 * 页面主体样式
 */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #1a1a2e;
  color: #eee;
  height: 100vh;
}

/**
 * 应用容器 - flex 垂直布局
 */
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/**
 * 顶部标题栏样式
 */
.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  text-align: center;
}

.app-header h1 {
  font-size: 28px;
  margin-bottom: 5px;
}

.app-header p {
  opacity: 0.8;
  font-size: 14px;
}

/**
 * 主内容区域 - flex 水平布局
 */
.app-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/**
 * 左侧导航栏样式
 */
.sidebar {
  width: 200px;
  background: #16213e;
  padding: 15px 0;
  overflow-y: auto;
}

/**
 * 导航菜单 - 垂直排列
 */
.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 0 10px;
}

/**
 * 导航按钮样式
 */
.nav-btn {
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: #aaa;
  cursor: pointer;
  border-radius: 8px;
  text-align: left;
  font-size: 13px;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: rgba(255,255,255,0.1);
}

/**
 * 导航按钮激活状态
 */
.nav-btn.active {
  background: #667eea;
  color: white;
}

/**
 * 内容区域样式
 */
.content {
  flex: 1;
  background: #0f0f23;
  overflow: auto;
}
</style>
