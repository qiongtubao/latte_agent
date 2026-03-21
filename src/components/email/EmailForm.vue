<script setup lang="ts">
/**
 * 邮件发送表单组件
 * 集成 AI 文本编辑器
 */
import { ref, computed } from 'vue'
import AiTextEditorModal from './AiTextEditorModal.vue'

/**
 * Emits
 */
const emit = defineEmits<{
  (e: 'send', data: { to: string; subject: string; content: string; attachments: string[] }): void
  (e: 'cancel'): void
}>()

/**
 * 收件人列表（历史记录）
 */
const emailHistory = ref<string[]>([
  'user@example.com',
  'colleague@company.com'
])

/**
 * 新增邮箱输入
 */
const newEmail = ref('')

/**
 * 是否显示新增邮箱输入
 */
const showNewEmail = ref(false)

/**
 * 收件人
 */
const recipient = ref('')

/**
 * 邮件主题
 */
const subject = ref('')

/**
 * 邮件内容
 */
const content = ref('')

/**
 * 附件列表
 */
const attachments = ref<string[]>([])

/**
 * 是否显示 AI 编辑器
 */
const showAiEditor = ref(false)

/**
 * 表单是否有效
 */
const isValid = computed(() => {
  return recipient.value.trim() && subject.value.trim() && content.value.trim()
})

/**
 * 添加新邮箱到历史
 */
const addEmailToHistory = () => {
  const email = newEmail.value.trim()
  if (email && !emailHistory.value.includes(email)) {
    emailHistory.value.unshift(email)
    // 保存到本地存储
    localStorage.setItem('emailHistory', JSON.stringify(emailHistory.value))
  }
  newEmail.value = ''
  showNewEmail.value = false
}

/**
 * 加载历史邮箱
 */
const loadEmailHistory = () => {
  const saved = localStorage.getItem('emailHistory')
  if (saved) {
    try {
      emailHistory.value = JSON.parse(saved)
    } catch (e) {
      console.error('加载邮箱历史失败:', e)
    }
  }
}

/**
 * 打开 AI 编辑器
 */
const openAiEditor = () => {
  showAiEditor.value = true
}

/**
 * AI 编辑器确认
 */
const handleAiConfirm = (text: string) => {
  content.value = text
  showAiEditor.value = false
}

/**
 * AI 工具（润色、翻译等）
 */
const aiTools = [
  { id: 'polish', name: '✨ 润色', icon: '✨' },
  { id: 'translate', name: '🌐 翻译', icon: '🌐' },
  { id: 'summary', name: '📝 总结', icon: '📝' },
  { id: 'expand', name: '📏 扩写', icon: '📏' }
]

/**
 * 处理 AI 工具点击
 */
const handleAiTool = async (toolId: string) => {
  if (!content.value.trim()) return
  
  // 调用 AI 服务处理
  // 这里先模拟实现
  console.log('AI 工具:', toolId, '内容:', content.value)
}

/**
 * 选择附件
 */
const selectAttachment = () => {
  // 创建文件输入
  const input = document.createElement('input')
  input.type = 'file'
  input.multiple = true
  input.onchange = (e) => {
    const files = (e.target as HTMLInputElement).files
    if (files) {
      for (let i = 0; i < files.length; i++) {
        attachments.value.push(files[i].name)
      }
    }
  }
  input.click()
}

/**
 * 移除附件
 */
const removeAttachment = (index: number) => {
  attachments.value.splice(index, 1)
}

/**
 * 发送邮件
 */
const sendEmail = () => {
  if (!isValid.value) return
  
  emit('send', {
    to: recipient.value.trim(),
    subject: subject.value.trim(),
    content: content.value,
    attachments: [...attachments.value]
  })
}

/**
 * 取消
 */
const cancel = () => {
  emit('cancel')
}

// 加载历史
loadEmailHistory()
</script>

<template>
  <div class="email-form">
    <!-- 标题 -->
    <div class="form-header">
      <h2>📧 发送邮件</h2>
      <button class="close-btn" @click="cancel">×</button>
    </div>
    
    <!-- 表单内容 -->
    <div class="form-body">
      <!-- 收件人 -->
      <div class="form-field">
        <label>收件人邮箱 <span class="required">*</span></label>
        
        <div class="recipient-input">
          <select v-model="recipient" class="email-select">
            <option value="" disabled>选择或输入邮箱地址</option>
            <option v-for="email in emailHistory" :key="email" :value="email">
              {{ email }}
            </option>
          </select>
          <button class="add-btn" @click="showNewEmail = !showNewEmail">
            {{ showNewEmail ? '×' : '+' }}
          </button>
        </div>
        
        <!-- 新增邮箱输入 -->
        <div v-if="showNewEmail" class="new-email-input">
          <input 
            v-model="newEmail" 
            type="email" 
            placeholder="输入新邮箱地址"
            @keyup.enter="addEmailToHistory"
          />
          <button @click="addEmailToHistory" class="confirm-btn">添加</button>
        </div>
      </div>
      
      <!-- 邮件主题 -->
      <div class="form-field">
        <label>邮件主题 <span class="required">*</span></label>
        <input 
          v-model="subject" 
          type="text" 
          placeholder="请输入邮件主题"
          class="text-input"
        />
      </div>
      
      <!-- 邮件内容 -->
      <div class="form-field">
        <label>邮件内容 <span class="required">*</span></label>
        
        <!-- AI 工具栏 -->
        <div class="ai-toolbar">
          <button 
            v-for="tool in aiTools" 
            :key="tool.id"
            class="ai-tool-btn"
            @click="handleAiTool(tool.id)"
            :disabled="!content.trim()"
            :title="tool.name"
          >
            {{ tool.icon }}
          </button>
          <button class="ai-editor-btn" @click="openAiEditor">
            📝 AI 编辑器
          </button>
        </div>
        
        <!-- 内容显示/编辑 -->
        <div class="content-area">
          <textarea 
            v-model="content" 
            placeholder="点击上方「AI 编辑器」或直接输入内容..."
            rows="8"
          ></textarea>
        </div>
        
        <!-- 内容统计 -->
        <div class="content-stats">
          <span>{{ content.length }} 字符</span>
          <span>{{ content.split(/\s+/).filter(w => w).length }} 词</span>
        </div>
      </div>
      
      <!-- 附件 -->
      <div class="form-field">
        <label>附件</label>
        <div class="attachments">
          <button class="attach-btn" @click="selectAttachment">
            ➕ 添加附件
          </button>
          
          <div v-if="attachments.length > 0" class="attachment-list">
            <div v-for="(file, index) in attachments" :key="index" class="attachment-item">
              <span class="file-icon">📎</span>
              <span class="file-name">{{ file }}</span>
              <button class="remove-btn" @click="removeAttachment(index)">×</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 底部按钮 -->
    <div class="form-footer">
      <button class="cancel-btn" @click="cancel">取消</button>
      <button 
        class="send-btn" 
        @click="sendEmail"
        :disabled="!isValid"
      >
        📤 发送邮件
      </button>
    </div>
    
    <!-- AI 编辑器弹窗 -->
    <AiTextEditorModal 
      v-if="showAiEditor"
      :initial-content="content"
      @confirm="handleAiConfirm"
      @cancel="showAiEditor = false"
    />
  </div>
</template>

<style scoped>
.email-form {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e2e;
  border-radius: 12px;
  overflow: hidden;
}

/* 头部 */
.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.form-header h2 {
  margin: 0;
  font-size: 18px;
  color: white;
}

.close-btn {
  width: 32px;
  height: 32px;
  background: rgba(255,255,255,0.2);
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 20px;
  cursor: pointer;
}

.close-btn:hover {
  background: rgba(255,255,255,0.3);
}

/* 表单主体 */
.form-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.form-field {
  margin-bottom: 20px;
}

.form-field label {
  display: block;
  font-size: 13px;
  color: #888;
  margin-bottom: 8px;
}

.required {
  color: #ff4757;
}

/* 收件人 */
.recipient-input {
  display: flex;
  gap: 8px;
}

.email-select {
  flex: 1;
  padding: 10px 12px;
  background: #0f0f23;
  border: 1px solid #333;
  border-radius: 8px;
  color: white;
  font-size: 14px;
}

.add-btn {
  width: 40px;
  background: #333;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 18px;
  cursor: pointer;
}

.add-btn:hover {
  background: #444;
}

.new-email-input {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.new-email-input input {
  flex: 1;
  padding: 8px 12px;
  background: #0f0f23;
  border: 1px solid #667eea;
  border-radius: 6px;
  color: white;
}

.confirm-btn {
  padding: 8px 16px;
  background: #667eea;
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
}

/* 文本输入 */
.text-input {
  width: 100%;
  padding: 10px 12px;
  background: #0f0f23;
  border: 1px solid #333;
  border-radius: 8px;
  color: white;
  font-size: 14px;
}

.text-input:focus {
  outline: none;
  border-color: #667eea;
}

/* AI 工具栏 */
.ai-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.ai-tool-btn {
  padding: 6px 12px;
  background: #0f0f23;
  border: 1px solid #333;
  border-radius: 6px;
  color: #888;
  font-size: 14px;
  cursor: pointer;
}

.ai-tool-btn:hover:not(:disabled) {
  background: #2d2d44;
  color: white;
}

.ai-tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-editor-btn {
  padding: 6px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 13px;
  cursor: pointer;
  margin-left: auto;
}

/* 内容区域 */
.content-area textarea {
  width: 100%;
  padding: 12px;
  background: #0f0f23;
  border: 1px solid #333;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  font-family: inherit;
}

.content-area textarea:focus {
  outline: none;
  border-color: #667eea;
}

.content-stats {
  display: flex;
  gap: 15px;
  margin-top: 6px;
  font-size: 11px;
  color: #666;
}

/* 附件 */
.attachments {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attach-btn {
  padding: 10px;
  background: #0f0f23;
  border: 1px dashed #444;
  border-radius: 8px;
  color: #888;
  cursor: pointer;
}

.attach-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #0f0f23;
  border-radius: 6px;
}

.file-icon {
  font-size: 14px;
}

.file-name {
  flex: 1;
  font-size: 13px;
  color: #aaa;
}

.remove-btn {
  width: 20px;
  height: 20px;
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
}

.remove-btn:hover {
  color: #ff4757;
}

/* 底部按钮 */
.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #333;
}

.cancel-btn {
  padding: 10px 20px;
  background: #333;
  border: none;
  border-radius: 8px;
  color: #aaa;
  cursor: pointer;
}

.send-btn {
  padding: 10px 24px;
  background: #4ade80;
  border: none;
  border-radius: 8px;
  color: #000;
  font-weight: 500;
  cursor: pointer;
}

.send-btn:disabled {
  background: #333;
  color: #666;
  cursor: not-allowed;
}
</style>
