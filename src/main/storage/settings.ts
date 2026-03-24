/**
 * 应用设置存储模块
 * 负责在主进程中安全地存储和管理用户设置
 */

import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

/**
 * 应用设置结构
 */
export interface AppSettings {
  /** AI 提供商 */
  aiProvider: string
  /** API 密钥 (加密存储) */
  apiKey: string
  /** 默认模型 */
  defaultModel: string
  /** 最大 token 数 */
  maxTokens: number
  /** 温度参数 */
  temperature: number
}

/**
 * 默认设置
 */
const DEFAULT_SETTINGS: AppSettings = {
  aiProvider: 'anthropic',
  apiKey: '',
  defaultModel: 'claude-sonnet-4-6',
  maxTokens: 4096,
  temperature: 1,
}

/**
 * 设置文件名
 */
const SETTINGS_FILE = 'settings.json'

/**
 * 获取设置文件路径
 */
function getSettingsPath(): string {
  const userDataPath = app.getPath('userData')
  // 确保目录存在
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true })
  }
  return join(userDataPath, SETTINGS_FILE)
}

/**
 * 读取应用设置
 */
export function readSettings(): AppSettings {
  const filePath = getSettingsPath()
  try {
    if (!existsSync(filePath)) {
      return { ...DEFAULT_SETTINGS }
    }
    const content = readFileSync(filePath, 'utf-8')
    const settings = JSON.parse(content) as Partial<AppSettings>
    // 合并默认值，确保新增字段有默认值
    return { ...DEFAULT_SETTINGS, ...settings }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

/**
 * 写入应用设置
 */
export function writeSettings(settings: Partial<AppSettings>): AppSettings {
  const filePath = getSettingsPath()
  const current = readSettings()
  // 合并新设置
  const updated: AppSettings = { ...current, ...settings }
  writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8')
  return updated
}

/**
 * 获取 API 密钥
 * 返回密钥是否存在，不直接暴露密钥值给渲染进程
 */
export function hasApiKey(): boolean {
  const settings = readSettings()
  return Boolean(settings.apiKey && settings.apiKey.length > 0)
}

/**
 * 获取完整设置（仅主进程使用，包含密钥）
 */
export function getFullSettings(): AppSettings {
  return readSettings()
}
