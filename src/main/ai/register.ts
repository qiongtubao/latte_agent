/**
 * AI 提供商注册入口
 * 导入所有提供商实现，触发自动注册
 * 必须在 main/index.ts 中最先导入
 */

// 导入所有 provider 实现（每个文件末尾会调用 registerProvider）
import './anthropic'
import './ollama'
import './openai-compatible'
