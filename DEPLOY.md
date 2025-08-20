# RuaPhone - Cloudflare Pages 部署指南

本指南将帮助你将RuaPhone项目部署到Cloudflare Pages，享受全球CDN加速和免费托管。

## 🚀 快速部署

### 方法一：通过GitHub自动部署（推荐）

1. **准备GitHub仓库**
   ```bash
   # 如果还没有推送到GitHub
   git add .
   git commit -m "准备部署到Cloudflare Pages"
   git push origin main
   ```

2. **配置Cloudflare Pages**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 进入 "Pages" 部分
   - 点击 "创建项目" → "连接到Git"
   - 选择你的GitHub仓库 `ruaphone`

3. **构建设置**
   ```
   构建命令: npm run build
   构建输出目录: dist
   根目录: /
   ```

4. **环境变量**（可选）
   ```
   ENVIRONMENT=production
   ```

5. **完成部署**
   - 点击 "保存并部署"
   - 首次部署大约需要1-3分钟
   - 部署完成后会得到一个 `*.pages.dev` 域名

### 方法二：通过Wrangler CLI部署

1. **安装Wrangler**
   ```bash
   npm install -g wrangler
   # 或者使用本地安装
   npm install wrangler --save-dev
   ```

2. **登录Cloudflare**
   ```bash
   wrangler login
   ```

3. **构建和部署**
   ```bash
   npm install
   npm run build
   wrangler pages deploy dist --project-name=ruaphone
   ```

## 📦 项目结构

```
ruaphone/
├── src/
│   ├── index.html          # 主HTML文件
│   ├── script.js          # 主JavaScript文件
│   ├── styles.css         # 样式文件
│   ├── sw.js             # Service Worker
│   └── manifest.json     # PWA清单
├── dist/                 # 构建输出目录
├── .github/workflows/    # GitHub Actions
├── build.js             # 构建脚本
├── wrangler.toml        # Cloudflare配置
└── package.json         # 项目配置
```

## 🔧 构建优化

项目自动进行以下优化：

- **HTML压缩**: 移除注释和空白，优化属性
- **CSS压缩**: Level 2优化，减小文件体积
- **JS压缩**: 移除console.log，变量名混淆
- **HTTP头优化**: 安全头和缓存策略
- **PWA支持**: Service Worker和Manifest

## 🌐 自定义域名

1. **添加域名**
   - 在Cloudflare Pages项目设置中
   - 点击 "自定义域名"
   - 添加你的域名（如 `ruaphone.com`）

2. **DNS配置**
   - 添加CNAME记录指向 `your-project.pages.dev`
   - 或者将域名托管到Cloudflare并自动配置

3. **SSL证书**
   - Cloudflare会自动提供SSL证书
   - 支持通配符证书

## ⚡ 性能优化

### 1. 缓存策略
```
HTML文件: 不缓存，确保实时更新
CSS/JS文件: 长期缓存(1年)，文件名包含哈希
静态资源: 适度缓存(1天-1周)
```

### 2. CDN加速
- 全球200+边缘节点
- 自动图片优化
- Brotli压缩

### 3. 预加载优化
```html
<link rel="preload" href="styles.css" as="style">
<link rel="preload" href="script.js" as="script">
```

## 🔒 安全配置

### HTTP安全头
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: 自定义策略
```

### CORS配置
```javascript
// 在wrangler.toml中配置
[[headers]]
for = "/*"
[headers.values]
"Access-Control-Allow-Origin" = "*"
```

## 🔄 CI/CD流程

### GitHub Actions自动部署
```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages
on:
  push:
    branches: [main]
  
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - uses: cloudflare/pages-action@v1
```

### 环境变量设置
在GitHub仓库设置中添加Secrets：
```
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_ACCOUNT_ID=your_account_id
```

## 📱 PWA功能

### 离线支持
- Service Worker缓存关键资源
- 离线时显示缓存内容
- 后台数据同步

### 安装提示
```javascript
// 自动显示PWA安装提示
window.addEventListener('beforeinstallprompt', (e) => {
  // 显示自定义安装按钮
});
```

## 🐛 故障排除

### 常见问题

1. **构建失败**
   ```bash
   # 检查依赖
   npm install
   
   # 本地测试构建
   npm run build
   ```

2. **部署超时**
   - 检查文件大小，单个文件不超过25MB
   - 总项目大小不超过20GB

3. **PWA不工作**
   - 确保使用HTTPS
   - 检查manifest.json格式
   - 验证Service Worker注册

4. **API调用失败**
   - 检查CORS设置
   - 确认API密钥配置
   - 查看浏览器控制台错误

### 调试命令
```bash
# 本地开发服务器
npm run dev

# 构建预览
npm run build && npm run preview

# 查看构建日志
wrangler pages deployment list --project-name=ruaphone
```

## 📊 监控和分析

### Cloudflare Analytics
- 访问量统计
- 性能指标
- 错误监控

### 自定义监控
```javascript
// 添加到script.js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    console.log('SW Message:', event.data);
  });
}
```

## 🎯 最佳实践

1. **定期更新依赖**
   ```bash
   npm audit
   npm update
   ```

2. **代码分割**
   - 按功能模块分离代码
   - 懒加载非关键组件

3. **资源优化**
   - 压缩图片
   - 使用WebP格式
   - 实施图片懒加载

4. **性能监控**
   - 使用Lighthouse检测
   - 监控Core Web Vitals
   - 定期性能审计

## 📞 技术支持

如果遇到问题：

1. 查看 [Cloudflare Pages文档](https://developers.cloudflare.com/pages/)
2. 检查项目的GitHub Issues
3. 访问 [Cloudflare社区](https://community.cloudflare.com/)

---

✨ **享受你的RuaPhone应用在全球的高速访问！**