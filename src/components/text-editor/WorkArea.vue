<script setup lang="ts">
/**
 * 中间工作区组件
 * 管理多个文本模块的横向排列
 */
import { ref, computed } from 'vue'
import TextModule from './TextModule.vue'

/**
 * Props
 */
defineProps<{
  activeModuleId: string | null
}>()

/**
 * Emits
 */
const emit = defineEmits<{
  (e: 'activate', id: string): void
}>()

/**
 * 文本模块列表
 */
const modules = ref<Array<{
  id: string
  title: string
  content: string
  createdAt: number
}>>([])

/**
 * 模块计数器
 */
let moduleCounter = 0

/**
 * 创建新模块
 */
const createModule = () => {
  moduleCounter++
  const newModule = {
    id: `module-${Date.now()}`,
    title: `文档 ${moduleCounter}`,
    content: '',
    createdAt: Date.now()
  }
  modules.value.push(newModule)
  emit('activate', newModule.id)
  return newModule.id
}

/**
 * 关闭模块
 */
const closeModule = (id: string) => {
  const index = modules.value.findIndex(m => m.id === id)
  if (index > -1) {
    modules.value.splice(index, 1)
  }
}

/**
 * 更新模块内容
 */
const updateModuleContent = (id: string, content: string) => {
  const module = modules.value.find(m => m.id === id)
  if (module) {
    module.content = content
  }
}

/**
 * 更新模块标题
 */
const updateModuleTitle = (id: string, title: string) => {
  const module = modules.value.find(m => m.id === id)
  if (module) {
    module.title = title
  }
}

/**
 * 暴露方法
 */
defineExpose({
  createModule,
  updateModuleContent,
  getModuleContent: (id: string) => modules.value.find(m => m.id === id)?.content || ''
})
</script>

<template>
  <div class="work-area">
    <!-- 空状态提示 -->
    <div v-if="modules.length === 0" class="empty-state">
      <div class="empty-icon">📝</div>
      <p>点击右侧「新建」创建文本模块</p>
      <p class="empty-hint">或直接开始 AI 对话</p>
    </div>
    
    <!-- 模块容器 -->
    <div v-else class="modules-container">
      <TextModule
        v-for="module in modules"
        :key="module.id"
        :id="module.id"
        :title="module.title"
        :content="module.content"
        :is-active="activeModuleId === module.id"
        @close="closeModule(module.id)"
        @activate="emit('activate', module.id)"
        @update:content="updateModuleContent(module.id, $event)"
        @update:title="updateModuleTitle(module.id, $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.work-area {
  flex: 1;
  min-width: 400px;
  overflow-x: auto;
  overflow-y: hidden;
  background: #0f0f23;
}

/* 空状态 */
.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state p {
  margin: 5px 0;
  font-size: 16px;
}

.empty-hint {
  font-size: 13px !important;
  color: #444;
}

/* 模块容器 */
.modules-container {
  display: flex;
  gap: 16px;
  padding: 16px;
  min-width: max-content;
  height: 100%;
}
</style>
