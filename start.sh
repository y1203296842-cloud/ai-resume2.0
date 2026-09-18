#!/bin/bash
set -e

echo ""
echo "============================================"
echo "  果核AI - 一键启动"
echo "============================================"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "[错误] 未检测到 Node.js"
    echo ""
    echo "请先安装 Node.js 18 或更高版本:"
    echo "  https://nodejs.org/"
    echo ""
    echo "macOS 可使用 Homebrew 安装:"
    echo "  brew install node"
    echo ""
    echo "Ubuntu/Debian 可使用:"
    echo "  sudo apt update && sudo apt install nodejs"
    echo ""
    exit 1
fi

NODE_VER=$(node -v)
echo "[检查] Node.js 已安装: $NODE_VER"

# 检查 pnpm
if ! command -v pnpm &> /dev/null; then
    echo "[提示] 正在安装 pnpm..."
    npm install -g pnpm
    if [ $? -ne 0 ]; then
        echo "[错误] pnpm 安装失败"
        echo "请手动执行: npm install -g pnpm"
        exit 1
    fi
fi
echo "[检查] pnpm 已就绪"

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo ""
    echo "[提示] 首次运行，正在安装依赖包..."
    echo "       这可能需要几分钟，请耐心等待。"
    echo ""
    pnpm install
    if [ $? -ne 0 ]; then
        echo "[错误] 依赖安装失败"
        echo "请尝试删除 pnpm-lock.yaml 后运行 pnpm install"
        exit 1
    fi
    echo "[完成] 依赖安装成功"
fi

# 启动服务器并打开浏览器
echo ""
echo "[启动] 正在启动服务，浏览器将自动打开..."
echo ""
node scripts/easy-start.mjs

if [ $? -ne 0 ]; then
    echo ""
    echo "[错误] 服务启动失败"
    echo "请检查端口 3000 是否被占用"
    exit 1
fi
