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

## 🎨 自定义聊天气泡样式

RuaPhone 支持用户自定义聊天气泡的CSS样式。如果你想使用AI（如Claude、ChatGPT等）来生成个性化的聊天气泡样式，请使用以下通用Prompt模板：

### AI生成CSS的Prompt模板

```
你好，我正在为RuaPhone项目生成自定义聊天气泡CSS代码。请帮我生成符合要求的CSS样式。

**项目技术信息：**
- 项目使用Alpine.js和纯CSS，无构建工具
- 聊天气泡HTML结构如下：
```html
<div class="message-wrapper user/ai">
  <div class="message message-bubble user/ai">
    <div class="avatar">头像</div>
    <div class="message-content content">
      <div class="message-text">消息内容</div>
      <div class="message-time">时间</div>
    </div>
  </div>
</div>
```

**重要的CSS选择器：**
- `.message-bubble.user .content` - 用户消息气泡
- `.message-bubble.ai .content` - AI消息气泡  
- `.message-bubble.user .message-text` - 用户消息文本
- `.message-bubble.ai .message-text` - AI消息文本

**默认样式参考：**
- 用户气泡背景色：#95ec69（浅绿色）
- AI气泡背景色：white（白色）
- 气泡圆角：6px
- 内边距：10px 15px
- 最大宽度：280px

**技术要求：**
1. 必须使用上述选择器，确保兼容性
2. 如果添加伪元素（如小尾巴），需要设置 `overflow: visible !important`
3. z-index值应为正数（如z-index: 1）
4. 支持响应式设计
5. 避免使用 `!important` 除非必要

**我的需求：**
[在这里描述你想要的气泡样式，例如：]
- 我想要圆形气泡，带有阴影效果
- 希望用户消息是蓝色渐变，AI消息是灰色渐变
- 想要添加气泡小尾巴，指向头像方向
- 希望鼠标悬停时有放大动画效果

请生成完整的CSS代码，并说明如何使用。如果我的需求不够详细，请继续询问具体要求。
```

### 使用方法

1. **复制上述Prompt模板**
2. **在"我的需求"部分详细描述你想要的气泡样式**
3. **将完整Prompt发送给任意AI（Claude、ChatGPT、通义千问等）**
4. **获得CSS代码后，复制到RuaPhone的"API设置 > 聊天主题设置 > 自定义CSS"中**
5. **实时预览效果，满意后保存**

### 常见样式需求示例

- **渐变气泡**：线性或径向渐变背景
- **气泡尾巴**：三角形指向头像的小尾巴
- **动画效果**：淡入、弹跳、摇摆等动画
- **特殊形状**：圆形、胶囊形、不规则形状
- **主题色彩**：深色模式、彩虹色、毛玻璃效果
- **交互效果**：悬停动画、点击反馈

### 注意事项

- 生成的CSS会实时应用到聊天界面
- 可以随时修改和调整样式
- 建议先在小范围测试，确认效果后再保存
- 如遇到显示问题，可以清空自定义CSS恢复默认样式