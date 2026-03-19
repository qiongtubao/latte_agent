# Latte Agent 开发历史

## 2026-03-19

### 已完成功能

#### 1. 项目初始化
- [x] 创建 Vue 3 + TypeScript 项目
- [x] 配置 Vite 构建工具
- [x] 设置深色主题 UI

#### 2. 核心功能

##### 2.1 对话系统 (ChatView)
- [x] AI 对话界面
- [x] 消息渲染（支持换行）
- [x] 意图识别（检测命令模式）
- [x] 建议命令展示
- [x] 命令执行按钮

##### 2.2 技能系统 (SkillsView)
- [x] 技能列表展示
- [x] 创建技能弹窗
- [x] 参数提取（自动从命令模板解析）
- [x] 运行技能
- [x] 删除技能
- [x] 示例技能（hello）

##### 2.3 任务系统 (TasksView)
- [x] 任务列表
- [x] 创建任务弹窗
- [x] 子任务独立对话
- [x] 任务状态管理（进行中/已完成）
- [x] 合并任务结果

##### 2.4 代码编辑器 (CodeView)
- [x] 语法高亮（JS/TS/Python/Bash/SQL）
- [x] JavaScript 代码执行
- [x] 执行历史记录
- [x] 复制/格式化功能

##### 2.5 图表设计 (DiagramView)
- [x] Mermaid 语法支持
- [x] 流程图/时序图/类图/状态图/思维导图
- [x] 实时预览
- [x] 导出 SVG

##### 2.6 Markdown 编辑器 (MarkdownView)
- [x] 实时预览
- [x] 工具栏快捷操作
- [x] 导入/导出 .md 和 .html
- [x] 字数统计

##### 2.7 图片编辑器 (ImageEditorView)
- [x] 图片上传/下载
- [x] 绘制工具（画笔、橡皮擦）
- [x] 滤镜调整（亮度、对比度、饱和度、模糊、灰度、复古、反色）
- [x] 图片变换（旋转、翻转）
- [x] 撤销/重做

##### 2.8 3D 建模展示 (Model3DView)
- [x] Three.js 渲染
- [x] 10 种基础几何体
- [x] 轨道控制器（旋转/缩放/平移）
- [x] 线框模式、自动旋转
- [x] 粒子特效
- [x] 截图导出

##### 2.9 测试功能 (TestView)
- [x] Ollama 模型连接
- [x] 模型列表获取
- [x] LLM 意图分析
- [x] 命令提取
- [x] 命令执行验证
- [x] 测试用例管理

##### 2.10 安全机制
- [x] 命令执行确认弹窗
- [x] 确认后执行机制（provide/inject）

---

## 技术栈

- **前端框架**: Vue 3 (Composition API)
- **语言**: TypeScript
- **构建工具**: Vite
- **样式**: 原生 CSS
- **3D 渲染**: Three.js
- **图片处理**: Canvas API

---

## 项目结构

```
src/
├── App.vue
├── main.ts
├── vite-env.d.ts
├── views/
│   ├── ChatView.vue        # 对话
│   ├── CodeView.vue        # 代码编辑
│   ├── DiagramView.vue     # 图表设计
│   ├── MarkdownView.vue    # Markdown 编辑
│   ├── ImageEditorView.vue # 图片编辑
│   ├── Model3DView.vue     # 3D 建模
│   ├── SkillsView.vue      # 技能
│   ├── TasksView.vue       # 任务
│   └── TestView.vue        # 测试
└── components/
    └── ConfirmModal.vue    # 确认弹窗
```

---

## 依赖

- `three` - 3D 渲染库
- `fabric` - 图片编辑库（备用）
- `mermaid` - 图表渲染
- `marked` - Markdown 解析
- `highlight.js` - 代码高亮
