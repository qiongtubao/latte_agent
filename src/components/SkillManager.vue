<script setup lang="ts">
/**
 * 技能触发管理器
 * 处理技能命令的触发和表单显示
 */
import { ref, computed } from 'vue'
import EmailForm from '@/components/email/EmailForm.vue'

/**
 * 技能类型
 */
interface Skill {
  id: string
  name: string
  trigger: string[]
  icon: string
}

/**
 * 可用技能列表
 */
const skills: Skill[] = [
  {
    id: 'send-email',
    name: '发送邮件',
    trigger: ['/发邮件', '/发送邮件', '/send mail', '/email', '发邮件', '发送邮件'],
    icon: '📧'
  }
]

/**
 * 当前触发的技能
 */
const activeSkill = ref<Skill | null>(null)

/**
 * 是否显示技能表单
 */
const showSkillForm = ref(false)

/**
 * 检测输入是否触发技能
 * @param input - 用户输入
 * @returns 触发的技能或 null
 */
const detectSkill = (input: string): Skill | null => {
  const lower = input.toLowerCase()
  
  for (const skill of skills) {
    for (const trigger of skill.trigger) {
      if (lower.includes(trigger.toLowerCase())) {
        return skill
      }
    }
  }
  
  return null
}

/**
 * 触发技能
 * @param input - 用户输入
 * @returns true 如果触发了技能
 */
const triggerSkill = (input: string): boolean => {
  const skill = detectSkill(input)
  
  if (skill) {
    activeSkill.value = skill
    showSkillForm.value = true
    return true
  }
  
  return false
}

/**
 * 处理邮件发送
 */
const handleEmailSend = (data: { to: string; subject: string; content: string; attachments: string[] }) => {
  // 构建命令
  let command = `latte-send-mail --to "${data.to}" --subject "${data.subject}" --content "${data.content}"`
  
  if (data.attachments.length > 0) {
    command += ` --attach "${data.attachments.join('" --attach "')}"`
  }
  
  // 关闭表单
  showSkillForm.value = false
  activeSkill.value = null
  
  // 返回命令，等待确认执行
  return command
}

/**
 * 取消技能
 */
const cancelSkill = () => {
  showSkillForm.value = false
  activeSkill.value = null
}

/**
 * 暴露方法
 */
defineExpose({
  triggerSkill,
  detectSkill
})
</script>

<template>
  <!-- 邮件发送表单 -->
  <EmailForm 
    v-if="showSkillForm && activeSkill?.id === 'send-email'"
    @send="handleEmailSend"
    @cancel="cancelSkill"
  />
</template>
