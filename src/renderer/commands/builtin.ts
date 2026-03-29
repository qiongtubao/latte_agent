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
  onModelChange: (model: string) => void
): Command[] {
  return [
    {
      path: 'model/list',
      name: '/model/list',
      description: '显示所有可用模型',
      namespace: 'model',
      action: 'list',
      execute: async () => {
        const result = await invoke(IpcChannel.AI_GET_MODELS)
        const models = result.models
        if (models.length === 0) {
          return '当前无可用模型，请先配置 AI 提供商'
        }
        const lines = models.map((m, i) => `  ${i + 1}. ${m}`)
        return `可用模型 (${result.provider}):\n${lines.join('\n')}`
      },
    },
    {
      path: 'model/set',
      name: '/model/set',
      description: '切换默认模型',
      namespace: 'model',
      action: 'set',
      requireArgs: true,
      argsHint: '<model_name>',
      execute: async (args: string) => {
        const modelName = args.trim()
        if (!modelName) return '用法: /model/set <model_name>'

        // 保存模型设置到主进程
        await invoke(IpcChannel.SETTINGS_SET, { defaultModel: modelName })
        onModelChange(modelName)
        return `已切换模型: ${modelName}`
      },
    },
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
    {
      path: 'model/active',
      name: '/model/active',
      description: '查看当前使用的模型',
      namespace: 'model',
      action: 'active',
      execute: async () => {
        const settings = await invoke(IpcChannel.SETTINGS_GET)
        return `当前模型: ${settings.defaultModel || '未设置'}\n当前提供商: ${settings.aiProvider}`
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
  onModelChange: (model: string) => void
  onNewChat: () => void
  onDeleteSession: () => void
}): () => void {
  const cmds = [
    ...createModelCommands(options.onOpenSettings, options.onModelChange),
    ...createHelpCommands(),
    ...createSessionCommands(options.onNewChat, options.onDeleteSession),
  ]
  commandRegistry.registerAll(cmds)

  // 返回注销函数
  return () => {
    cmds.forEach(cmd => commandRegistry.unregister(cmd.path))
  }
}
