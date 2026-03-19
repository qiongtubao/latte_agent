<script setup lang="ts">
/**
 * 命令确认弹窗组件
 * 在执行危险操作前要求用户确认
 */

// 定义组件 Props - 接收要执行的命令
defineProps<{
  command: string    // 待执行的命令内容
}>()

// 定义组件事件
defineEmits<{
  (e: 'confirm'): void    // 用户确认执行
  (e: 'cancel'): void     // 用户取消执行
}>()
</script>

<template>
  <!-- 弹窗遮罩层 -->
  <div class="modal-overlay">
    <!-- 弹窗主体 -->
    <div class="modal">
      <!-- 警告图标 -->
      <div class="modal-icon">⚠️</div>
      
      <!-- 标题 -->
      <h3>确认执行命令</h3>
      
      <!-- 命令展示区域 -->
      <div class="command-box">
        <code>{{ command }}</code>
      </div>
      
      <!-- 警告提示 -->
      <p class="warning">此命令将在你的本地系统上执行，请确认是否执行？</p>
      
      <!-- 操作按钮 -->
      <div class="modal-actions">
        <button @click="$emit('cancel')" class="cancel-btn">取消</button>
        <button @click="$emit('confirm')" class="confirm-btn">执行</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/**
 * 弹窗遮罩层样式
 * 全屏半透明黑色背景
 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;  /* 确保在其他内容之上 */
}

/**
 * 弹窗主体容器样式
 */
.modal {
  background: #1e1e2e;
  padding: 30px;
  border-radius: 16px;
  width: 450px;
  max-width: 90%;
  text-align: center;
}

/**
 * 警告图标样式
 */
.modal-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

/**
 * 弹窗标题样式
 */
.modal h3 {
  margin-bottom: 20px;
  font-size: 18px;
}

/**
 * 命令展示框样式
 */
.command-box {
  background: #0f0f23;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 15px;
}

/**
 * 命令代码样式
 */
.command-box code {
  color: #4ade80;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 14px;
  word-break: break-all;  /* 长命令换行显示 */
}

/**
 * 警告提示文字样式
 */
.warning {
  color: #f59e0b;
  font-size: 14px;
  margin-bottom: 25px;
}

/**
 * 操作按钮容器样式
 */
.modal-actions {
  display: flex;
  gap: 15px;
}

/**
 * 取消和确认按钮通用样式
 */
.cancel-btn, .confirm-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;  /* 添加过渡效果 */
}

/**
 * 取消按钮样式
 */
.cancel-btn {
  background: #333;
  color: #aaa;
}

.cancel-btn:hover {
  background: #444;
}

/**
 * 确认/执行按钮样式
 */
.confirm-btn {
  background: #ff4757;
  color: white;
}

.confirm-btn:hover {
  background: #ff6b81;
}
</style>
