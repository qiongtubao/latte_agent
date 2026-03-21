<script setup lang="ts">
/**
 * 模型选择器组件
 */
import { ref, onMounted } from 'vue'

/**
 * Props
 */
defineProps<{
  selected: string
}>()

/**
 * Emits
 */
const emit = defineEmits<{
  (e: 'change', model: string): void
}>()

/**
 * 可用模型列表
 */
const models = ref<Array<{
  id: string
  name: string
  provider: string
}>>([])

/**
 * 加载 Ollama 模型
 */
const loadModels = async () => {
  try {
    const res = await fetch('http://localhost:11434/api/tags')
    const data = await res.json()
    models.value = data.models.map((m: any) => ({
      id: m.name,
      name: m.name,
      provider: 'Ollama'
    }))
    
    if (models.value.length === 0) {
      // 默认模型
      models.value = [
        { id: 'qwen3.5:35b', name: 'Qwen 3.5 35B', provider: 'Ollama' },
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' }
      ]
    }
  } catch (error) {
    // 使用默认模型
    models.value = [
      { id: 'qwen3.5:35b', name: 'Qwen 3.5 35B', provider: 'Ollama' },
      { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' }
    ]
  }
}

/**
 * 处理选择变更
 */
const handleChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('change', target.value)
}

onMounted(() => {
  loadModels()
})
</script>

<template>
  <div class="model-selector">
    <select :value="selected" @change="handleChange">
      <option 
        v-for="model in models" 
        :key="model.id" 
        :value="model.id"
      >
        {{ model.name }}
      </option>
    </select>
    <span class="provider-badge" v-if="models.find(m => m.id === selected)?.provider">
      {{ models.find(m => m.id === selected)?.provider }}
    </span>
  </div>
</template>

<style scoped>
.model-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-selector select {
  flex: 1;
  padding: 8px 12px;
  background: #0f0f23;
  border: 1px solid #333;
  border-radius: 6px;
  color: white;
  font-size: 13px;
  cursor: pointer;
}

.model-selector select:focus {
  outline: none;
  border-color: #667eea;
}

.provider-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: #333;
  border-radius: 4px;
  color: #888;
}
</style>
