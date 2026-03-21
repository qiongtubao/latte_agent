# AI 文本编辑器视图设计方案

## 一、整体布局

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AI 文本编辑器                                   │
├──────────────────┬────────────────────────────┬────────────────────────────┤
│                  │                            │                            │
│   左侧面板       │      中间工作区             │      右侧 AI 对话面板       │
│   (固定宽度)     │      (动态扩容)             │      (固定宽度)            │
│                  │                            │                            │
│   280px          │      flex-grow: 1          │      320px                 │
│                  │                            │                            │
│                  │  ┌─────────────────────┐   │                            │
│                  │  │                     │   │                            │
│                  │  │  文本模块 1         │   │                            │
│                  │  │                     │   │                            │
│                  │  └─────────────────────┘   │                            │
│                  │                            │                            │
│                  │  ┌─────────────────────┐   │                            │
│                  │  │                     │   │                            │
│                  │  │  文本模块 2         │   │                            │
│                  │  │                     │   │                            │
│                  │  └─────────────────────┘   │                            │
│                  │                            │                            │
└──────────────────┴────────────────────────────┴────────────────────────────┘
```

---

## 二、左侧面板 (固定 280px)

### 2.1 结构组成

```
┌──────────────────────────┐
│ 🤖 模型选择               │  ← 下拉框
│ ┌──────────────────────┐ │
│ │ qwen3.5:35b        ▼ │ │
│ └──────────────────────┘ │
├──────────────────────────┤
│ 📤 同步到其他模块         │  ← 选择按钮
│ ┌──────────────────────┐ │
│ │ 选择目标模块...       │ │
│ └──────────────────────┘ │
├──────────────────────────┤
│ 📝 当前文本               │  ← Notion 风格页面
│                          │
│ [AI 返回的文本内容]       │
│                          │
├──────────────────────────┤
│ 📚 历史版本               │  ← 默认折叠
│                          │
│ ▶ 10:05 版本 1          │
│ ▶ 10:03 版本 2          │
│ ▶ 09:58 版本 3          │
│                          │
│ [历史文本对比区域]        │
│                          │
└──────────────────────────┘
```

### 2.2 功能详解

#### (1) 模型选择下拉框

```typescript
interface ModelOption {
  id: string          // 模型 ID
  name: string        // 显示名称
  provider: string    // 提供商 (ollama / openai / anthropic)
  capabilities: string[]  // 能力标签 ['text', 'code', 'vision']
}

// 默认选项
const defaultModels: ModelOption[] = [
  { id: 'qwen3.5:35b', name: 'Qwen 3.5 35B', provider: 'ollama' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
]
```

#### (2) 同步到其他模块

**使用场景:** 将当前文本内容同步到其他功能模块

```typescript
interface SyncTarget {
  id: string          // 目标模块 ID
  name: string        // 目标名称
  icon: string        // 图标
  action: () => void  // 同步动作
}

// 可同步的目标
const syncTargets: SyncTarget[] = [
  { id: 'email', name: '邮件内容', icon: '📧' },
  { id: 'markdown', name: 'Markdown 文档', icon: '📝' },
  { id: 'clipboard', name: '剪贴板', icon: '📋' },
  { id: 'file', name: '保存为文件', icon: '💾' },
]
```

#### (3) 当前文本区 (Notion 风格)

**特性:**
- 块级编辑 (Block-based)
- Markdown 快捷语法
- 实时渲染
- 支持代码块、表格、图片

```typescript
interface TextBlock {
  id: string
  type: 'paragraph' | 'heading' | 'list' | 'code' | 'quote' | 'divider'
  content: string
  metadata?: {
    language?: string  // 代码块语言
    level?: number     // 标题级别
  }
}

// 快捷输入
// /heading → 标题
// /code → 代码块
// /list → 列表
// /quote → 引用
```

#### (4) 历史版本区

**交互流程:**
```
默认折叠状态
    ↓ 点击展开
显示历史版本列表
    ↓ 选择版本
显示对比视图
┌─────────────────────┬─────────────────────┐
│    当前版本          │    历史版本          │
│                     │                     │
│  [差异高亮显示]      │  [差异高亮显示]      │
│                     │                     │
└─────────────────────┴─────────────────────┘
```

**数据结构:**
```typescript
interface TextVersion {
  id: string
  content: string
  timestamp: number
  model: string      // 生成该版本的模型
  prompt: string     // 生成该版本的提示词
}

// 版本对比
const compareVersions = (v1: TextVersion, v2: TextVersion) => {
  // 使用 diff 算法计算差异
  // 返回差异结果用于高亮显示
}
```

---

## 三、中间工作区 (动态扩容)

### 3.1 默认状态

```
┌────────────────────────────────────────────────┐
│                                                │
│                                                │
│         点击右侧「新建」创建文本模块            │
│                                                │
│                                                │
└────────────────────────────────────────────────┘
```

### 3.2 多模块布局

```
┌─────────────────────────────────────────────────────────────────┐
│  文本模块 1 (可关闭 ×)   文本模块 2 (可关闭 ×)   文本模块 3 (×)  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐│
│  │                  │ │                  │ │                  ││
│  │  模块 1 内容     │ │  模块 2 内容     │ │  模块 3 内容     ││
│  │                  │ │                  │ │                  ││
│  │                  │ │                  │ │                  ││
│  └──────────────────┘ └──────────────────┘ └──────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 模块管理

```typescript
interface TextModule {
  id: string
  title: string           // 模块标题 (可编辑)
  content: TextBlock[]    // 内容块
  createdAt: number
  updatedAt: number
  status: 'editing' | 'generating' | 'completed'
}

// 模块操作
const moduleActions = {
  create: () => TextModule,
  close: (id: string) => void,
  duplicate: (id: string) => TextModule,
  rename: (id: string, title: string) => void,
  export: (id: string, format: 'md' | 'html' | 'txt') => string,
}
```

---

## 四、右侧 AI 对话面板 (固定 320px)

### 4.1 结构组成

```
┌────────────────────────────┐
│ ➕ 新建                     │  ← 新建按钮
├────────────────────────────┤
│                            │
│  💬 对话历史                │
│  ┌──────────────────────┐  │
│  │ 用户: 帮我写一篇...   │  │
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │ AI: 好的，这是一篇... │  │
│  └──────────────────────┘  │
│                            │
│  ┌──────────────────────┐  │
│  │ 用户: 再润色一下      │  │
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │ AI: 已润色完成...     │  │
│  └──────────────────────┘  │
│                            │
├────────────────────────────┤
│ 🎯 发送给多个模型           │  ← 模型多选
│ [✓] qwen3.5:35b           │
│ [ ] gpt-4o                 │
│ [✓] claude-3.5-sonnet     │
├────────────────────────────┤
│ ┌────────────────────────┐ │
│ │ 输入消息...             │ │
│ └────────────────────────┘ │
│                    [发送 📤]│
└────────────────────────────┘
```

### 4.2 功能详解

#### (1) 新建按钮

**交互:**
```
点击「新建」
    ↓
在中间工作区创建新的文本模块
    ↓
自动将模块标题设为 "未命名文档"
    ↓
聚焦到新模块，准备接收 AI 内容
```

#### (2) 对话历史

**数据结构:**
```typescript
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  model?: string          // AI 回复时记录使用的模型
  targetModule?: string   // 内容输出到哪个模块
}

interface ChatSession {
  id: string
  messages: ChatMessage[]
  createdAt: number
  title: string           // 自动生成或手动设置
}
```

#### (3) 多模型发送

**交互流程:**
```
用户输入消息
    ↓
勾选多个模型 [✓] Model A, [✓] Model B
    ↓
点击发送
    ↓
并行请求多个模型
    ↓
Model A 返回 → 保存当前内容到历史 → 显示 Model A 结果
Model B 返回 → 保存当前内容到历史 → 显示 Model B 结果
    ↓
用户可以选择保留哪个结果
```

**实现:**
```typescript
interface MultiModelRequest {
  prompt: string
  models: string[]       // 选中的模型列表
  onProgress: (model: string, chunk: string) => void
  onComplete: (results: ModelResult[]) => void
}

interface ModelResult {
  model: string
  content: string
  duration: number       // 响应时间
  tokens: number         // Token 数量
}
```

#### (4) 发送按钮

**功能:**
- 单模型: 直接发送，流式返回结果
- 多模型: 并行发送，分别显示结果
- 快捷键: `Cmd/Ctrl + Enter`

---

## 五、核心交互流程

### 5.1 AI 辅助写作流程

```
1. 用户点击「新建」
   → 中间创建空白文本模块

2. 用户在右侧输入提示词
   → "帮我写一封会议邀请邮件"

3. AI 返回内容
   → 自动保存之前的空内容到历史
   → 流式显示 AI 生成的内容
   → 内容实时渲染到左侧「当前文本」和中间模块

4. 用户继续对话优化
   → "把语气改得更正式一些"
   → AI 返回润色后的版本
   → 自动保存旧版本到历史

5. 用户选择历史版本对比
   → 展开左侧历史区
   → 选择某个版本
   → 显示对比视图
```

### 5.2 多模型对比流程

```
1. 用户输入提示词
2. 勾选多个模型 (如 GPT-4o 和 Claude)
3. 点击发送
4. 两个模型并行生成
5. 界面显示:
   ┌─────────────────────────────────────┐
   │  GPT-4o 结果    │  Claude 结果      │
   │                 │                   │
   │  [内容 A]       │  [内容 B]         │
   │                 │                   │
   ├─────────────────┴───────────────────┤
   │  [使用 A]  [使用 B]  [合并两者]      │
   └─────────────────────────────────────┘
6. 用户选择最终版本
```

---

## 六、扩展功能设计

### 6.1 AI 辅助工具栏

**在文本编辑区上方:**

```
┌──────────────────────────────────────────────┐
│ ✨润色  🌐翻译  📝总结  📏扩写  ✂️精简  🎭语气 │
└──────────────────────────────────────────────┘
```

| 工具 | 功能 | 示例 |
|------|------|------|
| ✨润色 | 优化文字表达 | 把口语化内容改为书面语 |
| 🌐翻译 | 中英互译 | 翻译为英文 |
| 📝总结 | 提炼要点 | 用3句话总结全文 |
| 📏扩写 | 增加细节 | 扩写第二段 |
| ✂️精简 | 删减冗余 | 精简到500字以内 |
| 🎭语气 | 调整风格 | 改为正式/轻松/紧急 |

### 6.2 模板快速插入

```
点击模板按钮 → 选择模板 → 自动插入到光标位置

模板示例:
- 会议纪要模板
- 周报模板
- 邮件模板
- 方案模板
- 新闻稿模板
```

### 6.3 版本时间线

```
┌─────────────────────────────────────┐
│         版本时间线                   │
│                                     │
│  ──●────●────●────●────●──→         │
│    │    │    │    │    │            │
│   9:00 9:30 10:00 10:05 now        │
│                                     │
│  点击节点查看对应版本                │
└─────────────────────────────────────┘
```

---

## 七、技术实现要点

### 7.1 状态管理

```typescript
// stores/textEditor.ts
export const useTextEditorStore = defineStore('textEditor', {
  state: () => ({
    // 模块管理
    modules: [] as TextModule[],
    activeModuleId: string | null,
    
    // 模型配置
    selectedModels: [] as string[],
    availableModels: [] as ModelOption[],
    
    // 对话历史
    chatHistory: [] as ChatMessage[],
    
    // 版本管理
    versions: new Map<string, TextVersion[]>(),
    
    // UI 状态
    showHistory: false,
    compareMode: false,
    compareVersionId: string | null,
  }),
  
  actions: {
    createModule(),
    closeModule(id: string),
    updateModuleContent(id: string, content: TextBlock[]),
    
    sendToModels(prompt: string, models: string[]),
    
    saveVersion(moduleId: string),
    compareVersions(v1: string, v2: string),
    
    syncToTarget(moduleId: string, target: string),
  }
})
```

### 7.2 组件结构

```
src/views/
└── AiTextEditorView.vue          # 主视图

src/components/text-editor/
├── LeftPanel.vue                 # 左侧面板
│   ├── ModelSelector.vue         # 模型选择
│   ├── SyncSelector.vue          # 同步选择
│   ├── CurrentText.vue           # 当前文本
│   └── HistoryPanel.vue          # 历史版本
├── WorkArea.vue                  # 中间工作区
│   └── TextModule.vue            # 文本模块
├── RightPanel.vue                # 右侧面板
│   ├── ChatHistory.vue           # 对话历史
│   ├── ModelCheckbox.vue         # 模型多选
│   └── ChatInput.vue             # 输入框
├── CompareView.vue               # 版本对比视图
└── AiToolbar.vue                 # AI 工具栏
```

### 7.3 响应式布局

```css
.ai-text-editor {
  display: flex;
  height: 100vh;
}

.left-panel {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid #333;
}

.work-area {
  flex: 1;
  min-width: 400px;
  overflow-x: auto;
}

.right-panel {
  width: 320px;
  flex-shrink: 0;
  border-left: 1px solid #333;
}

/* 模块横向排列 */
.modules-container {
  display: flex;
  gap: 16px;
  padding: 16px;
  min-width: max-content;
}

.module-card {
  width: 400px;
  min-height: 500px;
  flex-shrink: 0;
}
```

---

## 八、实现优先级

| 阶段 | 功能 | 优先级 | 工作量 |
|------|------|--------|--------|
| P0 | 基础三栏布局 | 高 | 2h |
| P0 | 文本编辑 + AI 对话 | 高 | 3h |
| P0 | 单模型发送/接收 | 高 | 2h |
| P1 | 多模型并行发送 | 中 | 3h |
| P1 | 版本历史记录 | 中 | 2h |
| P1 | 版本对比功能 | 中 | 2h |
| P2 | 同步到其他模块 | 低 | 2h |
| P2 | AI 工具栏 | 低 | 3h |
| P2 | 模板系统 | 低 | 2h |

---

## 九、参考设计

- **Notion** - 块级编辑、简洁界面
- **Claude Artifacts** - 实时预览、版本管理
- **ChatGPT Canvas** - AI 辅助写作
- **Typora** - Markdown 即时渲染
- **Obsidian** - 双栏对比、插件生态

---

*整理时间: 2026-03-20*
*整理者: Latte Agent*
