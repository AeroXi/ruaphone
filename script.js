// Initialize Database
const db = new Dexie('RuaPhoneDB');
db.version(1).stores({
    chats: '&id, name, type, created',
    messages: '&id, chatId, timestamp, role',
    apiConfig: '&id',
    worldBooks: '&id, name, created',
    presets: '&id, name, created',
    globalSettings: '&id'
});

// Default prompt templates
const DEFAULT_PROMPT_SINGLE = `你现在扮演一个名为"{chat.name}"的角色。

# 当前情景信息
- **当前时间是：{currentTime}**。
- **用户所在城市为:{myAddress}{worldBookContent}**

# 你的角色设定：
{chat.persona}

# 对话者的角色设定：
{user.persona}

# 你的任务：
1. 严格保持你的人设进行对话。
2. 你的回复必须是一个JSON数组格式的字符串，每个元素是一条消息。
3. 你必须一次性生成2到5条消息，模拟真人在短时间内连续发送多条信息的情景。
4. 不要说任何与角色无关的话，不要解释自己是AI。
5. 当用户发送图片时，请自然地对图片内容做出反应。
6. 如果用户超过一个小时没有发送消息，则默认结束当前话题，因为用户可能是去办什么事。你可以询问，例如"怎么这么久没回我？刚才有事吗？"

# JSON输出格式示例:
[
  "很高兴认识你呀，在干嘛呢？",
  "对了，今天天气不错，要不要出去走走？"
]

现在，请根据以上的规则和下面的对话历史，继续进行对话。`;

const DEFAULT_PROMPT_GROUP = `你是一个群聊的组织者和AI驱动器。你的任务是扮演以下所有角色，在群聊中进行互动。

# 群聊规则
1. **角色扮演**: 你必须同时扮演以下所有角色，并严格遵守他们的人设。
2. **当前时间**: {currentTime}。
3. **用户角色**: 用户的名字是"我"，你在群聊中对用户的称呼是"{myNickname}"，在需要时请使用"@{myNickname}"来提及用户。
4. **输出格式**: 你的回复**必须**是一个JSON数组。每个元素格式为：
   - 普通消息: {"name": "角色名", "message": "文本内容"}
5. **对话节奏**: 模拟真实群聊，让成员之间互相交谈，或者一起回应用户的发言。
6. **数量限制**: 每次生成的总消息数**不得超过10条**。
7. **禁止出戏**: 绝不能透露你是AI。
8. **禁止擅自代替"我"说话**: 在回复中你不能代替用户说话。

# 群成员列表及人设
{membersList}

现在，请根据以上规则和下面的对话历史，继续这场群聊。`;

// Alpine.js Store for global state
document.addEventListener('alpine:init', () => {
    Alpine.store('app', {
        // UI State
        currentPage: 'home',
        currentChatId: null,
        isLoading: false,
        isPWA: false,
        
        // Global Settings
        globalSettings: {
            activePresetId: null,
            myAddress: '未知城市',
            myPersona: '普通用户',
            maxMemory: 20
        },
        
        // Initialize global settings
        async loadGlobalSettings() {
            const settings = await db.globalSettings.get('main');
            if (settings) {
                this.globalSettings = { ...this.globalSettings, ...settings };
            } else {
                await this.saveGlobalSettings();
            }
        },
        
        async saveGlobalSettings() {
            await db.globalSettings.put({ 
                id: 'main',
                ...this.globalSettings
            });
        },
        
        // Navigation
        navigateTo(page, data = {}) {
            this.currentPage = page;
            if (data.chatId) {
                this.currentChatId = data.chatId;
            }
        },
        
        // Loading state
        setLoading(loading) {
            this.isLoading = loading;
        },
        
        // PWA Detection
        detectPWA() {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
            const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
            const isIOSStandalone = window.navigator.standalone === true;
            
            this.isPWA = isStandalone || isFullscreen || isIOSStandalone;
            
            // Add body class for additional CSS targeting if needed
            if (this.isPWA) {
                document.body.classList.add('pwa-mode');
            } else {
                document.body.classList.remove('pwa-mode');
            }
            
            return this.isPWA;
        }
    });

    Alpine.store('chat', {
        chats: [],
        currentMessages: [],
        
        async loadChats() {
            this.chats = await db.chats.orderBy('created').reverse().toArray();
        },
        
        async createChat(name, type = 'single') {
            const chat = {
                id: Date.now().toString(),
                name: name,
                type: type,
                created: Date.now(),
                avatar: 'https://via.placeholder.com/40'
            };
            
            await db.chats.add(chat);
            await this.loadChats();
            return chat.id;
        },
        
        async loadMessages(chatId) {
            this.currentMessages = await db.messages
                .where('chatId')
                .equals(chatId)
                .toArray();
            
            // Sort by timestamp
            this.currentMessages.sort((a, b) => a.timestamp - b.timestamp);
        },
        
        async sendMessage(chatId, content, role = 'user') {
            const message = {
                id: Date.now().toString(),
                chatId: chatId,
                content: content,
                role: role,
                timestamp: Date.now()
            };
            
            await db.messages.add(message);
            await this.loadMessages(chatId);
            
            // Note: AI response is now triggered manually, not automatically
        },
        
        async generateAIResponse(chatId) {
            const apiConfig = Alpine.store('settings').apiConfig;
            const globalSettings = Alpine.store('app').globalSettings;
            
            if (!apiConfig.apiKey || !apiConfig.baseURL) {
                const errorMessage = {
                    id: Date.now().toString(),
                    chatId: chatId,
                    content: '请先配置API设置',
                    role: 'assistant',
                    timestamp: Date.now()
                };
                await db.messages.add(errorMessage);
                await this.loadMessages(chatId);
                return;
            }
            
            try {
                Alpine.store('app').setLoading(true);
                
                const chat = this.chats.find(c => c.id === chatId);
                if (!chat) return;
                
                // Build conversation history with memory limit
                const maxMemory = globalSettings.maxMemory || 20;
                const allMessages = await db.messages.where('chatId').equals(chatId).toArray();
                const recentMessages = allMessages.slice(-maxMemory);
                
                // Construct system prompt
                const currentTime = new Date().toLocaleString('zh-CN');
                const worldBookContent = await this.getWorldBookContent();
                
                let systemPrompt;
                if (chat.type === 'group') {
                    const membersList = (chat.members || []).map(m => `- **${m.name}**: ${m.persona}`).join('\n');
                    const myNickname = chat.myNickname || '我';
                    systemPrompt = DEFAULT_PROMPT_GROUP
                        .replace('{currentTime}', currentTime)
                        .replace('{myNickname}', myNickname)
                        .replace('{membersList}', membersList);
                } else {
                    systemPrompt = DEFAULT_PROMPT_SINGLE
                        .replace('{chat.name}', chat.name)
                        .replace('{currentTime}', currentTime)
                        .replace('{myAddress}', globalSettings.myAddress || '未知城市')
                        .replace('{worldBookContent}', worldBookContent)
                        .replace('{chat.persona}', chat.persona || '友好的AI助手')
                        .replace('{user.persona}', globalSettings.myPersona || '普通用户');
                }
                
                // Convert messages to API format
                const messagesPayload = [
                    { role: 'system', content: systemPrompt },
                    ...recentMessages.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    }))
                ];
                
                // Make API call
                const isGemini = apiConfig.apiType === 'gemini';
                let response;
                
                if (isGemini) {
                    // Gemini API format
                    const contents = messagesPayload
                        .filter(msg => msg.role !== 'system')
                        .map(msg => ({
                            role: msg.role === 'assistant' ? 'model' : 'user',
                            parts: [{ text: msg.content }]
                        }));
                    
                    // Add system prompt as first user message for Gemini
                    contents.unshift({
                        role: 'user',
                        parts: [{ text: systemPrompt }]
                    });
                    
                    const apiKey = Alpine.store('settings').getRandomApiKey(apiConfig.apiKey);
                    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${apiConfig.model}:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            contents: contents,
                            generationConfig: {
                                temperature: 0.8,
                                topK: 40,
                                topP: 0.95,
                                candidateCount: 1,
                                stopSequences: []
                            }
                        })
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(`Gemini API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
                    }
                    
                    const data = await response.json();
                    const aiResponseContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    
                    if (!aiResponseContent) {
                        throw new Error('Invalid response format from Gemini API');
                    }
                    
                    await this.parseAndSaveAIResponse(chatId, aiResponseContent, chat.type === 'group');
                    
                } else {
                    // OpenAI API format
                    let baseURL = apiConfig.baseURL.trim();
                    if (baseURL.endsWith('/')) {
                        baseURL = baseURL.slice(0, -1);
                    }
                    if (baseURL.endsWith('/v1')) {
                        baseURL = baseURL.slice(0, -3);
                    }
                    
                    const apiKey = Alpine.store('settings').getRandomApiKey(apiConfig.apiKey);
                    response = await fetch(`${baseURL}/v1/chat/completions`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: apiConfig.model,
                            messages: messagesPayload,
                            temperature: 0.8,
                            stream: false
                        })
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(`OpenAI API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
                    }
                    
                    const data = await response.json();
                    const aiResponseContent = data.choices?.[0]?.message?.content;
                    
                    if (!aiResponseContent) {
                        throw new Error('Invalid response format from OpenAI API');
                    }
                    
                    await this.parseAndSaveAIResponse(chatId, aiResponseContent, chat.type === 'group');
                }
                
            } catch (error) {
                console.error('AI response error:', error);
                const errorMessage = {
                    id: Date.now().toString(),
                    chatId: chatId,
                    content: `抱歉，AI响应出错了: ${error.message}`,
                    role: 'assistant',
                    timestamp: Date.now()
                };
                await db.messages.add(errorMessage);
                await this.loadMessages(chatId);
            } finally {
                Alpine.store('app').setLoading(false);
            }
        },
        
        async parseAndSaveAIResponse(chatId, responseContent, isGroup = false) {
            try {
                // Try to parse as JSON array first
                let messages;
                try {
                    messages = JSON.parse(responseContent);
                    if (!Array.isArray(messages)) {
                        messages = [responseContent];
                    }
                } catch {
                    // If parsing fails, treat as single message
                    messages = [responseContent];
                }
                
                // Process each message
                for (let i = 0; i < messages.length; i++) {
                    const msg = messages[i];
                    let messageContent;
                    let senderName = null;
                    
                    if (typeof msg === 'string') {
                        messageContent = msg;
                    } else if (typeof msg === 'object' && msg !== null) {
                        if (isGroup && msg.name && msg.message) {
                            // Group message format
                            messageContent = msg.message;
                            senderName = msg.name;
                        } else if (msg.type) {
                            // Special message type (like image, voice, etc.)
                            // For now, just show the content or description
                            messageContent = msg.content || msg.description || JSON.stringify(msg);
                        } else {
                            messageContent = JSON.stringify(msg);
                        }
                    } else {
                        messageContent = String(msg);
                    }
                    
                    const aiMessage = {
                        id: `${Date.now()}_${i}`,
                        chatId: chatId,
                        content: messageContent,
                        role: 'assistant',
                        timestamp: Date.now() + i, // Add small offset for ordering
                        senderName: senderName // For group chats
                    };
                    
                    await db.messages.add(aiMessage);
                }
                
                await this.loadMessages(chatId);
                
            } catch (error) {
                console.error('Error parsing AI response:', error);
                // Fallback: save as single message
                const aiMessage = {
                    id: Date.now().toString(),
                    chatId: chatId,
                    content: responseContent,
                    role: 'assistant',
                    timestamp: Date.now()
                };
                await db.messages.add(aiMessage);
                await this.loadMessages(chatId);
            }
        },
        
        async getWorldBookContent() {
            try {
                const worldBooks = await db.worldBooks.toArray();
                if (worldBooks.length === 0) return '';
                
                return '\n\n# 世界设定\n' + worldBooks.map(book => 
                    `## ${book.name}\n${book.content}`
                ).join('\n\n');
            } catch (error) {
                console.error('Error loading world books:', error);
                return '';
            }
        }
    });

    Alpine.store('settings', {
        apiConfig: {
            baseURL: '',
            apiKey: '',
            model: 'gpt-3.5-turbo',
            apiType: 'openai'
        },
        
        // Helper function for multi-key API support
        getRandomApiKey(keyString) {
            if (keyString && keyString.includes(',')) {
                const keys = keyString.split(',').map(key => key.trim());
                return keys[Math.floor(Math.random() * keys.length)];
            }
            return keyString;
        },
        
        async loadConfig() {
            const config = await db.apiConfig.get('main');
            if (config) {
                this.apiConfig = { ...config };
            }
        },
        
        async saveConfig() {
            await db.apiConfig.put({ 
                id: 'main', 
                ...this.apiConfig 
            });
        }
    });

    Alpine.store('worldBook', {
        books: [],
        
        async loadBooks() {
            this.books = await db.worldBooks.orderBy('created').reverse().toArray();
        },
        
        async createBook(name, content) {
            const book = {
                id: Date.now().toString(),
                name: name,
                content: content,
                created: Date.now()
            };
            
            await db.worldBooks.add(book);
            await this.loadBooks();
            return book.id;
        }
    });

    Alpine.store('presets', {
        presets: [],
        
        async loadPresets() {
            this.presets = await db.presets.orderBy('created').reverse().toArray();
            
            // Create default preset if none exists
            if (this.presets.length === 0) {
                await this.createDefaultPreset();
            }
        },
        
        async createDefaultPreset() {
            const defaultPreset = {
                id: 'preset_default',
                name: '默认预设',
                content: {
                    promptSingle: DEFAULT_PROMPT_SINGLE,
                    promptGroup: DEFAULT_PROMPT_GROUP
                },
                created: Date.now()
            };
            
            await db.presets.add(defaultPreset);
            await this.loadPresets();
            
            // Set as active preset
            const globalSettings = Alpine.store('app').globalSettings;
            globalSettings.activePresetId = defaultPreset.id;
            await Alpine.store('app').saveGlobalSettings();
        },
        
        async createPreset(name, content) {
            const preset = {
                id: Date.now().toString(),
                name: name,
                content: content,
                created: Date.now()
            };
            
            await db.presets.add(preset);
            await this.loadPresets();
            return preset.id;
        }
    });
});

// Alpine.js Main App Component
function phoneApp() {
    return {
        // Current state
        currentTime: '',
        currentDate: '',
        batteryLevel: 100,

        // Initialize app
        async init() {
            await this.loadAllData();
            this.updateTime();
            this.updateBattery();
            
            // Detect PWA mode
            Alpine.store('app').detectPWA();
            
            // Update time every second
            setInterval(() => {
                this.updateTime();
            }, 1000);
            
            // Update battery every minute
            setInterval(() => {
                this.updateBattery();
            }, 60000);
        },

        // Load all data from stores
        async loadAllData() {
            try {
                await Alpine.store('chat').loadChats();
                await Alpine.store('settings').loadConfig();
                await Alpine.store('worldBook').loadBooks();
                await Alpine.store('presets').loadPresets();
            } catch (error) {
                console.error('Failed to load data:', error);
            }
        },

        // Update current time
        updateTime() {
            const now = new Date();
            this.currentTime = now.toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            this.currentDate = now.toLocaleDateString('zh-CN', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
            });
        },

        // Update battery level (simulated)
        updateBattery() {
            if (navigator.getBattery) {
                navigator.getBattery().then((battery) => {
                    this.batteryLevel = Math.round(battery.level * 100);
                });
            } else {
                // Simulate battery drain
                this.batteryLevel = Math.max(10, this.batteryLevel - Math.random() * 2);
            }
        },

        // Navigation helpers
        navigateTo(page, data = {}) {
            Alpine.store('app').navigateTo(page, data);
        },

        // Chat functions
        async createNewChat() {
            const name = prompt('请输入聊天对象名称:');
            if (name && name.trim()) {
                const chatId = await Alpine.store('chat').createChat(name.trim());
                this.navigateTo('chat', { chatId });
            }
        },

        async openChat(chatId) {
            await Alpine.store('chat').loadMessages(chatId);
            this.navigateTo('chat', { chatId });
        },

        // World Book functions
        async createNewWorldBook() {
            const name = prompt('请输入世界书名称:');
            if (name && name.trim()) {
                await Alpine.store('worldBook').createBook(name.trim(), '');
            }
        },

        // Preset functions
        async createNewPreset() {
            const name = prompt('请输入预设名称:');
            if (name && name.trim()) {
                await Alpine.store('presets').createPreset(name.trim(), '');
            }
        },

        // Save API configuration
        async saveApiConfig() {
            try {
                await Alpine.store('settings').saveConfig();
                alert('API设置已保存');
            } catch (error) {
                console.error('Failed to save API config:', error);
                alert('保存失败');
            }
        },

        // Get computed properties for current page
        get currentPage() {
            return Alpine.store('app').currentPage;
        }
    }
}

// Chat interface component
function chatInterface() {
    return {
        newMessage: '',
        
        get currentChat() {
            const chatId = Alpine.store('app').currentChatId;
            return Alpine.store('chat').chats.find(c => c.id === chatId);
        },
        
        get messages() {
            return Alpine.store('chat').currentMessages;
        },
        
        async sendMessage() {
            if (!this.newMessage.trim()) return;
            
            const chatId = Alpine.store('app').currentChatId;
            const message = this.newMessage.trim();
            this.newMessage = '';
            
            await Alpine.store('chat').sendMessage(chatId, message);
            
            // Scroll to bottom
            this.$nextTick(() => {
                const container = this.$refs.messagesContainer;
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            });
        },
        
        formatTime(timestamp) {
            return new Date(timestamp).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
            });
        },
        
        async triggerAIResponse() {
            const chatId = Alpine.store('app').currentChatId;
            const messages = Alpine.store('chat').currentMessages;
            
            // Get the last user message
            const lastUserMessage = messages.filter(m => m.role === 'user').pop();
            if (lastUserMessage) {
                await Alpine.store('chat').generateAIResponse(chatId, lastUserMessage.content);
                
                // Scroll to bottom
                this.$nextTick(() => {
                    const container = this.$refs.messagesContainer;
                    if (container) {
                        container.scrollTop = container.scrollHeight;
                    }
                });
            }
        },
        
        hasUserMessages() {
            const messages = Alpine.store('chat').currentMessages;
            return messages.some(m => m.role === 'user');
        },
        
        getMessageDisplay(message) {
            // For group chats, show sender name
            if (message.senderName) {
                return `${message.senderName}: ${message.content}`;
            }
            return message.content || '消息内容为空';
        }
    }
}

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}