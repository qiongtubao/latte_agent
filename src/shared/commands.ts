/**
 * 命令注册中心
 * 支持动态注册/销毁斜杠命令，格式为 /namespace/action [args]
 */

/** 命令定义 */
export interface Command {
  /** 命令路径，如 'model/set' */
  path: string
  /** 命令完整名称，如 '/model/set' */
  name: string
  /** 简短描述 */
  description: string
  /** 是否需要参数 */
  requireArgs?: boolean
  /** 参数提示 */
  argsHint?: string
  /** 命名空间 */
  namespace: string
  /** 动作名称 */
  action: string
  /** 执行函数，返回处理结果或消息 */
  execute: (args: string) => Promise<string>
}

/** 命令注册中心（单例） */
class CommandRegistry {
  private commands: Map<string, Command> = new Map()
  private listeners: Set<() => void> = new Set()

  /**
   * 注册命令
   */
  register(command: Command): void {
    this.commands.set(command.path, command)
    this.notifyListeners()
  }

  /**
   * 批量注册命令（同一命名空间下）
   */
  registerAll(commands: Command[]): void {
    commands.forEach(cmd => this.commands.set(cmd.path, cmd))
    this.notifyListeners()
  }

  /**
   * 注销指定路径的命令
   */
  unregister(path: string): boolean {
    const deleted = this.commands.delete(path)
    if (deleted) this.notifyListeners()
    return deleted
  }

  /**
   * 注销整个命名空间下的所有命令
   */
  unregisterNamespace(namespace: string): number {
    let count = 0
    const prefix = namespace + '/'
    this.commands.forEach((_, key) => {
      if (key.startsWith(prefix)) {
        this.commands.delete(key)
        count++
      }
    })
    if (count > 0) this.notifyListeners()
    return count
  }

  /**
   * 获取所有已注册命令
   */
  getAll(): Command[] {
    return Array.from(this.commands.values())
  }

  /**
   * 按命名空间分组获取命令
   */
  getByNamespace(namespace: string): Command[] {
    const prefix = namespace + '/'
    return this.getAll().filter(cmd => cmd.path.startsWith(prefix))
  }

  /**
   * 根据路径获取命令
   */
  get(path: string): Command | undefined {
    return this.commands.get(path)
  }

  /**
   * 解析用户输入的命令字符串
   * 如 "/model/set gpt-4" → { path: 'model/set', args: 'gpt-4' }
   */
  parse(input: string): { path: string; args: string } | null {
    const trimmed = input.trim()
    if (!trimmed.startsWith('/')) return null

    const withoutSlash = trimmed.slice(1)
    const spaceIdx = withoutSlash.indexOf(' ')

    if (spaceIdx === -1) {
      return { path: withoutSlash, args: '' }
    }
    return {
      path: withoutSlash.slice(0, spaceIdx),
      args: withoutSlash.slice(spaceIdx + 1).trim(),
    }
  }

  /**
   * 执行命令
   */
  async execute(input: string): Promise<string> {
    const parsed = this.parse(input)
    if (!parsed) return ''

    const cmd = this.get(parsed.path)
    if (!cmd) {
      return `未知命令: /${parsed.path}\n输入 / 查看所有可用命令`
    }

    if (cmd.requireArgs && !parsed.args) {
      return `${cmd.description}\n用法: /${cmd.path} ${cmd.argsHint || '<args>'}`
    }

    try {
      return await cmd.execute(parsed.args)
    } catch (e) {
      return `命令执行错误: ${(e as Error).message}`
    }
  }

  /**
   * 注册变更监听器
   */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(): void {
    this.listeners.forEach(fn => fn())
  }
}

/** 全局命令注册中心实例 */
export const commandRegistry = new CommandRegistry()
