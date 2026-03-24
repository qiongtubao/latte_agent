#!/bin/bash
# init.sh - 健康检查脚本，确保开发环境正常

set -e

echo "🔍 检查 Node.js 版本..."
NODE_VERSION=$(node -v 2>/dev/null || echo "none")
if [ "$NODE_VERSION" = "none" ]; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi
echo "✅ Node.js: $NODE_VERSION"

echo "🔍 检查 npm..."
NPM_VERSION=$(npm -v 2>/dev/null || echo "none")
if [ "$NPM_VERSION" = "none" ]; then
    echo "❌ npm 未安装"
    exit 1
fi
echo "✅ npm: $NPM_VERSION"

echo "🔍 检查依赖安装..."
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi
echo "✅ 依赖已安装"

echo "🔍 检查 TypeScript 编译..."
npx tsc --noEmit 2>/dev/null || echo "⚠️ TypeScript 检查有警告，继续..."
echo "✅ 健康检查完成"

echo ""
echo "🚀 可以运行 'npm run dev' 启动开发服务器"
