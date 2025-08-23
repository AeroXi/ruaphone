---
description: "发布版本到生产环境 - 完整的发布流程"
allowed-tools: "Bash(*),Read(*),Edit(*)"
---

# 发布到生产环境 🚀

执行完整的发布流程，包括代码提交、版本更新和部署。

## 执行步骤：

1. **检查当前状态并提交代码**
2. **推送到远程仓库** 
3. **更新版本号** (minor版本，适用于新功能)
4. **构建并部署到Cloudflare Pages**

## 开始发布流程...

首先检查git状态并提交未提交的更改：

!git status

如果有未提交的更改，先提交：

!git add -A
!git commit -m "chore: prepare for release"

推送到远程仓库：

!git push

更新版本号（新功能使用minor版本）：

!npm run version:minor

最后部署到Cloudflare：

!npm run deploy

## ✅ 发布完成！

检查最终状态：

!git status

版本已发布到生产环境！🎉