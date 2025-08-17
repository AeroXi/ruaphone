# RuaPhone

一个基于 Alpine.js 实现的AI角色扮演-手机模拟器，小手机。

本项目是从头开始原创实现，阅读了https://erane.github.io 的代码，参考了功能设计。


向二改作者 [erane老师](https://github.com/Erane) 和最初作者e老师致敬🫡 （我找不到e老师原版，故这里无法给出来源）

## 特性

- 📱 **手机界面模拟**: 逼真的手机外观和交互
- 💬 **AI聊天系统**: 支持与AI进行对话
- 📚 **世界书管理**: 创建和管理角色世界观
- ⚙️ **预设系统**: 自定义AI行为预设
- 🔑 **API配置**: 支持自定义AI API设置
- 🎨 **简洁设计**: 基于Alpine.js的响应式界面

## 技术栈

- **Alpine.js**: 轻量级JavaScript框架
- **Dexie.js**: IndexedDB数据库封装
- **Axios**: HTTP请求库
- **Font Awesome**: 图标库
- **纯HTML/CSS**: 无需构建工具

## 使用方法

1. 直接在浏览器中打开 `index.html`
2. 首次使用请先在"API设置"中配置你的AI服务
3. 开始创建聊天和体验各种功能

## 主要功能

### 聊天系统
- 创建新聊天对话
- 与AI实时对话
- 消息历史记录

### 世界书
- 创建角色背景设定
- 管理故事世界观

### 预设管理
- 自定义AI角色预设
- 快速切换不同AI行为

### API设置
- 支持OpenAI兼容API
- 自定义模型选择

## 适合人群

- 使用Claude Artifact等工具的非程序员
- 需要简单AI聊天界面的用户
- 想要自定义AI角色的创作者


## 项目结构

```
ruaphone/
├── index.html      # 主页面文件
├── styles.css      # 样式文件
├── script.js       # JavaScript逻辑
└── README.md       # 项目说明
```

## 开发说明

项目采用分离式文件架构：
- `index.html`: 结构和布局
- `styles.css`: 所有CSS样式
- `script.js`: Alpine.js逻辑和数据管理
- 外部依赖通过CDN引入

这种设计既保持了代码的清晰分离，又方便协作者理解和修改特定部分的代码。