/**
 * 内置命令注册
 * 在 ChatWindow 中初始化时注册，提供模型管理等基础命令
 */

import { commandRegistry, type Command } from '@shared/commands'
import { invoke } from '../ipc/client'
import { IpcChannel } from '@shared/ipc'

/** 命令执行结果（作为系统消息显示在对话中） */
export interface CommandResult {
  /** 是否为系统消息（显示为提示而非对话） */
  isSystem: boolean
  /** 消息内容 */
  content: string
}

/**
 * 创建模型管理相关命令
 */
export function createModelCommands(
  onOpenSettings: () => void,
): Command[] {
  return [
    {
      path: 'model/add',
      name: '/model/add',
      description: '打开设置页面添加新模型配置',
      namespace: 'model',
      action: 'add',
      execute: async () => {
        onOpenSettings()
        return '已打开设置页面，请在模型配置中添加新模型'
      },
    },
  ]
}

/**
 * 创建帮助命令
 */
export function createHelpCommands(): Command[] {
  return [
    {
      path: 'help',
      name: '/help',
      description: '显示所有可用命令',
      namespace: '',
      action: 'help',
      execute: async () => {
        const all = commandRegistry.getAll()
        // 按命名空间分组
        const groups = new Map<string, Command[]>()
        all.forEach(cmd => {
          const ns = cmd.namespace || 'general'
          if (!groups.has(ns)) groups.set(ns, [])
          groups.get(ns)!.push(cmd)
        })

        const lines: string[] = ['可用命令:']
        groups.forEach((cmds, ns) => {
          lines.push(`\n[${ns}]`)
          cmds.forEach(cmd => {
            const hint = cmd.argsHint ? ` ${cmd.argsHint}` : ''
            lines.push(`  /${cmd.path}${hint}  -  ${cmd.description}`)
          })
        })
        return lines.join('\n')
      },
    },
  ]
}

/**
 * 创建会话管理命令
 */
export function createSessionCommands(
  onNewChat: () => void,
  onDeleteSession: () => void
): Command[] {
  return [
    {
      path: 'session/new',
      name: '/session/new',
      description: '新建对话',
      namespace: 'session',
      action: 'new',
      execute: async () => {
        onNewChat()
        return '已创建新对话'
      },
    },
    {
      path: 'session/clear',
      name: '/session/clear',
      description: '清空当前对话消息',
      namespace: 'session',
      action: 'clear',
      execute: async () => {
        return '提示: 点击消息下方的 × 按钮可删除单条消息'
      },
    },
  ]
}

/**
 * 注册所有内置命令，返回注销函数
 */
export function registerBuiltinCommands(options: {
  onOpenSettings: () => void
  onNewChat: () => void
  onDeleteSession: () => void
}): () => void {
  const cmds = [
    ...createModelCommands(options.onOpenSettings),
    ...createHelpCommands(),
    ...createSessionCommands(options.onNewChat, options.onDeleteSession),
  ]
  commandRegistry.registerAll(cmds)

  // 返回注销函数
  return () => {
    cmds.forEach(cmd => commandRegistry.unregister(cmd.path))
  }
}
