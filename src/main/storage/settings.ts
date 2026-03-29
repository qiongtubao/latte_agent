/**
 * 应用设置存储模块
 * 负责在主进程中安全地存储和管理用户设置
 * 支持多配置档案（ModelProfile）的保存、切换与管理
 */

import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { ModelProfile } from '@shared/ipc'

/**
 * 应用设置结构
 */
export interface AppSettings {
  /** AI 提供商 */
  aiProvider: string
  /** API 密钥 (加密存储) */
  apiKey: string
  /** 自定义 API 端点 */
  baseUrl: string
  /** 默认模型 */
  defaultModel: string
  /** 最大 token 数 */
  maxTokens: number
  /** 温度参数 */
  temperature: number
  /** 当前激活的档案 ID */
  activeProfileId: string | null
}

/**
 * 档案存储结构（持久化到 profiles.json）
 */
interface ProfilesStore {
  profiles: ModelProfile[]
}

/**
 * 默认设置
 */
const DEFAULT_SETTINGS: AppSettings = {
  aiProvider: 'anthropic',
  apiKey: '',
  baseUrl: '',
  defaultModel: 'claude-sonnet-4-6',
  maxTokens: 4096,
  temperature: 1,
  activeProfileId: null,
}

/**
 * 设置文件名
 */
const SETTINGS_FILE = 'settings.json'

/**
 * 档案文件名
 */
const PROFILES_FILE = 'profiles.json'

/**
 * 获取设置文件路径
 */
function getSettingsPath(): string {
  const userDataPath = app.getPath('userData')
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true })
  }
  return join(userDataPath, SETTINGS_FILE)
}

/**
 * 获取档案文件路径
 */
function getProfilesPath(): string {
  const userDataPath = app.getPath('userData')
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true })
  }
  return join(userDataPath, PROFILES_FILE)
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

// ==================== 档案管理（Profile CRUD）====================

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `profile_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 读取所有档案
 */
export function loadProfiles(): ModelProfile[] {
  const filePath = getProfilesPath()
  try {
    if (!existsSync(filePath)) {
      return []
    }
    const content = readFileSync(filePath, 'utf-8')
    const store = JSON.parse(content) as ProfilesStore
    return store.profiles || []
  } catch {
    return []
  }
}

/**
 * 写入所有档案
 */
function writeProfiles(profiles: ModelProfile[]): void {
  const filePath = getProfilesPath()
  const store: ProfilesStore = { profiles }
  writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf-8')
}

/**
 * 保存档案（新增或更新）
 * 如果 profile.id 已存在则更新，否则新增
 */
export function saveProfile(profile: ModelProfile): ModelProfile {
  const profiles = loadProfiles()
  const now = Date.now()
  const existingIndex = profiles.findIndex((p) => p.id === profile.id)

  if (existingIndex >= 0) {
    // 更新已有档案
    profiles[existingIndex] = { ...profiles[existingIndex], ...profile, updatedAt: now }
  } else {
    // 新增档案，生成 ID
    const newProfile: ModelProfile = {
      ...profile,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    profiles.push(newProfile)
  }

  writeProfiles(profiles)

  // 如果是第一个档案且没有激活档案，自动激活
  const settings = readSettings()
  if (profiles.length === 1 && !settings.activeProfileId) {
    writeSettings({ activeProfileId: profiles[0].id })
  }

  return profiles.find((p) => p.id === (profile.id || profiles[profiles.length - 1].id))!
}

/**
 * 删除档案
 * 如果删除的是当前激活的档案，同时清除激活状态
 */
export function deleteProfile(profileId: string): boolean {
  const profiles = loadProfiles()
  const filtered = profiles.filter((p) => p.id !== profileId)

  if (filtered.length === profiles.length) {
    return false // 档案不存在
  }

  writeProfiles(filtered)

  // 如果删除的是激活档案，清除激活状态
  const settings = readSettings()
  if (settings.activeProfileId === profileId) {
    // 自动激活剩余的第一个档案
    const newActiveId = filtered.length > 0 ? filtered[0].id : null
    writeSettings({ activeProfileId: newActiveId })
  }

  return true
}

/**
 * 激活指定档案
 * 将档案的配置应用到当前设置中
 */
export function activateProfile(profileId: string): boolean {
  const profiles = loadProfiles()
  const profile = profiles.find((p) => p.id === profileId)

  if (!profile) {
    return false
  }

  // 将档案配置同步到应用设置
  writeSettings({
    aiProvider: profile.aiProvider,
    baseUrl: profile.baseUrl,
    defaultModel: profile.defaultModel,
    maxTokens: profile.maxTokens,
    temperature: profile.temperature,
    activeProfileId: profileId,
  })

  return true
}

/**
 * 获取当前激活的档案
 */
export function getActiveProfile(): ModelProfile | null {
  const settings = readSettings()
  if (!settings.activeProfileId) {
    return null
  }
  const profiles = loadProfiles()
  return profiles.find((p) => p.id === settings.activeProfileId) || null
}
