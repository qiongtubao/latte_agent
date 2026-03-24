# Latte Agent

> **AI 工作台** —— 以对话为核心，通过可插拔技能插件实现无限扩展的 AI 辅助执行平台。
> 技术栈：TypeScript + Electron + Vue3
> 内置 MCP 服务，插件可为 MCP 动态注册工具和资源；编译器以插件形式安装，复杂插件可组合子插件

---

## 产品愿景

传统 AI 聊天工具只能"说"，无法真正"做"。Latte Agent 的目标是：

- **对话即执行**：每句话都可能触发一个真实动作（发邮件、运行脚本、生成图片）
- **人始终掌控**：AI 只负责准备和建议，所有最终动作需要人点击确认
- **全程可追溯**：所有对话、AI 返回结果、执行命令均有 JSON 记录，可随时回溯
- **技能无限扩展**：核心是框架，功能通过插件安装，不依赖单一 AI 提供商

---

## 核心设计理念

### 0. 内置 MCP 服务 + 插件动态扩展

Latte Agent 内置 **MCP (Model Context Protocol)** 服务，作为 AI 与外部工具/资源的标准通信协议：

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Service (内置)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Tools 注册  │  │ Resources  │  │  Prompts 模板管理    │  │
│  │  (动态扩展)  │  │  (文件/数据)│  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│         ↑                                                    │
│         │ 插件注册工具/资源                                    │
│  ┌──────┴────────────────────────────────────────────────┐   │
│  │              插件系统 (Plugin System)                   │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐  │   │
│  │  │编译器插件│ │编辑器插件│ │技能插件 │ │复合插件     │  │   │
│  │  │Compiler │ │Editor   │ │Skill    │ │Composite    │  │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────────┘  │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**插件为 MCP 动态注册能力：**
```typescript
interface MCPContribution {
  // 注册工具（AI 可调用）
  tools?: MCPTool[];
  // 注册资源（AI 可读取）
  resources?: MCPResource[];
  // 注册 Prompt 模板
  prompts?: MCPPrompt[];
}

// 示例：Python 编译器插件注册 MCP 工具
const pythonCompilerPlugin = {
  name: "compiler-python",
  mcpContributions: {
    tools: [
      { name: "python_run", description: "执行 Python 代码", inputSchema: {...} },
      { name: "python_lint", description: "Python 代码检查", inputSchema: {...} }
    ],
    resources: [
      { uri: "python://stdlib", name: "Python 标准库文档", mimeType: "text/markdown" }
    ]
  }
};
```

### 1. 编译器即插件 (Compilers as Plugins)

所有编译器/解释器以插件形式安装，核心框架不内置任何语言支持：

| 编译器插件 | 语言/运行时 | MCP 工具 | 说明 |
|-----------|------------|----------|------|
| `compiler-nodejs` | JavaScript/TypeScript | `node_run`, `npm_install`, `npm_script` | Node.js 运行时 |
| `compiler-python` | Python 3.x | `python_run`, `pip_install`, `venv_create` | Python 解释器 |
| `compiler-go` | Go | `go_run`, `go_build`, `go_test` | Go 编译器 |
| `compiler-rust` | Rust | `cargo_run`, `cargo_build`, `cargo_test` | Rust/Cargo |
| `compiler-java` | Java/Kotlin | `java_run`, `mvn_build`, `gradle_build` | JVM 语言 |
| `compiler-cpp` | C/C++ | `gcc_compile`, `cmake_build` | C/C++ 编译 |
| `compiler-lua` | Lua | `lua_run` | Lua 解释器 |
| `compiler-bash` | Shell | `bash_run`, `zsh_run` | Shell 脚本 |
| `compiler-sql` | SQL | `sql_query`, `sql_migrate` | 数据库查询 |
| `compiler-markdown` | Markdown | `md_render`, `md_to_html` | 文档渲染 |
| `compiler-mermaid` | Mermaid | `mermaid_render` | 图表渲染 |

**编译器插件接口：**
```typescript
interface CompilerPlugin extends BasePlugin {
  type: "compiler";
  language: string;           // 语言标识，如 "python", "typescript"
  extensions: string[];       // 文件扩展名，如 [".py", ".pyw"]
  runtime?: string;           // 运行时命令，如 "python3"

  // 核心能力
  capabilities: {
    run: boolean;             // 是否支持直接运行
    compile: boolean;         // 是否支持编译
    debug: boolean;           // 是否支持调试
    lint: boolean;            // 是否支持代码检查
    format: boolean;          // 是否支持格式化
  };

  // MCP 工具贡献
  mcpContributions: MCPContribution;

  // 生命周期钩子
  onInstall?: () => Promise<void>;   // 安装时检查环境
  onActivate?: () => Promise<void>;  // 激活时初始化
}
```

### 2. 复合插件 (Composite Plugins)

复杂插件可以通过组合其他插件来实现功能：

```
┌─────────────────────────────────────────────────────┐
│           Web Development Plugin (复合插件)           │
│  ┌─────────────────────────────────────────────────┐│
│  │  依赖子插件：                                     ││
│  │  • compiler-nodejs     → 运行 JS/TS              ││
│  │  • editor-html         → HTML 编辑器             ││
│  │  • editor-css          → CSS/SCSS 编辑器         ││
│  │  • preview-browser     → 浏览器预览              ││
│  │  • bundler-webpack     → Webpack 打包            ││
│  └─────────────────────────────────────────────────┘│
│  MCP 工具：                                          │
│  • webdev_create_project  → 创建项目脚手架            │
│  • webdev_start_dev       → 启动开发服务器            │
│  • webdev_build           → 生产构建                 │
└─────────────────────────────────────────────────────┘
```

**复合插件接口：**
```typescript
interface CompositePlugin extends BasePlugin {
  type: "composite";
  // 依赖的子插件（自动安装）
  dependencies: PluginDependency[];
  // 组合后的 MCP 工具
  mcpContributions: MCPContribution;
  // 工作流定义
  workflows: WorkflowDefinition[];
}

interface PluginDependency {
  pluginId: string;           // 插件 ID
  version?: string;           // 版本约束
  optional?: boolean;         // 是否可选
  config?: Record<string, unknown>;  // 子插件配置
}

// 示例：数据分析复合插件
const dataAnalysisPlugin: CompositePlugin = {
  name: "workflow-data-analysis",
  type: "composite",
  dependencies: [
    { pluginId: "compiler-python", version: "^1.0.0" },
    { pluginId: "editor-jupyter", optional: false },
    { pluginId: "visualizer-charts", optional: true },
    { pluginId: "database-connector", config: { engines: ["postgres", "mysql"] } }
  ],
  mcpContributions: {
    tools: [
      { name: "data_analysis_run", description: "执行数据分析管道" },
      { name: "data_visualize", description: "生成数据可视化" }
    ]
  },
  workflows: [
    { name: "etl_pipeline", steps: ["extract", "transform", "load"] },
    { name: "ml_training", steps: ["load_data", "preprocess", "train", "evaluate"] }
  ]
};
```

### 3. AI 编辑器插件体系（核心特性）

**核心概念**：所有编辑器都是 **AI 编辑器**——以 AI 为核心驱动的智能编辑器。这些 AI 编辑器以插件形式安装，可动态扩展。

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI 编辑器 = AI-First Editor                  │
│                                                                 │
│  传统编辑器：用户输入 → 显示文本 → (可选)AI 辅助                  │
│  AI 编辑器：用户意图 → AI 理解 → AI 生成 → 用户确认 → 应用       │
│                                                                 │
│  AI 编辑器以插件形式安装：                                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ AI 代码   │ │ AI Markdown│ │ AI 图片  │ │ AI Notebook ...  │   │
│  │ 编辑器    │ │ 编辑器     │ │ 编辑器   │ │                  │   │
│  │ (插件)   │ │ (插件)     │ │ (插件)   │ │ (插件)           │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

#### AI 编辑器的核心工作流

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│ 用户表达意图 │ ──→ │ AI 理解上下文 │ ──→ │ AI 生成内容/修改     │
│ (自然语言)  │     │ (文件/选区)  │     │ (代码/文本/图像)     │
└─────────────┘     └─────────────┘     └─────────────────────┘
                                               │
                                               ↓
┌─────────────────────────────────────────────────────────────┐
│                    Diff 预览 + 用户确认                       │
│  ┌───────────────────────┬───────────────────────────────┐  │
│  │  原始                  │  AI 修改后                    │  │
│  │  function hello() {   │  function hello(name: str) {  │  │
│  │    console.log('Hi')  │ +  console.log(f'Hi, {name}') │  │
│  │  }                    │  }                            │  │
│  └───────────────────────┴───────────────────────────────┘  │
│  [✓ 接受]  [✗ 拒绝]  [↻ 再次修改...]  [⎌ 历史版本]           │
└─────────────────────────────────────────────────────────────┘
                         │
                         ↓ (用户不满意)
              ┌─────────────────────┐
              │ 用户反馈修改意见     │
              │ "参数名改成 user"   │
              └─────────────────────┘
                         │
                         ↓ (循环直到满意)
              ┌─────────────────────┐
              │ AI 根据反馈重新生成  │
              └─────────────────────┘
```

#### 多模型并行请求 + 迭代精炼引擎（核心差异化能力）

这是 AI 编辑器最核心的差异化能力。不仅仅是"AI 帮你改代码"，而是：

- **多模型并行**：同时请求 Claude / GPT / Gemini / Ollama，让多个模型同时处理同一意图
- **多模型对比**：并排展示不同模型的结果，用户选择最优解
- **版本对比**：当前版本 vs 上一个版本 vs 任意历史版本，逐行 Diff
- **迭代精炼**：在选中的结果上反复迭代，约束不丢失且越来越精准
- **约束链**：每一轮对话的约束自动累积，AI 始终遵守全部历史约束

##### 约束链（Constraint Chain）—— 核心机制

用户每次提出修改意图时，AI 编辑器维护一条**约束链**：

```
约束链 = 用户第1轮约束 + 用户第2轮约束 + ... + 用户第N轮约束

每一轮新意图 = "在上一轮结果的基础上，遵守全部已有约束，再加上新约束"
```

**关键原则**：
- 约束**只增不减**：用户说"把变量名改成驼峰"，这个约束永久保留
- 约束**越来越精准**：用户每轮反馈都在缩小 AI 的搜索空间
- AI **不会遗忘**：即使迭代 20 轮，第 1 轮的约束仍然生效

**约束链数据结构**：
```typescript
interface ConstraintChain {
  // 约束项列表，按时间顺序追加，不可删除不可修改
  constraints: Constraint[];

  // 当前累积的上下文（所有约束的自然语言摘要，传给 AI 的 system prompt）
  accumulatedContext: string;

  // 当前基准内容（上一轮 AI 生成的最终结果）
  currentBase: string;

  // 历史快照（每轮 AI 生成结果都保存，用于版本对比）
  snapshots: Snapshot[];
}

interface Constraint {
  id: string;               // 唯一 ID
  round: number;            // 第几轮对话
  userIntent: string;       // 用户原始意图
  timestamp: string;        // ISO 时间
  // 约束被满足时自动标记
  satisfied: boolean;
}

interface Snapshot {
  id: string;
  round: number;
  content: string;          // 该轮 AI 生成的完整内容
  model: string;            // 使用的模型
  timestamp: string;
  tokenUsage: { input: number; output: number };
}
```

##### 多模型并行请求

用户输入意图后，AI 编辑器**同时**向多个模型发送请求：

```
用户意图: "重构这个函数，提取公共逻辑，变量名用驼峰"
                    │
        ┌───────────┼───────────┬───────────────┐
        ↓           ↓           ↓               ↓
   ┌─────────┐ ┌─────────┐ ┌─────────┐   ┌──────────┐
   │ Claude  │ │  GPT-4o │ │ Gemini  │   │ Ollama   │
   │ Sonnet  │ │         │ │ Pro     │   │ (本地)   │
   └────┬────┘ └────┬────┘ └────┬────┘   └────┬─────┘
        │           │           │              │
        ↓           ↓           ↓              ↓
   ┌─────────────────────────────────────────────────┐
   │              结果并排对比面板                      │
   │                                                   │
   │  [Claude]  ✓ 提取了公共方法        用时 3.2s     │
   │  [GPT-4o]  ✓ 提取了但变量名未改驼峰  用时 2.8s   │
   │  [Gemini]  ✗ 未正确处理边界情况     用时 1.9s    │
   │  [Ollama]  ✓ 结果正确但不够简洁     用时 5.1s    │
   │                                                   │
   │  用户选择: [Claude] 作为基准，继续迭代              │
   └─────────────────────────────────────────────────┘
```

**多模型并行接口**：
```typescript
interface MultiModelRequest {
  intent: string;              // 用户意图
  baseContent: string;         // 当前基准内容
  constraintChain: string;     // 累积约束上下文
  models: ModelConfig[];       // 要并行请求的模型列表
  options: {
    timeout: number;           // 单模型超时（毫秒）
    maxConcurrency: number;    // 最大并发数
    streamDiff: boolean;       // 是否流式显示 Diff
  };
}

interface ModelConfig {
  id: string;                  // 模型标识，如 "claude-sonnet-4-6"
  name: string;                // 显示名，如 "Claude Sonnet"
  provider: "anthropic" | "openai" | "google" | "ollama";
  apiConfig: {
    apiKey?: string;
    baseURL?: string;
    model: string;
  };
}

interface MultiModelResult {
  modelId: string;
  model: ModelConfig;
  result: string;              // AI 生成的内容
  diff: DiffResult;            // 与基准内容的 Diff
  tokenUsage: { input: number; output: number };
  latencyMs: number;           // 响应耗时
  error?: string;              // 错误信息（如有）
}

interface DiffResult {
  additions: DiffLine[];       // 新增行（绿色）
  deletions: DiffLine[];       // 删除行（红色）
  modifications: DiffLine[];   // 修改行（黄色）
  unifiedDiff: string;         // 标准 unified diff 格式
}
```

##### 结果对比面板

提供三种对比维度：

**① 多模型横向对比**（同一意图，不同模型的结果）
```
┌──────────────────────────────────────────────────────────────────┐
│  多模型对比 — "重构函数，提取公共逻辑"                            │
│                                                                   │
│  ┌─ Claude Sonnet ─────────────┐  ┌─ GPT-4o ──────────────────┐ │
│  │ - function validateInput()  │  │ - function validate_input() │ │
│  │ + function validateInput()  │  │ - function validateInput() │ │
│  │   使用了 early return       │  │   提取了公共逻辑            │ │
│  │   变量名已改为驼峰 ✓        │  │   变量名未改驼峰 ✗          │ │
│  │   Token: 1.2K in / 0.8K out│  │   Token: 0.9K in / 0.6K out│ │
│  │   耗时: 3.2s               │  │   耗时: 2.8s               │ │
│  │   [选择此结果]              │  │   [选择此结果]              │ │
│  └─────────────────────────────┘  └─────────────────────────────┘ │
│                                                                   │
│  ┌─ Gemini Pro ────────────────┐  ┌─ Ollama (本地) ────────────┐ │
│  │  边界情况未处理              │  │  结果正确                   │ │
│  │  变量名已改为驼峰 ✓         │  │  代码稍显冗余               │ │
│  │  [选择此结果]              │  │  [选择此结果]              │ │
│  └─────────────────────────────┘  └─────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**② 版本纵向对比**（同一内容，不同迭代轮次）
```
┌──────────────────────────────────────────────────────────────────┐
│  版本对比 — 从第 2 轮到第 3 轮                                    │
│                                                                   │
│  第 2 轮结果                    第 3 轮结果                       │
│  ┌──────────────────────┐     ┌──────────────────────┐           │
│  │ function calc(a, b) { │     │ function calculate(   │           │
│  │   return a + b;       │ ──→ │   a: number,          │           │
│  │ }                    │     │   b: number): number { │           │
│  │                      │     │   return a + b;        │           │
│  │                      │     │ }                     │           │
│  └──────────────────────┘     └──────────────────────┘           │
│                                                                   │
│  变更摘要: 添加了 TypeScript 类型注解，函数名改为 calculate        │
│  满足约束: [R1] 驼峰命名 ✓  [R2] TypeScript 类型 ✓              │
│  新增约束: [R3] 添加 JSDoc ← 下一轮要做的                       │
└──────────────────────────────────────────────────────────────────┘
```

**③ 任意版本对比**（选择任意两个快照进行 Diff）
```
┌──────────────────────────────────────────────────────────────────┐
│  历史版本 ← [R1] ← [R2] ← [R3 当前]                             │
│                                                                   │
│  对比: [R1 初始] vs [R3 当前]     [全选] [清除选择]              │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ - function calc(a, b) {        // R1: 无类型注解             ││
│  │ + function calculate(           // R3: 完整类型 + JSDoc       ││
│  │ +   /** 计算两数之和 */                                    ││
│  │ +   a: number,                                             ││
│  │ +   b: number): number {                                 ││
│  │     return a + b;                                           ││
│  │   }                                                         ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                   │
│  累积变更: 3 处修改 | 满足 3 条约束                               │
│  [回滚到 R1]  [回滚到 R2]  [从 R3 继续迭代]                      │
└──────────────────────────────────────────────────────────────────┘
```

##### 迭代精炼流程（约束不丢失）

用户选中一个结果后，进入迭代精炼循环。每一轮：
1. **累积约束**：新意图追加到约束链，旧约束保留
2. **构建 Prompt**：`基准内容 + 全部约束摘要 + 新意图` → 发给 AI
3. **生成结果**：AI 在上一轮结果的基础上修改，遵守全部约束
4. **约束校验**：自动检查所有约束是否满足（AI 自评 + 规则校验）
5. **保存快照**：结果存入版本历史，约束链更新

```
┌──────────────────────────────────────────────────────────────────┐
│                    迭代精炼循环                                     │
│                                                                   │
│  R1: "重构这个函数"                                               │
│  ├── 约束链: [R1: 重构函数]                                       │
│  ├── AI 生成 → 用户接受 → 快照 S1                                │
│  │                                                                 │
│  R2: "变量名改成驼峰"                                             │
│  ├── 约束链: [R1: 重构函数, R2: 驼峰命名]                         │
│  ├── AI 生成（基于 S1，遵守 R1+R2）→ 用户接受 → 快照 S2          │
│  │                                                                 │
│  R3: "添加 TypeScript 类型注解"                                    │
│  ├── 约束链: [R1: 重构函数, R2: 驼峰命名, R3: TS类型注解]        │
│  ├── AI 生成（基于 S2，遵守 R1+R2+R3）→ 快照 S3                  │
│  │  ← 自动校验: R1 ✓ R2 ✓ R3 ✓                                  │
│  │                                                                 │
│  R4: "添加 JSDoc 注释"                                            │
│  ├── 约束链: [R1..R4]                                            │
│  ├── AI 生成（基于 S3，遵守 R1+R2+R3+R4）                        │
│  │  ← 自动校验: R1 ✓ R2 ✓ R3 ✓ R4 ✓                              │
│  │  ← 此时约束链有 4 条，AI 不会丢失任何一条                      │
│  │                                                                 │
│  ... 迭代 N 轮，约束链持续累积，结果越来越精准                    │
│                                                                   │
│  用户满意 → 点击 [应用] → 最终结果写入文件                        │
│  用户不满意 → 继续迭代 / 回滚到历史版本 / 换模型重新生成           │
└──────────────────────────────────────────────────────────────────┘
```

**约束校验机制**：
```typescript
interface ConstraintValidation {
  constraintId: string;
  round: number;
  // 校验方式：ai（AI 自评）| rule（正则/规则匹配）| test（运行测试）
  method: "ai" | "rule" | "test";
  passed: boolean;
  detail: string;           // 校验详情
}

// 示例：驼峰命名约束的规则校验
const camelCaseRule: ConstraintValidation = {
  constraintId: "R2",
  round: 2,
  method: "rule",
  passed: true,
  detail: "所有函数名和变量名符合驼峰命名规范"
};

// 约束校验失败时的处理
// 1. 在结果面板中高亮标记违反约束的代码位置
// 2. 自动将违反的约束重新加入下一轮 Prompt（加强权重）
// 3. 用户可选择：重新生成 / 手动修复 / 忽略此约束
```

##### AI Prompt 构建策略

迭代精炼的 Prompt 不是简单的"用户指令 + 代码"，而是精心构建的上下文：

```typescript
function buildIterationPrompt(
  baseContent: string,           // 上一轮 AI 的结果
  constraintChain: Constraint[],  // 全部累积约束
  currentIntent: string,         // 本轮用户意图
  diffToBase?: string            // 与原始内容的 Diff（可选，帮助 AI 理解已改了什么）
): string {
  const constraintsSection = constraintChain
    .map((c, i) => `[约束${i + 1}][第${c.round}轮] ${c.userIntent}`)
    .join("\n");

  return `你是一个专业的代码编辑助手。请根据以下要求修改代码。

## 当前代码（上一轮结果）
\`\`\`
${baseContent}
\`\`\`

## 必须遵守的约束（不可违反任何一条）
${constraintsSection}

## 本次修改意图
${currentIntent}

## 要求
1. 在当前代码基础上修改，不要重写
2. 必须遵守以上全部 ${constraintChain.length} 条约束
3. 只做本次意图要求的修改，不要多改其他内容
4. 输出修改后的完整代码`;
}
```

##### 所有 AI 编辑器共享的能力（基类）

| 能力 | 说明 |
|------|------|
| **意图理解** | 用户用自然语言描述想要什么，AI 理解并执行 |
| **上下文感知** | AI 自动读取：当前文件、选区、光标位置、相关文件、项目结构 |
| **无限循环修正** | 用户反馈 → AI 重新生成 → 再反馈 → 循环直到满意 |
| **Diff 对比预览** | AI 修改以 Diff 形式展示：绿色=新增、红色=删除 |
| **版本历史** | 保存所有 AI 生成版本，可回滚到任意版本 |
| **多模型并行** | 同时请求 Claude + GPT + Gemini + Ollama，并排展示供选择 |
| **多模型对比** | 同一意图不同模型结果横向对比，选出最优解 |
| **版本对比** | 当前版本 vs 任意历史版本，逐行 Diff 差异 |
| **约束链** | 每轮意图自动追加为约束，AI 始终遵守全部历史约束 |
| **约束校验** | AI 自评 + 规则匹配 + 测试运行，自动检查约束是否满足 |
| **迭代精炼** | 在选定结果上反复迭代，约束不丢失且越来越精准 |
| **MCP 工具调用** | AI 可调用编译器插件（运行代码）、文件系统等 |

#### AI 编辑器触发方式

```
方式一：快捷键
  Cmd+K / Ctrl+K → 弹出 AI 输入框 → 输入意图

方式二：选区右键
  选中文本/代码 → 右键 → "AI 修改" → 选择操作

方式三：行内建议
  AI 根据上下文自动显示灰色建议 → Tab 接受

方式四：对话触发
  对话中描述需求 → AI 生成 → 点击"插入编辑器"
```

#### AI 编辑器种类（全部为插件）

**① AI 代码编辑器 (`ai-editor-code`)**
- 插件形式安装，支持任意语言（关联编译器插件）
- AI 能力：智能补全、代码解释、重构、Bug 修复、生成测试、代码翻译
- 联动编译器：一键运行、调试

**② AI Markdown 编辑器 (`ai-editor-markdown`)**
- 插件形式安装
- AI 能力：续写、润色、风格调整、翻译、生成大纲、摘要
- 实时渲染预览

**③ AI 图片编辑器 (`ai-editor-image`)**
- 插件形式安装
- AI 能力：智能抠图、内容生成、风格迁移、智能修复、批量处理
- 分层编辑

**④ AI 流程图编辑器 (`ai-editor-mermaid`)**
- 插件形式安装
- AI 能力：自然语言 → Mermaid 图表、图表优化、格式转换
- 实时渲染预览

**⑤ AI Notebook 编辑器 (`ai-editor-jupyter`)**
- 插件形式安装
- AI 能力：单元格生成、结果解释、调试建议、可视化推荐
- 联动 Python 编译器执行

**⑥ AI SQL 编辑器 (`ai-editor-sql`)**
- 插件形式安装
- AI 能力：自然语言 → SQL、SQL 解释、性能优化建议、结果分析
- 查询结果表格展示

**⑦ AI HTML/Vue 编辑器 (`ai-editor-html`)**
- 插件形式安装
- AI 能力：自然语言 → 组件代码、样式建议、响应式布局
- 实时 DOM 预览

**⑧ AI 复合文档编辑器 (`ai-editor-notion`)**
- 插件形式安装
- AI 能力：跨块理解、内容生成、结构优化
- 支持嵌入其他 AI 编辑器插件（`/{编辑器名}` 命令）

**⑨ AI Pencil 设计编辑器 (`ai-editor-pen`)**
- 插件形式安装
- AI 能力：自然语言描述 UI → 生成设计稿、布局优化
- 与 Pencil MCP 深度集成

**⑩ AI 音频编辑器 (`ai-editor-audio`)**
- 插件形式安装
- AI 能力：语音转文字、降噪、章节分割

**⑪ AI 视频编辑器 (`ai-editor-video`)**
- 插件形式安装
- AI 能力：自动字幕、场景识别、智能剪辑

#### AI 编辑器插件接口

```typescript
interface AIEditorPlugin extends BasePlugin {
  type: "ai-editor";

  // 支持的文件类型
  fileTypes: string[];

  // 关联的编译器插件（可选）
  associatedCompiler?: string;

  // AI 能力定义
  aiCapabilities: {
    intentUnderstanding: boolean;    // 意图理解
    contextAwareness: boolean;       // 上下文感知
    infiniteLoopCorrection: boolean; // 无限循环修正
    diffPreview: boolean;            // Diff 预览
    versionHistory: boolean;         // 版本历史
    multiModel: boolean;             // 多模型并行
    constraintChain: boolean;        // 约束链（不丢约束）
    iterativeRefinement: boolean;    // 迭代精炼
  };

  // 多模型配置
  multiModelConfig?: {
    enabled: boolean;
    defaultModels: string[];         // 默认并行请求的模型列表
    allowUserOverride: boolean;      // 是否允许用户手动选择模型
    timeoutMs: number;               // 单模型超时
  };

  // 特有 AI 能力
  specializedAIFeatures: string[];

  // MCP 工具贡献（供 AI 调用）
  mcpContributions: MCPContribution;

  // 编辑器组件（Vue）
  editorComponent: VueComponent;
}

// 约束链类型定义
interface ConstraintChain {
  constraints: Constraint[];
  accumulatedContext: string;
  currentBase: string;
  snapshots: Snapshot[];
}

interface Constraint {
  id: string;
  round: number;
  userIntent: string;
  timestamp: string;
  satisfied: boolean;
  validation?: ConstraintValidation;
}

interface Snapshot {
  id: string;
  round: number;
  content: string;
  model: string;
  timestamp: string;
  tokenUsage: { input: number; output: number };
  constraintsSatisfied: string[];  // 满足的约束 ID 列表
}

// 多模型请求结果
interface MultiModelResult {
  modelId: string;
  result: string;
  diff: DiffResult;
  tokenUsage: { input: number; output: number };
  latencyMs: number;
  error?: string;
}

// 约束校验结果
interface ConstraintValidation {
  constraintId: string;
  method: "ai" | "rule" | "test";
  passed: boolean;
  detail: string;
}
```

### 4. 数据源插件 (Data Source Plugins)

数据源以插件形式安装，让 AI 能直接查询和操作外部数据：

| 数据源插件 | 说明 | MCP 能力 |
|-----------|------|---------|
| `datasource-postgresql` | PostgreSQL 数据库 | 查询、Schema 读取、表结构 |
| `datasource-mysql` | MySQL 数据库 | 查询、Schema 读取 |
| `datasource-mongodb` | MongoDB | 文档 CRUD、聚合查询 |
| `datasource-redis` | Redis 缓存 | 键值读写、过期管理 |
| `datasource-rest-api` | REST API 对接 | 自定义 HTTP 请求、响应解析 |
| `datasource-graphql` | GraphQL API | 查询、Mutation、Schema 内省 |
| `datasource-elastic` | Elasticsearch | 全文搜索、索引管理 |
| `datasource-s3` | S3/MinIO 对象存储 | 文件上传/下载/列表 |

**使用场景：**
- "帮我查上个月的销售总额" → AI 调用 `datasource-postgresql` 查询
- "Redis 里有多少缓存键？" → AI 调用 `datasource-redis` 统计
- "调用公司内部 API 获取用户列表" → AI 调用 `datasource-rest-api`

```typescript
interface DataSourcePlugin extends BasePlugin {
  type: "datasource";
  protocol: "sql" | "nosql" | "rest" | "graphql" | "kv" | "object-storage";
  connectionSchema: Record<string, unknown>;  // 连接参数定义
  capabilities: { read: boolean; write: boolean; schema: boolean };
  mcpContributions: MCPContribution;
}
```

### 5. 通知渠道插件 (Notification Plugins)

技能执行结果可自动推送到外部渠道：

| 通知插件 | 渠道 | 触发方式 |
|---------|------|---------|
| `notify-email` | SMTP 邮件 | 技能完成/错误/定时 |
| `notify-slack` | Slack | Webhook 推送 |
| `notify-dingtalk` | 钉钉 | 机器人消息 |
| `notify-wechat` | 企业微信 | 应用消息 |
| `notify-telegram` | Telegram | Bot 消息 |
| `notify-webhook` | 通用 Webhook | POST 任意 URL |

**使用场景：**
- `/脚本 部署` 完成后自动通知 Slack 频道
- 定时任务失败时发送邮件告警
- 对话摘要每日推送到钉钉群

```typescript
interface NotificationPlugin extends BasePlugin {
  type: "notification";
  channels: string[];           // 支持的通知类型
  templateEngine: boolean;      // 是否支持消息模板
  mcpContributions: MCPContribution;  // 注册 notify_send 工具
}
```

### 6. AI Agent 插件 (Agent Plugins)

安装专门的 AI Agent，每个 Agent 有独立的 System Prompt + 工具集：

| Agent 插件 | 专长 | 内置工具 |
|-----------|------|---------|
| `agent-coder` | 编程开发 | 代码搜索、文件读写、编译运行 |
| `agent-researcher` | 信息检索 | Web 搜索、文档阅读、笔记整理 |
| `agent-translator` | 翻译 | 多语言翻译、术语库、风格适配 |
| `agent-analyst` | 数据分析 | 图表生成、统计计算、报告撰写 |
| `agent-reviewer` | 代码审查 | Lint、安全扫描、性能分析 |
| `agent-writer` | 内容创作 | 写作、改写、SEO 优化 |

**使用场景：**
- 在对话中切换到"编码 Agent"模式，AI 自动使用编程工具
- 安装"论文阅读 Agent"，上传 PDF 后自动解析、提取摘要、回答问题
- 安装"翻译 Agent"，对话自动双向翻译

```typescript
interface AgentPlugin extends BasePlugin {
  type: "agent";
  systemPrompt: string;        // Agent 的系统提示词
  requiredTools: string[];     // 需要的工具（MCP 工具 ID）
  mcpContributions: MCPContribution;
}
```

### 7. 主题插件 (Theme Plugins)

界面主题以插件形式安装，支持深度定制：

```typescript
interface ThemePlugin extends BasePlugin {
  type: "theme";
  themeConfig: {
    colors: { primary: string; background: string; text: string; ... };
    typography: { fontFamily: string; fontSize: { base: number; ... } };
    layout: { sidebarWidth: number; editorPanel: boolean; ... };
    darkMode: boolean | "auto";
  };
  preview?: string;            // 主题预览截图 URL
}
```

### 8. 自动化工作流引擎 (Workflow Engine)

超越复合插件的固定流程，支持用户可视化编排工作流：

```
┌─────────────────────────────────────────────────────────────┐
│                  自动化工作流引擎                              │
│                                                              │
│  触发器（Trigger）                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ 定时触发 │ │ 对话触发 │ │ 文件变更 │ │ 外部 Webhook │   │
│  │ cron     │ │ 关键词   │ │ watch    │ │ HTTP POST    │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
│       ↓                                                       │
│  ┌─────────────────────────────────────────────────────┐     │
│  │              可视化工作流编辑器（拖拽编排）            │     │
│  │                                                      │     │
│  │  [查询数据库] → [AI 分析] → [生成报告] → [发邮件]    │     │
│  │       ↓            ↓            ↓            ↓        │     │
│  │  (datasource)  (agent)    (editor)    (notify)       │     │
│  │                                                      │     │
│  │  条件分支：                                           │     │
│  │  [数据量 > 10000] → [分批处理]                       │     │
│  │  [数据量 <= 10000] → [直接处理]                      │     │
│  │                                                      │     │
│  │  错误处理：                                           │     │
│  │  [任意步骤失败] → [重试 3 次] → [通知管理员]          │     │
│  └─────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 9. 快捷键与命令面板 (Command Palette)

类似 VS Code Command Palette，插件可注册命令：

```
Cmd+Shift+P → 弹出命令面板

> 查询数据库...
> 发送邮件...
> 运行脚本...
> Git 提交
> 切换主题...
> 安装插件...
```

### 10. 存储与同步插件 (Storage & Sync)

跨设备同步对话历史和插件配置：

| 存储插件 | 说明 |
|---------|------|
| `sync-local` | 本地文件系统（默认） |
| `sync-s3` | AWS S3 / MinIO |
| `sync-dropbox` | Dropbox |
| `sync-webdav` | WebDAV（坚果云、Nextcloud） |
| `sync-git` | Git 仓库（自动 commit/push） |

### 11. 模板市场 (Template Market)

一键从模板创建常用工作流和项目：

| 模板类型 | 示例 |
|---------|------|
| 对话模板 | "周报生成"、"代码审查"、"需求分析" |
| 技能模板 | "API 调试技能"、"数据处理技能" |
| 项目模板 | "Vue3 全栈项目"、"Python 数据分析" |
| 工作流模板 | "日报自动汇总 → 发邮件" |

### 12. 对话是主界面，技能是工具

对话框永远在中心。用户用自然语言表达意图，系统识别后：
- 若匹配到已安装技能 → 自动触发技能流程
- 若未匹配 → 纯对话模式，AI 回答或引导用户安装对应技能

技能触发语法（斜杠命令）：
```
/{技能名} {参数1} {参数2}

示例：
/发邮件 hello@example.com "季度报告"
/脚本 ~/scripts/backup.sh
/发邮件          ← 无参数时弹出完整表单
```

### 13. 技能的标准执行流程

每个技能都遵循同一个流程，保证一致的用户体验：

```
触发技能
  ↓
收集参数（缺少参数时弹出对应编辑器/表单）
  ↓
AI 辅助生成内容（可选）
  ↓
展示预览 + 最终命令（JSON/Vue 渲染）
  ↓
用户确认 ← 人做最终决策，AI 只辅助
  ↓
执行命令 + 写入对话历史
```

**关键设计**：执行前必须弹出确认界面，显示将要执行的完整命令，用户可修改参数后再确认。这保证了"AI 辅助，人做决策"的原则。

### 14. 全记录、可回溯

所有数据以 JSON 结构持久化：

```json
{
  "sessionId": "sess-xxxxx",
  "messages": [
    {
      "id": "msg-001",
      "type": "user",
      "content": "/发邮件 hr@company.com 入职申请",
      "timestamp": "2026-03-22T10:00:00Z"
    },
    {
      "id": "msg-002",
      "type": "skill_trigger",
      "skill": "发邮件",
      "params": { "to": "hr@company.com", "subject": "入职申请" },
      "aiGeneratedContent": "尊敬的HR...",
      "executedCommand": "latte-mail hr@company.com '入职申请' '...'",
      "status": "confirmed",
      "timestamp": "2026-03-22T10:00:05Z"
    }
  ]
}
```

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Electron 主窗口                                 │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    对话主界面（Vue）                             │  │
│  │                                                                │  │
│  │  用户输入 ──→ 意图识别 ──→ 技能路由                              │  │
│  │                              ↓                                 │  │
│  │                        技能执行流程                              │  │
│  │                              ↓                                 │  │
│  │                        确认界面弹出                              │  │
│  │                              ↓                                 │  │
│  │                        执行 + 写入历史                           │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    插件系统 (Plugin System)                    │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │    │
│  │  │编译器插件 │ │编辑器插件 │ │技能插件   │ │复合插件(组合)     │ │    │
│  │  │Compilers │ │Editors   │ │Skills    │ │Composite Plugins │ │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘ │    │
│  │              ↓              ↓              ↓                   │    │
│  │         ┌─────────────────────────────────────────────────┐   │    │
│  │         │         MCP 工具/资源动态注册                     │   │    │
│  │         └─────────────────────────────────────────────────┘   │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                              ↓                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                MCP Service (内置)                             │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐  │    │
│  │  │Tools 注册表│  │Resources   │  │Prompts 模板管理         │  │    │
│  │  │(动态扩展)  │  │(文件/数据)  │  │                        │  │    │
│  │  └────────────┘  └────────────┘  └────────────────────────┘  │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    AI 编辑器层                                 │    │
│  │     文本 / 代码 / 图片 / 音频 / 视频 / Mermaid / Pencil        │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    JSON 持久化层                               │    │
│  │    对话历史 / 技能执行记录 / AI 结果历史 / 插件配置             │    │
│  └──────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 功能模块详解

### 模块一：插件市场与管理

插件市场是 Latte Agent 扩展能力的核心入口：

```
┌─────────────────────────────────────────────────────────────────┐
│                      插件市场 (Plugin Market)                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  分类浏览：编译器 | 编辑器 | 技能 | 工作流 | 主题            │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  搜索：[___________________]  筛选：已安装 | 可更新 | 推荐   │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │  │
│  │  │ Python 3.12  │  │ Node.js 20   │  │ Go 1.22      │     │  │
│  │  │ 编译器插件    │  │ 编译器插件    │  │ 编译器插件    │     │  │
│  │  │ ⭐ 4.8  2.1M │  │ ⭐ 4.9  3.5M │  │ ⭐ 4.7  890K │     │  │
│  │  │ [已安装 ✓]   │  │ [安装]       │  │ [安装]       │     │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘     │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  Web Development Suite (复合插件)                      │  │  │
│  │  │  包含: nodejs + webpack + html-editor + css-editor    │  │  │
│  │  │  ⭐ 4.6  1.2M 安装 | [查看详情] [安装套件]              │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**插件安装流程：**
```
用户点击安装
    ↓
检查依赖（编译器插件检查运行时是否可用）
    ↓
下载插件包（从 npm/本地/远程仓库）
    ↓
执行 onInstall 钩子（环境配置）
    ↓
注册 MCP 工具/资源（动态扩展 AI 能力）
    ↓
完成安装 → 插件出现在侧边栏
```

**插件管理界面：**
- 已安装列表（启用/禁用/卸载）
- 依赖关系图（可视化插件依赖）
- MCP 工具查看（当前注册的所有工具）
- 配置面板（每个插件的设置项）

---

### 模块二：技能插件系统

技能是"可安装的固定流程"，核心价值是**把 AI 的能力下限提高**——即使模型理解有偏差，技能的固定流程也能保证执行正确。

#### 已规划技能

**技能：/脚本**
```
触发方式：/脚本 <脚本路径（可为空）>

有路径参数：
  → 直接弹出确认界面（显示将执行的命令，可修改参数）
  → 用户确认后执行

无路径参数：
  → 弹出文件选择器（可选已有文件或创建新文件）
  → 可选：在 AI 代码编辑器中修改脚本内容
  → 弹出确认界面
  → 用户确认后执行
```

**技能：/发邮件**
```
触发方式：/发邮件 <邮箱（可为空）> <主题（可为空）>

有参数：
  → AI 根据主题生成邮件正文
  → 展示：收件人 + 主题 + 正文 + 执行命令预览
  → 用户确认后执行 latte-mail <邮件> <内容>

无参数：
  → 弹出表单（邮箱必填 + 内容必填）
  → 邮箱字段：支持联系人别名补全
  → 内容字段：可唤起 AI 文本编辑器辅助写作
  → 弹出确认界面
  → 用户确认后执行
```

#### 技能插件开发规范（接口定义）

技能也是插件的一种，遵循统一的插件架构：

```typescript
interface SkillPlugin extends BasePlugin {
  type: "skill";

  // 技能唯一标识（斜杠命令名）
  name: string;               // 例："发邮件"

  // 技能描述（展示给用户和 AI 的说明）
  description: string;

  // 参数定义（用于参数校验和表单生成）
  params: SkillParam[];

  // 执行函数（接收完整参数，返回要展示的预览和最终命令）
  execute(params: Record<string, unknown>): Promise<SkillResult>;

  // MCP 贡献（可选，技能可注册工具供 AI 直接调用）
  mcpContributions?: MCPContribution;

  // 依赖的其他插件（可选）
  dependencies?: PluginDependency[];
}

interface SkillParam {
  name:       string;               // 参数名
  type:       "text" | "file" | "email" | "code" | "image";
  required:   boolean;
  editorType?: "ai-text" | "ai-code" | "file-picker"; // 空值时唤起的编辑器
  aliases?:   string[];             // 别名列表（如邮件联系人别名）
}

interface SkillResult {
  preview:  string | object;  // 给用户看的预览（Vue 组件或 JSON）
  command:  string;           // 将要执行的完整命令（用户可修改）
  metadata: Record<string, unknown>; // 写入历史记录的额外信息
}

// 示例：发邮件技能插件
const emailSkillPlugin: SkillPlugin = {
  type: "skill",
  name: "发邮件",
  description: "发送邮件到指定收件人",
  params: [
    { name: "to", type: "email", required: true, aliases: ["hr", "boss", "team"] },
    { name: "subject", type: "text", required: true },
    { name: "body", type: "text", required: true, editorType: "ai-text" }
  ],
  mcpContributions: {
    tools: [
      { name: "send_email", description: "发送邮件", inputSchema: {...} }
    ]
  },
  execute: async (params) => {
    return {
      preview: `收件人: ${params.to}\n主题: ${params.subject}\n正文: ${params.body}`,
      command: `latte-mail ${params.to} '${params.subject}' '${params.body}'`,
      metadata: { recipient: params.to }
    };
  }
};
```

---

### 模块三：Token 使用统计与费用追踪

**核心需求**：每次对话或工具调用都需统计 Token 输入/输出量和次数，根据模型配置预估价格，后台统计日/月消费。

#### 功能架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Token 统计与费用追踪系统                              │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     实时统计（每次请求）                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │   │
│  │  │ 输入 Token   │  │ 输出 Token   │  │ 模型单价配置          │  │   │
│  │  │ input_tokens │  │ output_tokens│  │ $/1M input/output   │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘  │   │
│  │           │                │                    │               │   │
│  │           └────────────────┼────────────────────┘               │   │
│  │                            ↓                                    │   │
│  │                   ┌─────────────────┐                           │   │
│  │                   │ 本次费用 =      │                           │   │
│  │                   │ input × 单价_in │                           │   │
│  │                   │ + output × 单价 │                           │   │
│  │                   └─────────────────┘                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     聚合统计（按会话/日/月）                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │   │
│  │  │ 会话统计    │  │ 日统计      │  │ 月统计                   │  │   │
│  │  │ per session │  │ per day     │  │ per month               │  │   │
│  │  │ 请求次数    │  │ 请求次数    │  │ 请求次数                 │  │   │
│  │  │ 总输入Token │  │ 总输入Token │  │ 总输入Token              │  │   │
│  │  │ 总输出Token │  │ 总输出Token │  │ 总输出Token              │  │   │
│  │  │ 总费用      │  │ 总费用      │  │ 总费用                   │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     可视化展示                                   │   │
│  │  • 对话界面底部：本次消耗（输入 X + 输出 Y = $Z）                │   │
│  │  • 侧边栏面板：日/周/月趋势图（折线图 + 饼图）                   │   │
│  │  • 模型对比：不同模型的费用占比                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 模型价格配置（settings.json）

```json
{
  "pricing": {
    "claude-opus-4-6": {
      "input_per_million": 15.00,   // $/1M tokens
      "output_per_million": 75.00,
      "name": "Claude Opus 4.6"
    },
    "claude-sonnet-4-6": {
      "input_per_million": 3.00,
      "output_per_million": 15.00,
      "name": "Claude Sonnet 4.6"
    },
    "claude-haiku-4-5": {
      "input_per_million": 0.80,
      "output_per_million": 4.00,
      "name": "Claude Haiku 4.5"
    },
    "gpt-4o": {
      "input_per_million": 2.50,
      "output_per_million": 10.00,
      "name": "GPT-4o"
    },
    "gemini-2.0-flash": {
      "input_per_million": 0.10,
      "output_per_million": 0.40,
      "name": "Gemini 2.0 Flash"
    }
  }
}
```

#### 统计数据存储（token_usage.json）

```json
{
  "records": [
    {
      "id": "req-001",
      "timestamp": "2026-03-24T10:30:00Z",
      "sessionId": "sess-xxx",
      "model": "claude-sonnet-4-6",
      "inputTokens": 1500,
      "outputTokens": 800,
      "costUSD": 0.0165,           // 1500×3/1M + 800×15/1M
      "type": "chat",              // chat | tool_use | skill
      "skillName": null            // 如果是技能触发，记录技能名
    }
  ],
  "dailySummary": {
    "2026-03-24": {
      "totalRequests": 42,
      "totalInputTokens": 63000,
      "totalOutputTokens": 28000,
      "totalCostUSD": 0.63,
      "byModel": {
        "claude-sonnet-4-6": { "requests": 30, "cost": 0.50 },
        "claude-haiku-4-5": { "requests": 12, "cost": 0.13 }
      }
    }
  },
  "monthlySummary": {
    "2026-03": {
      "totalRequests": 1250,
      "totalInputTokens": 1850000,
      "totalOutputTokens": 920000,
      "totalCostUSD": 18.75
    }
  }
}
```

#### API 响应处理（自动提取 Token）

```typescript
interface TokenUsage {
  inputTokens: number;    // 从 API 响应的 usage.input_tokens 提取
  outputTokens: number;   // 从 API 响应的 usage.output_tokens 提取
  model: string;          // 使用的模型 ID
  timestamp: string;      // ISO 时间戳
  sessionId: string;      // 所属会话
  type: "chat" | "tool_use" | "skill";
  skillName?: string;     // 技能名称（如果适用）
}

// Anthropic SDK 响应示例
const response = await client.messages.create({...});
// 自动提取：
// response.usage.input_tokens  → inputTokens
// response.usage.output_tokens → outputTokens
```

#### 费用计算函数

```typescript
function calculateCost(usage: TokenUsage, pricing: PricingConfig): number {
  const modelPrice = pricing[usage.model];
  if (!modelPrice) return 0;

  const inputCost = (usage.inputTokens / 1_000_000) * modelPrice.input_per_million;
  const outputCost = (usage.outputTokens / 1_000_000) * modelPrice.output_per_million;

  return Number((inputCost + outputCost).toFixed(6));
}
```

#### UI 展示位置

1. **对话界面底部**：每次 AI 回复后显示 `📊 输入 1,500 | 输出 800 | $0.0165`
2. **侧边栏统计面板**：日/周/月趋势图、模型占比饼图
3. **设置页面**：查看/配置模型价格、设置月预算提醒
4. **导出功能**：导出 CSV/JSON 格式的消费记录

---

## 数据安全与信息安全原则

> 信息安全是第一要素，人性化是第一体验原则

1. **本地优先**：所有对话历史、执行记录存储在本地，不上传云端
2. **执行前确认**：任何实际动作（发邮件、运行脚本、修改文件）都必须用户手动确认
3. **AI 只是辅助**：AI 可以建议、生成、分析，但不能独立做出影响真实世界的操作
4. **可审计**：所有 AI 请求和响应均有完整 JSON 记录，随时可查
5. **单测保障**：每个技能和核心模块必须有单元测试（使用 Ollama 本地模型，不依赖云端 API）

---

## 技术规范（CLAUDE.md 提炼）

| 规范 | 要求 |
|------|------|
| **技术栈** | TypeScript + Electron |
| **代码注释** | 每次功能实现必须添加中文注释 |
| **单元测试** | 每个功能必须附带单测，使用 Ollama 本地模型 |
| **安全原则** | 信息安全第一，人文关怀主导，AI 只做辅助 |
| **最终决策** | 所有执行动作由人确认，AI 不得自主执行 |

---

## 项目结构（规划）

```
latte_agent/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── index.ts             # 应用入口
│   │   └── ipc/                 # 主进程 IPC 通道
│   ├── renderer/                # Electron 渲染进程（Vue）
│   │   ├── App.vue              # 主界面
│   │   ├── components/
│   │   │   ├── ChatWindow.vue   # 对话主界面
│   │   │   ├── SkillPreview.vue # 技能执行预览
│   │   │   ├── ConfirmDialog.vue# 命令确认弹窗
│   │   │   └── editors/        # 各类 AI 编辑器组件
│   │   └── stores/              # 状态管理（Pinia）
│   ├── plugins/                 # 插件系统
│   │   ├── registry.ts          # 插件注册表
│   │   ├── loader.ts            # 插件加载器
│   │   ├── types.ts             # 插件类型定义
│   │   ├── compilers/          # 编译器插件
│   │   │   ├── nodejs/          # Node.js
│   │   │   ├── python/          # Python
│   │   │   ├── go/              # Go
│   │   │   ├── rust/            # Rust
│   │   │   └── ...              # 更多编译器
│   │   ├── editors/            # 编辑器插件
│   │   │   ├── code/            # 代码编辑器
│   │   │   ├── markdown/       # Markdown 编辑器
│   │   │   ├── jupyter/         # Jupyter Notebook
│   │   │   ├── image/            # 图片编辑器
│   │   │   └── ...              # 更多编辑器
│   │   ├── skills/            # 技能插件
│   │   │   ├── email/           # 发邮件
│   │   │   ├── script/          # 脚本执行
│   │   │   └── ...              # 更多技能
│   │   └── composite/        # 复合插件
│   │       ├── webdev/           # Web 开发套件
│   │       ├── data-analysis/   # 数据分析套件
│   │       └── ...
│   ├── mcp/                      # MCP 服务（内置）
│   │   ├── server.ts           # MCP 服务器
│   │   ├── tools.ts            # 工具注册管理
│   │   ├── resources.ts        # 资源管理
│   │   └── prompts.ts          # Prompt 模板
│   ├── ai/                      # AI 接入层
│   │   ├── client.ts            # 多模型统一接口
│   │   ├── anthropic.ts         # Claude 接入
│   │   └── ollama.ts            # Ollama 本地模型（单测用）
│   └── storage/                 # 持久化层
│       ├── session.ts           # 对话历史 JSON 存储
│       ├── history.ts           # 技能执行记录
│       └── plugins.ts           # 插件配置存储
├── tests/                       # 单元测试
├── CLAUDE.md                    # AI 编码规范
└── README.md                    # 本文档
```

---

## 开发路线（最小可测试单元）

每个阶段都是一个**可独立验证的完整功能流程**，确保增量开发、增量验证。

---

### 阶段一：核心框架 + 基础对话

**目标**：能和 AI 对话，历史可回溯

| 功能 | 说明 |
|------|------|
| Electron + Vue 框架 | 主窗口、进程通信 |
| 对话界面 | 消息输入框、消息列表、AI 回复渲染 |
| AI 客户端 | 对接 Claude API（可配置模型/密钥） |
| 对话历史持久化 | JSON 文件存储，重启后恢复 |

**验收测试（E2E）**：
```
1. 启动应用 → 看到对话界面
2. 输入 "你好" → AI 回复 "你好！有什么可以帮你的？"
3. 关闭应用 → 重新打开 → 历史对话还在
4. 输入长文本 → 正确显示（无截断/乱码）
```

---

### 阶段二：插件系统 + MCP 服务

**目标**：能安装插件，插件可注册 MCP 工具

| 功能 | 说明 |
|------|------|
| 插件注册表 | 管理已安装插件列表 |
| 插件加载器 | 动态加载插件代码 |
| 插件类型定义 | BasePlugin 接口 + 四类子接口 |
| MCP Service | 内置服务，支持 Tools/Resources/Prompts 动态注册 |
| 插件配置存储 | settings.json 读写 |

**验收测试（E2E）**：
```
1. 手动放置一个模拟插件到 plugins/ 目录
2. 启动应用 → 插件自动加载
3. 在对话中让 AI 调用插件的 MCP 工具
4. AI 返回工具执行结果
5. 查看 settings.json → 插件配置已保存
```

---

### 阶段三：AI 文本编辑器插件

**目标**：AI 驱动的文本编辑器，支持意图 → 生成 → Diff → 接受/拒绝

| 功能 | 说明 |
|------|------|
| AI 编辑器基类 | 共享能力：上下文感知、无限循环修正、Diff 预览、历史版本 |
| AI 文本编辑器插件 | `ai-editor-markdown`，支持 Markdown 实时预览 |
| AI 联动触发 | Cmd+K 弹出意图输入框 |
| Diff 对比预览 | 原始 vs AI 修改，高亮增删 |
| 接受/拒绝/再修改 | 用户决策循环 |

**验收测试（E2E）**：
```
1. 安装 ai-editor-markdown 插件
2. 打开编辑器 → 输入 "# 标题\n\n这是正文"
3. 选中正文 → Cmd+K → 输入 "把这段改得更正式"
4. AI 生成修改 → 显示 Diff（绿色新增、红色删除）
5. 点击 "接受" → 内容更新
6. 点击 "历史" → 看到之前的版本 → 可回滚
7. 再次 Cmd+K → 输入 "太长了，缩短一点" → AI 再次修改
```

---

### 阶段四：发邮件技能插件

**目标**：技能触发 → 收集参数 → AI 辅助 → 确认 → 执行

| 功能 | 说明 |
|------|------|
| 技能系统基础 | 斜杠命令解析（`/{技能名}`） |
| 技能路由 | 匹配技能 → 触发执行流程 |
| 技能参数收集 | 缺参数时弹出表单 |
| AI 辅助生成 | 邮件正文由 AI 生成 |
| 执行确认弹窗 | 显示完整命令预览，用户确认 |
| /发邮件 技能 | 首个技能插件 |

**验收测试（E2E）**：
```
1. 安装 skill-email 插件
2. 在对话中输入 "/发邮件"
3. 弹出表单 → 填写收件人、主题
4. 正文留空 → AI 自动生成邮件正文
5. 弹出确认界面 → 显示：收件人、主题、正文、将执行的命令
6. 点击 "确认" → 显示 "邮件已发送（模拟）"
7. 查看对话历史 → 技能执行记录已保存
```

---

### 阶段五：插件市场

**目标**：能浏览、搜索、安装插件

| 功能 | 说明 |
|------|------|
| 插件市场界面 | 分类浏览（编译器/编辑器/技能/主题） |
| 搜索功能 | 按名称/标签搜索 |
| 插件详情页 | 描述、版本、MCP 贡献、依赖 |
| 安装/卸载 | 一键安装，自动解析依赖 |
| 已安装列表 | 启用/禁用/卸载 |

**验收测试（E2E）**：
```
1. 打开插件市场 → 看到 "编译器" "编辑器" "技能" 分类
2. 搜索 "python" → 显示 compiler-python 插件
3. 点击插件 → 看到详情页（描述、版本、MCP 工具列表）
4. 点击 "安装" → 进度条 → 安装完成
5. 切换到 "已安装" → 看到 compiler-python
6. 重启应用 → 插件仍然已安装
7. 点击 "卸载" → 确认 → 插件移除
```

---

### 阶段六：Node.js 编译器插件 + AI 代码编辑器

**目标**：能写代码并运行，AI 辅助编程

| 功能 | 说明 |
|------|------|
| compiler-nodejs | MCP 工具：node_run, npm_install, npm_script |
| AI 代码编辑器 | `ai-editor-code`，语法高亮、LSP |
| 编译器关联 | 编辑器关联编译器 → 一键运行 |
| AI 代码能力 | 补全、解释、重构、生成测试 |

**验收测试（E2E）**：
```
1. 安装 compiler-nodejs 和 ai-editor-code 插件
2. 打开 .js 文件 → 输入 "function add(a, b) { return a + b; }"
3. Cmd+K → 输入 "给这个函数添加 JSDoc 注释"
4. AI 生成注释 → Diff 预览 → 接受
5. 选中代码 → 右键 → "AI 生成测试"
6. AI 生成单测代码 → 新建测试文件
7. 点击 "运行" 按钮 → 调用 node_run → 显示输出
8. 故意写错代码 → 运行 → 显示错误信息
```

---

### 阶段七：Python 编译器插件 + AI Notebook 编辑器

**目标**：数据分析场景

| 功能 | 说明 |
|------|------|
| compiler-python | MCP 工具：python_run, pip_install |
| AI Notebook 编辑器 | `ai-editor-jupyter`，单元格执行 |
| 可视化 | 图表渲染 |

**验收测试（E2E）**：
```
1. 安装 compiler-python 和 ai-editor-jupyter
2. 新建 .ipynb 文件 → 添加代码单元格
3. 输入 "import pandas as pd; pd.DataFrame({'a':[1,2,3]})"
4. 点击运行 → 显示表格输出
5. Cmd+K → 输入 "添加一个柱状图可视化"
6. AI 生成新单元格 → 运行 → 显示图表
```

---

### 阶段八：Token 统计 + 费用追踪

**目标**：知道每次对话花了多少钱

| 功能 | 说明 |
|------|------|
| Token 提取 | 从 API 响应自动提取 input/output tokens |
| 费用计算 | 根据模型单价配置计算费用 |
| 统计聚合 | 按会话/日/月聚合 |
| 可视化 | 底部显示单次消耗，侧边栏显示趋势 |

**验收测试（E2E）**：
```
1. 打开设置 → 配置 claude-sonnet-4-6 价格（$3/1M 输入，$15/1M 输出）
2. 发送一条对话 → AI 回复
3. 底部显示 "📊 输入 1,200 | 输出 500 | $0.0111"
4. 打开统计面板 → 看到今日累计
5. 切换到 "本月" → 看到月度消费
6. 导出 CSV → 包含所有消费记录
```

---

### 阶段九：数据源插件（PostgreSQL）

**目标**：AI 能查询数据库

| 功能 | 说明 |
|------|------|
| datasource-postgresql | MCP 工具：db_query, db_schema |
| 连接管理 | 配置数据库连接 |
| Schema 内省 | AI 自动了解表结构 |

**验收测试（E2E）**：
```
1. 安装 datasource-postgresql 插件
2. 配置数据库连接（host, port, user, password）
3. 在对话中输入 "帮我查 users 表有多少条记录"
4. AI 调用 db_schema → 了解表结构
5. AI 调用 db_query → 执行 "SELECT COUNT(*) FROM users"
6. AI 返回结果："users 表有 1,234 条记录"
```

---

### 阶段十：通知渠道插件（Slack）

**目标**：技能执行后自动通知

| 功能 | 说明 |
|------|------|
| notify-slack | Webhook 推送 |
| 技能关联 | 技能完成后触发通知 |

**验收测试（E2E）**：
```
1. 安装 notify-slack 插件
2. 配置 Slack Webhook URL
3. 执行 /脚本 备份数据库
4. 脚本完成 → 自动发送 Slack 消息 "✅ 备份完成"
5. 在 Slack 频道看到通知
```

---

### 后续阶段（按需迭代）

| 阶段 | 内容 |
|------|------|
| 阶段十一 | 主题插件 + 主题市场 |
| 阶段十二 | 自动化工作流引擎（可视化编排） |
| 阶段十三 | AI Agent 插件（编码 Agent / 研究 Agent） |
| 阶段十四 | 存储同步插件（S3/WebDAV） |
| 阶段十五 | 模板市场 |
| 阶段十六 | 更多编译器（Go/Rust/Java/SQL） |
| 阶段十七 | 更多编辑器（图片/流程图/复合文档） |
| 阶段十八 | 多模型并行（Claude + GPT + Gemini） |

---

## 如何使用 latte-code-agent 开发本项目

本项目使用 [latte-code-agent](../README.md) 框架进行 AI 辅助开发：

```bash
# 1. 进入本项目目录
cd projects/latte_agent

# 2. 初始化 Agent 框架（生成 feature_list.json 等）
npx ts-node ../../src/cli.ts init

# 3. 每次开发一个功能
npx ts-node ../../src/cli.ts run

# 4. 查看进度
npx ts-node ../../src/cli.ts status

# 5. 有大需求要插入？
npx ts-node ../../src/cli.ts add-task --big

# 6. 有小改动要加？
npx ts-node ../../src/cli.ts add-task --small
```
