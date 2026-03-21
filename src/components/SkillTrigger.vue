<script setup lang="ts">
/**
 * 命令确认弹窗组件
 */
defineProps<{
  command: string
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <div class="modal-overlay" @click.self="emit('cancel')">
    <div class="modal-content">
      <!-- 警告图标 -->
      <div class="modal-icon">⚠️</div>
      
      <!-- 标题 -->
      <h3>确认执行命令</h3>
      
      <!-- 命令显示 -->
      <div class="command-box">
        <code>{{ command }}</code>
      </div>
      
      <!-- 提示 -->
      <p class="warning">此命令将在本地执行，是否继续？</p>
      
      <!-- 按钮 -->
      <div class="modal-actions">
        <button class="btn-cancel" @click="emit('cancel')">
          取消
        </button>
        <button class="btn-confirm" @click="emit('confirm')">
          确认执行
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #1e1e2e;
  border-radius: 16px;
  padding: 30px;
  max-width: 500px;
  width: 90%;
  text-align: center;
}

.modal-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.modal-content h3 {
  font-size: 20px;
  margin: 0 0 20px;
  color: #fff;
}

.command-box {
  background: #0f0f23;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  text-align: left;
  overflow-x: auto;
}

.command-box code {
  color: #4ade80;
  font-family: monospace;
  font-size: 13px;
  word-break: break-all;
}

.warning {
  color: #f59e0b;
  font-size: 14px;
  margin-bottom: 25px;
}

.modal-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.btn-cancel, .btn-confirm {
  padding: 12px 30px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.btn-cancel {
  background: #333;
  color: #aaa;
}

.btn-cancel:hover {
  background: #444;
}

.btn-confirm {
  background: #4ade80;
  color: #000;
  font-weight: 500;
}

.btn-confirm:hover {
  background: #22c55e;
}
</style>
