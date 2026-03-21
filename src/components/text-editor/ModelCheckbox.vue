<script setup lang="ts">
/**
 * 模型多选组件
 */
defineProps<{
  models: Array<{
    id: string
    name: string
    provider: string
  }>
  selected: string[]
}>()

const emit = defineEmits<{
  (e: 'toggle', modelId: string): void
}>()
</script>

<template>
  <div class="model-checkbox">
    <label 
      v-for="model in models" 
      :key="model.id"
      class="model-item"
    >
      <input 
        type="checkbox"
        :checked="selected.includes(model.id)"
        @change="emit('toggle', model.id)"
      />
      <span class="model-name">{{ model.name }}</span>
      <span class="model-provider">{{ model.provider }}</span>
    </label>
  </div>
</template>

<style scoped>
.model-checkbox {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.model-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: #0f0f23;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}

.model-item:hover {
  background: #1a1a2e;
}

.model-item input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: #667eea;
}

.model-name {
  flex: 1;
  color: #ddd;
}

.model-provider {
  font-size: 10px;
  color: #666;
}
</style>
