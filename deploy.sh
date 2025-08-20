#!/bin/bash

# RuaPhone Cloudflare Pages 部署脚本
echo "🚀 开始部署RuaPhone到Cloudflare Pages..."

# 检查是否安装了Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，请先安装Node.js"
    exit 1
fi

# 检查是否安装了npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm未安装，请先安装npm"
    exit 1
fi

# 安装依赖
echo "📦 安装项目依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

# 构建项目
echo "🔨 构建项目..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 项目构建失败"
    exit 1
fi

# 检查构建输出
if [ ! -d "dist" ]; then
    echo "❌ 构建输出目录不存在"
    exit 1
fi

echo "✅ 构建完成！"
echo "📁 构建文件位于 dist/ 目录"

# 检查是否安装了wrangler
if command -v wrangler &> /dev/null; then
    echo "🌐 检测到Wrangler CLI"
    
    # 询问是否立即部署
    read -p "是否立即部署到Cloudflare Pages? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🚀 开始部署..."
        wrangler pages deploy dist --project-name=ruaphone
        
        if [ $? -eq 0 ]; then
            echo "✅ 部署成功！"
            echo "🌐 你的应用现在可以在Cloudflare Pages上访问了"
        else
            echo "❌ 部署失败，请检查Wrangler配置"
        fi
    else
        echo "💡 手动部署命令："
        echo "   wrangler pages deploy dist --project-name=ruaphone"
    fi
else
    echo "💡 要使用Wrangler CLI部署，请运行："
    echo "   npm install -g wrangler"
    echo "   wrangler login"
    echo "   wrangler pages deploy dist --project-name=ruaphone"
fi

echo ""
echo "📋 其他部署选项："
echo "1. 通过GitHub自动部署 - 推送代码到GitHub仓库"
echo "2. 通过Cloudflare Dashboard - 上传dist目录"
echo "3. 通过CI/CD - 使用GitHub Actions"
echo ""
echo "📚 详细说明请查看 DEPLOY.md 文件"