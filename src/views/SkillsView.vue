<script setup lang="ts">
/**
 * 技能管理视图组件
 * 实现技能的创建、列表展示、运行和删除功能
 */
import { ref, inject } from 'vue'

/**
 * 技能参数类型定义
 */
interface Parameter {
  name: string       // 参数名称
  default?: string   // 默认值
}

/**
 * 技能类型定义
 */
interface Skill {
  id: number                     // 技能唯一标识
  name: string                   // 技能名称
  description: string            // 技能描述
  command: string                // 命令模板（支持 ${参数名} 变量替换）
  parameters: Parameter[]        // 参数列表
  createdAt: string              // 创建时间
}

/**
 * 技能列表数据
 */
const skills = ref<Skill[]>([
  { 
    id: 1, 
    name: 'hello', 
    description: '打招呼技能',
    command: 'echo "Hello, ${name}!"',
    parameters: [{ name: 'name', default: 'World' }],
    createdAt: '2026-03-19'
  }
])

/**
 * 是否显示创建技能弹窗
 */
const showCreateModal = ref(false)

/**
 * 新技能表单数据
 */
const newSkill = ref({ name: '', description: '', command: '' })

/**
 * 注入命令确认函数（从父组件提供）
 */
const requestCommandConfirm = inject<(command: string) => void>('requestCommandConfirm')

/**
 * 创建新技能
 * 从命令模板中自动提取参数
 */
const createSkill = (): void => {
  // 验证必填字段
  if (!newSkill.value.name || !newSkill.value.command) return
  
  // 从命令模板中提取参数（匹配 ${参数名} 模式）
  const params: Parameter[] = []
  const paramMatches = newSkill.value.command.match(/\$\{([^}]+)\}/g)
  if (paramMatches) {
    paramMatches.forEach((p: string) => {
      params.push({ name: p.replace(/[${}]/g, '') })
    })
  }
  
  // 添加新技能到列表
  skills.value.push({
    id: Date.now(),
    name: newSkill.value.name,
    description: newSkill.value.description,
    command: newSkill.value.command,
    parameters: params,
    createdAt: new Date().toISOString().split('T')[0] as string
  })
  
  // 重置表单并关闭弹窗
  showCreateModal.value = false
  newSkill.value = { name: '', description: '', command: '' }
}

/**
 * 运行指定技能
 * 将命令模板中的参数替换为默认值，然后请求执行确认
 * @param skill - 要运行的技能对象
 */
const runSkill = (skill: Skill): void => {
  let command = skill.command
  // 用默认值替换参数占位符
  skill.parameters?.forEach(p => {
    command = command.replace(`\${${p.name}}`, p.default || 'value')
  })
  // 请求用户确认执行
  if (requestCommandConfirm) {
    requestCommandConfirm(command)
  }
}

/**
 * 编辑技能（占位功能）
 * @param skill - 要编辑的技能对象
 */
const editSkill = (skill: Skill): void => {
  console.log('Edit:', skill)
}

/**
 * 删除技能
 * 弹出确认框，确认后从列表中移除
 * @param skill - 要删除的技能对象
 */
const deleteSkill = (skill: Skill): void => {
  if (confirm(`确定删除技能 "${skill.name}" 吗？`)) {
    skills.value = skills.value.filter(s => s.id !== skill.id)
  }
}
</script>

<template>
  <!-- 技能管理视图容器 -->
  <div class="skills-view">
    <!-- 标题栏 -->
    <div class="skills-header">
      <h2>📦 技能管理</h2>
      <button @click="showCreateModal = true" class="create-btn">
        + 创建技能
      </button>
    </div>
    
    <!-- 技能列表 -->
    <div class="skills-list">
      <!-- 空状态提示 -->
      <div v-if="skills.length === 0" class="empty-state">
        <p>暂无技能</p>
        <p class="tip">创建你的第一个技能吧！</p>
      </div>
      
      <!-- 技能卡片 -->
      <div 
        v-for="skill in skills" 
        :key="skill.id"
        class="skill-card"
      >
        <!-- 技能信息 -->
        <div class="skill-info">
          <h3>{{ skill.name }}</h3>
          <p>{{ skill.description }}</p>
          <div class="skill-meta">
            <!-- 显示参数列表 -->
            <span v-if="skill.parameters?.length">
              参数: {{ skill.parameters.map(p => p.name).join(', ') }}
            </span>
            <span class="date">创建于 {{ skill.createdAt }}</span>
          </div>
        </div>
        <!-- 操作按钮 -->
        <div class="skill-actions">
          <button @click="runSkill(skill)" class="run-btn">▶ 运行</button>
          <button @click="editSkill(skill)" class="edit-btn">✏️</button>
          <button @click="deleteSkill(skill)" class="delete-btn">🗑️</button>
        </div>
      </div>
    </div>

    <!-- 创建技能弹窗 -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal">
        <h3>创建新技能</h3>
        <!-- 技能名称 -->
        <div class="form-group">
          <label>技能名称</label>
          <input v-model="newSkill.name" placeholder="例如: hello" />
        </div>
        <!-- 技能描述 -->
        <div class="form-group">
          <label>描述</label>
          <input v-model="newSkill.description" placeholder="技能功能描述" />
        </div>
        <!-- 命令模板 -->
        <div class="form-group">
          <label>命令模板</label>
          <input v-model="newSkill.command" placeholder="例如: echo 'Hello ${name}'" />
          <span class="hint">使用 ${参数名} 表示可替换参数</span>
        </div>
        <!-- 操作按钮 -->
        <div class="modal-actions">
          <button @click="showCreateModal = false" class="cancel-btn">取消</button>
          <button @click="createSkill" class="confirm-btn">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/**
 * 技能视图容器样式
 */
.skills-view {
  padding: 20px;
}

/**
 * 标题栏样式
 */
.skills-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.skills-header h2 {
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
 * 技能列表容器样式
 */
.skills-list {
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
 * 技能卡片样式
 */
.skill-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #1e1e2e;
  padding: 20px;
  border-radius: 12px;
}

/**
 * 技能名称样式
 */
.skill-info h3 {
  font-size: 16px;
  margin-bottom: 5px;
  color: #4ade80;
}

/**
 * 技能描述样式
 */
.skill-info p {
  font-size: 14px;
  color: #aaa;
  margin-bottom: 10px;
}

/**
 * 技能元信息样式
 */
.skill-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #666;
}

/**
 * 操作按钮容器样式
 */
.skill-actions {
  display: flex;
  gap: 10px;
}

/**
 * 操作按钮通用样式
 */
.skill-actions button {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

/**
 * 运行按钮样式
 */
.run-btn {
  background: #667eea;
  color: white;
}

/**
 * 编辑按钮样式
 */
.edit-btn {
  background: #444;
  color: white;
}

/**
 * 删除按钮样式
 */
.delete-btn {
  background: #ff4757;
  color: white;
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
  width: 400px;
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
 * 表单输入框样式
 */
.form-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #333;
  border-radius: 6px;
  background: #0f0f23;
  color: white;
}

/**
 * 提示文字样式
 */
.form-group .hint {
  display: block;
  font-size: 12px;
  color: #666;
  margin-top: 5px;
}

/**
 * 弹窗操作按钮容器样式
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
</style>
