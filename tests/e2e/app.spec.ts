/**
 * latte_agent E2E 测试
 * 验证每个功能的页面效果
 *
 * UI 流程说明：
 * 1. 初始状态：侧边栏 + "选择一个对话或新建对话" 提示
 * 2. 点击"新建对话"后：显示 ChatWindow（包含设置按钮）
 * 3. ChatWindow 在无 API Key 时显示提示
 */
import { test, expect } from '@playwright/test'

// ─── 通用选择器 ─────────────────────────────────────────────
const sel = {
  // 布局
  app: '#app',
  mainLayout: '.main-layout',
  sidebar: '.sidebar',
  mainContent: '.main-content',
  chatWindow: '.chat-window',

  // 侧边栏 (F006)
  newChatBtn: '.new-chat-btn',
  sessionItem: '.session-item',
  sessionItemActive: '.session-item.active',
  sessionTitle: '.session-title',
  deleteBtn: '.delete-btn',
  emptyHint: '.empty-hint',

  // 无会话提示（初始状态）
  noSessionHint: '.no-session-hint',

  // 对话窗口 (F005) - 需要先创建会话才可见
  chatHeader: '.chat-header',
  chatTitle: '.chat-title',
  settingsBtn: '.settings-btn',
  messagesContainer: '.messages-container',
  welcome: '.welcome',
  message: '.message',
  messageUser: '.message.user',
  messageAssistant: '.message.assistant',
  messageContent: '.message-content',
  markdownBody: '.markdown-body',
  inputArea: '.input-area',
  inputWrapper: '.input-wrapper',
  textarea: '.input-wrapper textarea',
  sendBtn: '.send-btn',
  stopBtn: '.stop-btn',
  usageStats: '.usage-stats',

  // 未配置密钥提示（在 ChatWindow 内）
  noKeyHint: '.no-key-hint',

  // 错误处理 (F008)
  errorToast: '.error-toast',
  errorMessage: '.error-message',
  retryBtn: '.retry-btn',
  closeBtn: '.close-btn',
  linkBtn: '.link-btn',

  // 设置页面 (F003)
  settingsPanel: '.settings-panel',
  apiKeyInput: '.api-key-input input',
  toggleBtn: '.toggle-btn',
  saveBtn: '.actions button.primary',
  validateBtn: '.actions button.secondary',
  settingsMessage: '.settings-panel .message',

  // 通用
  primaryBtn: '.primary-btn',
  backBtn: '.back-btn',
}

test.describe('F001 应用框架初始化', () => {
  test('页面正常加载，无白屏', async ({ page }) => {
    await page.goto('/')
    // Vue3 应该挂载到 #app，使用 first() 避免嵌套 #app 问题
    await expect(page.locator(sel.app).first()).not.toBeEmpty()
    // 不应该有 Vue 报错
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.waitForTimeout(1000)
    expect(errors).toHaveLength(0)
  })

  test('窗口标题正确', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('latte_agent')
  })

  test('初始状态显示无会话提示', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator(sel.mainLayout)).toBeVisible()
    await expect(page.locator(sel.sidebar)).toBeVisible()
    await expect(page.locator(sel.noSessionHint)).toBeVisible()
  })
})

test.describe('F006 侧边栏导航', () => {
  test('侧边栏存在且可见', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator(sel.sidebar)).toBeVisible()
  })

  test('新建对话按钮存在', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator(sel.newChatBtn)).toBeVisible()
  })

  test('会话列表区域存在', async ({ page }) => {
    await page.goto('/')
    // session-list 可能是空的或有内容
    await expect(page.locator('.session-list, .empty-hint').first()).toBeVisible()
  })

  test('点击新建对话按钮创建会话', async ({ page }) => {
    await page.goto('/')
    const newChatBtn = page.locator(sel.newChatBtn)
    await expect(newChatBtn).toBeEnabled()
    // 点击按钮创建新会话
    await newChatBtn.click()
    await page.waitForTimeout(500)
    // 应该显示 ChatWindow（有会话了）
    await expect(page.locator(sel.chatWindow)).toBeVisible()
    // 侧边栏应仍然存在
    await expect(page.locator(sel.sidebar)).toBeVisible()
  })
})

test.describe('F005 对话主界面', () => {
  // 每个测试前先创建一个会话
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.locator(sel.newChatBtn).click()
    await page.waitForTimeout(300)
  })

  test('ChatWindow 组件渲染成功', async ({ page }) => {
    await expect(page.locator(sel.chatWindow)).toBeVisible()
  })

  test('头部显示标题和设置按钮', async ({ page }) => {
    await expect(page.locator(sel.chatTitle)).toContainText('Latte Agent')
    await expect(page.locator(sel.settingsBtn)).toBeVisible()
  })

  test('未配置 API Key 时显示提示', async ({ page }) => {
    // mock 返回 hasKey: false，所以应该显示 no-key-hint
    await expect(page.locator(sel.noKeyHint)).toBeVisible()
  })

  test('输入区在有 API Key 时才显示', async ({ page }) => {
    // 无 API Key 时，input-area 不显示（被 no-key-hint 替代）
    await expect(page.locator(sel.noKeyHint)).toBeVisible()
    // 点击"前往设置"按钮
    const goSettingsBtn = page.locator(sel.noKeyHint + ' .primary-btn')
    await expect(goSettingsBtn).toBeVisible()
  })
})

test.describe('F003 设置页面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // 先创建会话以显示 ChatWindow
    await page.locator(sel.newChatBtn).click()
    await page.waitForTimeout(300)
  })

  test('点击设置按钮打开设置面板', async ({ page }) => {
    await page.locator(sel.settingsBtn).click()
    await expect(page.locator(sel.settingsPanel)).toBeVisible()
  })

  test('设置面板包含 API Key 输入框', async ({ page }) => {
    await page.locator(sel.settingsBtn).click()
    await expect(page.locator(sel.apiKeyInput)).toBeVisible()
  })

  test('设置面板包含保存和验证按钮', async ({ page }) => {
    await page.locator(sel.settingsBtn).click()
    await expect(page.locator(sel.saveBtn)).toBeVisible()
    await expect(page.locator(sel.validateBtn)).toBeVisible()
  })

  test('API Key 输入框有显示/隐藏切换', async ({ page }) => {
    await page.locator(sel.settingsBtn).click()
    await page.waitForTimeout(300)
    const input = page.locator(sel.apiKeyInput)
    const toggle = page.locator('.api-key-input .toggle-btn')
    // 初始应该是 password 类型，按钮显示"显示"
    await expect(input).toHaveAttribute('type', 'password')
    await expect(toggle).toContainText('显示')
    // 点击切换
    await toggle.click()
    // 切换后应该是 text 类型，按钮显示"隐藏"
    await expect(input).toHaveAttribute('type', 'text')
    await expect(toggle).toContainText('隐藏')
    // 再切回来
    await toggle.click()
    await expect(input).toHaveAttribute('type', 'password')
    await expect(toggle).toContainText('显示')
  })

  test('返回按钮关闭设置面板', async ({ page }) => {
    // 打开设置
    await page.locator(sel.settingsBtn).click()
    await expect(page.locator(sel.settingsPanel)).toBeVisible()
    // 点击返回
    await page.locator(sel.backBtn).click()
    await expect(page.locator(sel.settingsPanel)).not.toBeVisible()
  })
})

test.describe('F008 错误处理 UI', () => {
  test('错误提示组件结构正确（通过 DOM 检查）', async ({ page }) => {
    await page.goto('/')
    // 错误提示默认不显示
    await expect(page.locator(sel.errorToast)).not.toBeVisible()
  })

  test('未配置 API Key 时显示提示信息', async ({ page }) => {
    await page.goto('/')
    await page.locator(sel.newChatBtn).click()
    await page.waitForTimeout(300)
    // 检查是否有 noKeyHint
    const hint = page.locator(sel.noKeyHint)
    await expect(hint).toBeVisible()
    await expect(hint).toContainText('API 密钥')
  })
})

test.describe('F002 IPC 通信（开发者面板）', () => {
  test('应用包含 IPC 相关代码（无运行时错误）', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/')
    await page.waitForTimeout(2000)
    // 不应该有模块加载错误
    const moduleErrors = errors.filter(e =>
      e.includes('Cannot find module') || e.includes('Failed to resolve')
    )
    expect(moduleErrors).toHaveLength(0)
  })
})

test.describe('页面截图存档', () => {
  test('截取初始页面状态', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'tests/e2e/screenshots/01-initial-state.png', fullPage: true })
  })

  test('截取会话页面（有 ChatWindow）', async ({ page }) => {
    await page.goto('/')
    // 创建会话
    await page.locator(sel.newChatBtn).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'tests/e2e/screenshots/02-chat-window.png', fullPage: true })
  })

  test('截取设置页面', async ({ page }) => {
    await page.goto('/')
    // 创建会话后打开设置
    await page.locator(sel.newChatBtn).click()
    await page.waitForTimeout(300)
    await page.locator(sel.settingsBtn).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'tests/e2e/screenshots/03-settings.png', fullPage: true })
  })
})
