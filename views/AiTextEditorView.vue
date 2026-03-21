<template>
  <div class="ai-text-editor flex h-full bg-[#0f0f23] text-white">
    <!-- 左侧面板 -->
    <div class="left-panel w-[280px] flex-shrink-0 bg-[#1e1e2e] border-r border-[#333] overflow-y-auto">
      <div class="p-4 space-y-3">
        <!-- 模型选择 -->
        <div class="bg-[#2d2d3f] rounded-lg p-3 space-y-2">
          <div class="text-sm font-medium text-[#e0e0e0]">🤖 模型选择</div>
          <div class="flex items-center justify-between bg-[#3d3d5c] rounded-md px-3 py-2">
            <span class="text-sm text-white">qwen3.5:35b</span>
            <span class="text-xs text-[#a0a0a0]">▼</span>
          </div>
        </div>

        <!-- 同步到其他模块 -->
        <div class="bg-[#2d2d3f] rounded-lg p-3 space-y-2">
          <div class="text-sm font-medium text-[#e0e0e0]">📤 同步到其他模块</div>
          <div class="bg-[#667eea] rounded-md px-3 py-2 flex items-center justify-center cursor-pointer hover:bg-[#5a6fdd] transition-colors">
            <span class="text-sm font-medium text-white">选择模块</span>
          </div>
        </div>

        <!-- 当前文本 -->
        <div class="bg-[#2d2d3f] rounded-lg p-3 space-y-2">
          <div class="text-sm font-medium text-[#e0e0e0]">📝 当前文本</div>
          <div class="bg-[#3d3d5c] rounded-md p-3 h-[340px] overflow-y-auto">
            <p class="text-sm text-[#888888]">[AI 返回的文本内容将显示在这里...]</p>
          </div>
        </div>

        <!-- 历史版本 -->
        <div class="bg-[#2d2d3f] rounded-lg p-3 space-y-2">
          <div class="text-sm font-medium text-[#e0e0e0]">📚 历史版本</div>
          <div class="bg-[#3d3d5c] rounded-md p-2 space-y-2 h-[220px] overflow-y-auto">
            <div class="text-xs text-[#e0e0e0] cursor-pointer hover:text-white transition-colors">▶ 10:05 版本 1</div>
            <div class="text-xs text-[#e0e0e0] cursor-pointer hover:text-white transition-colors">▶ 10:03 版本 2</div>
            <div class="text-xs text-[#e0e0e0] cursor-pointer hover:text-white transition-colors">▶ 09:58 版本 3</div>
          </div>
        </div>

        <!-- 文本模块 2 -->
        <div class="bg-[#2d2d3f] rounded-lg p-3 space-y-2">
          <div class="text-sm font-medium text-[#e0e0e0]">📝 文本模块 2</div>
          <div class="bg-[#3d3d5c] rounded-md p-3 h-[340px] overflow-y-auto">
            <p class="text-sm text-[#888888]">[AI 返回的文本内容将显示在这里...]</p>
          </div>
        </div>

        <!-- 文本模块 3 -->
        <div class="bg-[#2d2d3f] rounded-lg p-3 space-y-2">
          <div class="text-sm font-medium text-[#e0e0e0]">📝 文本模块 3</div>
          <div class="bg-[#3d3d5c] rounded-md p-3 h-[340px] overflow-y-auto">
            <p class="text-sm text-[#888888]">[AI 返回的文本内容将显示在这里...]</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧面板 -->
    <div class="right-panel w-[320px] flex-shrink-0 bg-[#1e1e2e] border-l border-[#333] overflow-y-auto">
      <div class="p-4 space-y-3">
        <!-- 新建按钮 -->
        <div class="bg-[#667eea] rounded-lg h-12 flex items-center justify-center cursor-pointer hover:bg-[#5a6fdd] transition-colors">
          <span class="text-base font-medium text-white">➕ 新建</span>
        </div>

        <!-- 对话历史 -->
        <div class="bg-[#2d2d3f] rounded-lg p-3 space-y-2">
          <div class="text-sm font-medium text-[#e0e0e0]">💬 选择文本的历史记录</div>
          <div class="bg-[#3d3d5c] rounded-md p-3 space-y-3 h-[390px] overflow-y-auto">
            <div class="bg-[#4d4d6a] rounded-lg p-3">
              <p class="text-sm text-white">用户: 帮我写一篇...</p>
            </div>
            <div class="bg-[#667eea] rounded-lg p-3">
              <p class="text-sm text-white">AI: 好的，这是一篇...</p>
            </div>
          </div>
        </div>

        <!-- 输入区 -->
        <div class="bg-[#2d2d3f] rounded-lg p-3 space-y-2">
          <div class="bg-[#3d3d5c] rounded-md p-3 h-12 flex items-center">
            <p class="text-sm text-[#888888]">输入消息...</p>
          </div>
          <div class="flex justify-end">
            <div class="bg-[#4ade80] rounded-md px-4 py-2 cursor-pointer hover:bg-[#3dd670] transition-colors">
              <span class="text-sm font-medium text-white">发送 📤</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 导入必要的依赖
import { ref, computed } from 'vue';

// 模型选项
const models = [
  { id: 'qwen3.5:35b', name: 'Qwen 3.5 35B', provider: 'ollama' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
];

// 同步目标
const syncTargets = [
  { id: 'email', name: '邮件内容', icon: '📧' },
  { id: 'markdown', name: 'Markdown 文档', icon: '📝' },
  { id: 'clipboard', name: '剪贴板', icon: '📋' },
  { id: 'file', name: '保存为文件', icon: '💾' },
];

// 对话历史
const chatHistory = [
  { role: 'user', content: '帮我写一篇...' },
  { role: 'assistant', content: '好的，这是一篇...' },
];

// 历史版本
const historyVersions = [
  { id: 'v1', time: '10:05', content: '版本 1' },
  { id: 'v2', time: '10:03', content: '版本 2' },
  { id: 'v3', time: '09:58', content: '版本 3' },
];

// 文本模块
const textModules = [
  { id: 'module1', title: '当前文本', content: '[AI 返回的文本内容将显示在这里...]' },
  { id: 'module2', title: '文本模块 2', content: '[AI 返回的文本内容将显示在这里...]' },
  { id: 'module3', title: '文本模块 3', content: '[AI 返回的文本内容将显示在这里...]' },
];

// 新建模块
const createModule = () => {
  const newModule = {
    id: `module${textModules.length + 1}`,
    title: `文本模块 ${textModules.length + 1}`,
    content: '[AI 返回的文本内容将显示在这里...]',
  };
  textModules.push(newModule);
};

// 发送消息
const sendMessage = () => {
  // 实现发送消息的逻辑
  console.log('发送消息');
};
</script>

<style scoped>
/* 自定义滚动条 */
.left-panel::-webkit-scrollbar,
.right-panel::-webkit-scrollbar {
  width: 6px;
}

.left-panel::-webkit-scrollbar-track,
.right-panel::-webkit-scrollbar-track {
  background: #1e1e2e;
}

.left-panel::-webkit-scrollbar-thumb,
.right-panel::-webkit-scrollbar-thumb {
  background: #3d3d5c;
  border-radius: 3px;
}

.left-panel::-webkit-scrollbar-thumb:hover,
.right-panel::-webkit-scrollbar-thumb:hover {
  background: #4d4d6a;
}
</style>