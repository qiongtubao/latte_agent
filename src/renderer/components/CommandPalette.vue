<template>
  <!-- 命令面板下拉组件：输入 / 时显示可用命令列表 -->
  <div v-if="visible" class="command-palette" ref="paletteRef">
    <div class="command-list">
      <div
        v-for="(cmd, i) in filteredCommands"
        :key="cmd.path"
        :class="['command-item', { active: i === activeIndex }]"
        @click="selectCommand(cmd)"
        @mouseenter="activeIndex = i"
      >
        <span class="command-name">/{{ cmd.path }}</span>
        <span class="command-desc">{{ cmd.description }}</span>
        <span v-if="cmd.argsHint" class="command-hint">{{ cmd.argsHint }}</span>
      </div>
      <!-- 无匹配命令提示 -->
      <div v-if="filteredCommands.length === 0" class="command-empty">
        无匹配命令
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 命令面板下拉组件
 * 输入 / 时显示可用命令列表，支持键盘选择和鼠标点击
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { commandRegistry, type Command } from '@shared/commands'

const props = defineProps<{
  /** 输入框文本 */
  inputText: string
  /** 是否显示面板 */
  visible: boolean
}>()

const emit = defineEmits<{
  /** 选择命令 */
  select: [command: Command]
  /** 关闭面板 */
  close: []
  /** 请求聚焦输入框 */
  requestFocus: []
}>()

/** 当前高亮索引 */
const activeIndex = ref(0)
/** 面板 DOM 引用 */
const paletteRef = ref<HTMLElement | null>(null)

/** 根据输入文本过滤命令列表 */
const filteredCommands = computed(() => {
  if (!props.inputText.startsWith('/')) return []

  const query = props.inputText.slice(1).toLowerCase()
  const all = commandRegistry.getAll()

  if (!query) return all

  return all.filter(cmd =>
    cmd.path.includes(query) ||
    cmd.description.toLowerCase().includes(query) ||
    cmd.namespace.toLowerCase().includes(query)
  )
})

/** 高亮索引随过滤结果重置 */
watch(filteredCommands, () => {
  if (activeIndex.value >= filteredCommands.value.length) {
    activeIndex.value = Math.max(0, filteredCommands.value.length - 1)
  }
})

/**
 * 选择命令
 */
function selectCommand(cmd: Command): void {
  emit('select', cmd)
}

/**
 * 键盘事件处理（由父组件调用）
 */
function handleKeydown(e: KeyboardEvent): boolean {
  if (!props.visible) return false

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % Math.max(1, filteredCommands.value.length)
    return true
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + filteredCommands.value.length) % Math.max(1, filteredCommands.value.length)
    return true
  }
  if (e.key === 'Enter' && filteredCommands.value.length > 0) {
    e.preventDefault()
    selectCommand(filteredCommands.value[activeIndex.value])
    return true
  }
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
    return true
  }
  if (e.key === 'Tab' && filteredCommands.value.length > 0) {
    e.preventDefault()
    // Tab 自动补全命令路径
    const cmd = filteredCommands.value[activeIndex.value]
    emit('select', cmd)
    return true
  }
  return false
}

// 滚动高亮项到可见区域
watch(activeIndex, () => {
  if (paletteRef.value) {
    const items = paletteRef.value.querySelectorAll('.command-item')
    const activeEl = items[activeIndex.value] as HTMLElement | undefined
    activeEl?.scrollIntoView({ block: 'nearest' })
  }
})

defineExpose({ handleKeydown })
</script>

<style scoped>
/* 命令面板容器 */
.command-palette {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  margin-bottom: 0.3rem;
  background: #16213e;
  border: 1px solid #2a4a6a;
  border-radius: 10px;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.3);
  max-height: 240px;
  overflow-y: auto;
  z-index: 50;
}

/* 命令列表 */
.command-list {
  padding: 0.3rem 0;
}

/* 命令条目 */
.command-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.8rem;
  cursor: pointer;
  transition: background 0.1s;
}

.command-item:hover,
.command-item.active {
  background: #0f3460;
}

/* 命令名称 */
.command-name {
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 0.8rem;
  color: #8ecae6;
  flex-shrink: 0;
  min-width: 120px;
}

/* 命令描述 */
.command-desc {
  font-size: 0.78rem;
  color: #a0a0b0;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 参数提示 */
.command-hint {
  font-size: 0.7rem;
  color: #5a7a6a;
  flex-shrink: 0;
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
}

/* 空提示 */
.command-empty {
  padding: 0.6rem 0.8rem;
  font-size: 0.8rem;
  color: #5a6a7a;
  text-align: center;
}

/* 滚动条 */
.command-palette::-webkit-scrollbar {
  width: 4px;
}
.command-palette::-webkit-scrollbar-track {
  background: transparent;
}
.command-palette::-webkit-scrollbar-thumb {
  background: #2a3a5a;
  border-radius: 2px;
}
</style>
