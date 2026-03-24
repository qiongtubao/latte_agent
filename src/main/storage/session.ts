/**
 * 会话数据持久化存储模块
 * 负责在主进程中将会话数据保存到 JSON 文件
 */

import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import type { Session } from '@shared/session'

/**
 * 会话存储目录名
 */
const SESSIONS_DIR = 'sessions'

/**
 * 获取会话存储目录路径
 */
function getSessionsDir(): string {
  const userDataPath = app.getPath('userData')
  const sessionsPath = join(userDataPath, SESSIONS_DIR)
  // 确保目录存在
  if (!existsSync(sessionsPath)) {
    mkdirSync(sessionsPath, { recursive: true })
  }
  return sessionsPath
}

/**
 * 获取单个会话文件路径
 */
function getSessionFilePath(sessionId: string): string {
  return join(getSessionsDir(), `${sessionId}.json`)
}

/**
 * 保存单个会话到 JSON 文件
 */
export function saveSession(session: Session): void {
  const filePath = getSessionFilePath(session.id)
  writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf-8')
}

/**
 * 保存所有会话
 */
export function saveAllSessions(sessions: Session[]): void {
  sessions.forEach(session => saveSession(session))
}

/**
 * 读取单个会话
 */
export function loadSession(sessionId: string): Session | null {
  const filePath = getSessionFilePath(sessionId)
  try {
    if (!existsSync(filePath)) {
      return null
    }
    const content = readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as Session
  } catch {
    return null
  }
}

/**
 * 加载所有历史会话
 */
export function loadAllSessions(): Session[] {
  const sessionsDir = getSessionsDir()
  const sessions: Session[] = []

  try {
    const files = readdirSync(sessionsDir)
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = join(sessionsDir, file)
        try {
          const content = readFileSync(filePath, 'utf-8')
          const session = JSON.parse(content) as Session
          // 验证必要字段存在
          if (session.id && session.title && Array.isArray(session.messages)) {
            sessions.push(session)
          }
        } catch {
          // 跳过无法解析的文件
        }
      }
    }
  } catch {
    // 目录不存在或无法读取，返回空数组
  }

  return sessions
}

/**
 * 删除单个会话文件
 */
export function deleteSession(sessionId: string): boolean {
  const filePath = getSessionFilePath(sessionId)
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath)
      return true
    }
    return false
  } catch {
    return false
  }
}
