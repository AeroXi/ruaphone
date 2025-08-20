// Initialize Database
const db = new Dexie('RuaPhoneDB');

// Define all tables in version 4 to avoid upgrade issues
db.version(5).stores({
    chats: '&id, name, type, personaId, created',
    messages: '&id, chatId, timestamp, role',
    apiConfig: '&id',
    worldBooks: '&id, name, created',
    presets: '&id, name, created',
    personas: '&id, name, avatar, persona, created',
    globalSettings: '&id',
    moments: '&id, userId, userName, timestamp, content',
    momentsComments: '&id, momentId, userId, userName, timestamp',
    momentsLikes: '&id, momentId, userId, userName, timestamp'
});

// For development: force upgrade to latest version
db.open().catch(function(error) {
    console.error('Database failed to open:', error);
    // If database schema has changed, delete and recreate
    if (error.name === 'VersionError') {
        console.log('Database version conflict, recreating...');
        db.delete().then(() => {
            console.log('Database recreated');
            window.location.reload();
        });
    }
});

// Debug function to reset database
window.resetDatabase = async function() {
    try {
        await db.delete();
        console.log('Database deleted');
        window.location.reload();
    } catch (error) {
        console.error('Failed to reset database:', error);
    }
};

// Default prompt templates
const DEFAULT_PROMPT_SINGLE = `你现在扮演一个名为"{chat.name}"的角色。

# 当前情景信息
- **当前时间是：{currentTime}**。
- **用户所在城市为:{myAddress}{worldBookContent}**

# 你的角色设定：
{char.persona}

# 对话者的角色设定：
{user.persona}

# 你的任务：
1. 严格保持你的人设进行对话。
2. 你的回复必须是一个JSON数组格式的字符串，每个元素是一条消息。
3. 你必须一次性生成1到5条消息，模拟真人在短时间内连续发送多条信息的情景。
4. 不要说任何与角色无关的话，不要解释自己是AI。
5. 当用户发送图片时，请自然地对图片内容做出反应。
6. 如果用户超过一个小时没有发送消息，则默认结束当前话题，因为用户可能是去办什么事。你可以询问，例如"怎么这么久没回我？刚才有事吗？"
7. 当用户说今天你们做了什么事时，顺着ta的话说即可，就当做你们真的做了这件事。

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
        
        async createChat(name, type = 'single', persona = '', personaId = '', avatar = '') {
            const chat = {
                id: Date.now().toString(),
                name: name,
                type: type,
                persona: persona,
                personaId: personaId,
                created: Date.now(),
                avatar: avatar || 'https://via.placeholder.com/40'
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
                        .replace('{char.persona}', chat.persona || '友好的AI助手')
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
                    // Gemini API format - convert OpenAI format to Gemini format
                    const contents = [];
                    
                    // Process messages and convert to Gemini format
                    for (let i = 0; i < messagesPayload.length; i++) {
                        const msg = messagesPayload[i];
                        
                        if (msg.role === 'system') {
                            // For Gemini, system messages are added as user messages with specific instructions
                            contents.push({
                                role: 'user',
                                parts: [{ text: `System instructions: ${msg.content}` }]
                            });
                        } else if (msg.role === 'user') {
                            contents.push({
                                role: 'user',
                                parts: [{ text: msg.content }]
                            });
                        } else if (msg.role === 'assistant') {
                            contents.push({
                                role: 'model',
                                parts: [{ text: msg.content }]
                            });
                        }
                    }
                    
                    // Ensure conversation starts with user message for Gemini
                    if (contents.length === 0 || contents[0].role !== 'user') {
                        contents.unshift({
                            role: 'user',
                            parts: [{ text: systemPrompt }]
                        });
                    }
                    
                    const apiKey = Alpine.store('settings').getRandomApiKey(apiConfig.apiKey);
                    const model = apiConfig.model || 'gemini-1.5-flash';
                    
                    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-goog-api-key': apiKey
                        },
                        body: JSON.stringify({
                            contents: contents,
                            generationConfig: {
                                temperature: 0.8,
                                topK: 40,
                                topP: 0.95,
                                maxOutputTokens: 2048,
                                candidateCount: 1
                            },
                            safetySettings: [
                                {
                                    category: "HARM_CATEGORY_HARASSMENT",
                                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                                },
                                {
                                    category: "HARM_CATEGORY_HATE_SPEECH", 
                                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                                },
                                {
                                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                                },
                                {
                                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                                }
                            ]
                        })
                    });
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        let errorData;
                        try {
                            errorData = JSON.parse(errorText);
                        } catch {
                            errorData = { error: { message: errorText } };
                        }
                        throw new Error(`Gemini API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
                    }
                    
                    const data = await response.json();
                    const aiResponseContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    
                    if (!aiResponseContent) {
                        throw new Error('Invalid response format from Gemini API: ' + JSON.stringify(data));
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
                // Clean up the response content
                let cleanContent = responseContent.trim();
                
                // Remove common markdown code block formatting if present
                if (cleanContent.startsWith('```json')) {
                    cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                } else if (cleanContent.startsWith('```')) {
                    cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
                }
                
                // Try to parse as JSON array first
                let messages;
                try {
                    messages = JSON.parse(cleanContent);
                    if (!Array.isArray(messages)) {
                        // If it's not an array, try to extract array from the response
                        const arrayMatch = cleanContent.match(/\[(.*)\]/s);
                        if (arrayMatch) {
                            try {
                                messages = JSON.parse(arrayMatch[0]);
                            } catch {
                                messages = [cleanContent];
                            }
                        } else {
                            messages = [cleanContent];
                        }
                    }
                } catch {
                    // Try to extract JSON array pattern manually
                    const arrayMatch = cleanContent.match(/\[([\s\S]*)\]/);
                    if (arrayMatch) {
                        try {
                            messages = JSON.parse(arrayMatch[0]);
                        } catch {
                            // If still fails, split by commas and clean up
                            const parts = arrayMatch[1].split(/",\s*"/);
                            messages = parts.map(part => 
                                part.replace(/^["'\s]+|["'\s]+$/g, '')
                            ).filter(part => part.length > 0);
                        }
                    } else {
                        // Last resort: treat as single message
                        messages = [cleanContent];
                    }
                }
                
                // Process each message
                for (let i = 0; i < messages.length; i++) {
                    const msg = messages[i];
                    let messageContent;
                    let senderName = null;
                    
                    if (typeof msg === 'string') {
                        messageContent = msg.trim();
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
                    
                    // Skip empty messages
                    if (!messageContent || messageContent.trim().length === 0) {
                        continue;
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
                // Fallback: save as single message, but clean it up first
                let fallbackContent = responseContent.trim();
                
                // Remove any JSON array formatting from display
                if (fallbackContent.startsWith('[') && fallbackContent.endsWith(']')) {
                    try {
                        const parsed = JSON.parse(fallbackContent);
                        if (Array.isArray(parsed)) {
                            fallbackContent = parsed.join('\n\n');
                        }
                    } catch {
                        // Keep original if can't parse
                    }
                }
                
                const aiMessage = {
                    id: Date.now().toString(),
                    chatId: chatId,
                    content: fallbackContent,
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
        },
        
        // Update default model when API type changes
        updateApiType(newType) {
            this.apiConfig.apiType = newType;
            if (newType === 'gemini') {
                this.apiConfig.model = 'gemini-1.5-flash';
                this.apiConfig.baseURL = ''; // Gemini doesn't need base URL
            } else {
                this.apiConfig.model = 'gpt-3.5-turbo';
                if (!this.apiConfig.baseURL) {
                    this.apiConfig.baseURL = 'https://api.openai.com';
                }
            }
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
                name: '默认人设',
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

    Alpine.store('personas', {
        personas: [],
        
        async loadPersonas() {
            this.personas = await db.personas.orderBy('created').reverse().toArray();
        },
        
        async createPersona(name, avatar, persona) {
            const personaItem = {
                id: Date.now().toString(),
                name: name,
                avatar: avatar,
                persona: persona,
                created: Date.now()
            };
            
            await db.personas.add(personaItem);
            await this.loadPersonas();
            return personaItem.id;
        },
        
        async updatePersona(id, data) {
            await db.personas.update(id, data);
            await this.loadPersonas();
        },
        
        async deletePersona(id) {
            await db.personas.delete(id);
            await this.loadPersonas();
        }
    });

    Alpine.store('moments', {
        moments: [],
        comments: [],
        likes: [],
        showCreateModal: false,
        
        async loadMoments() {
            const rawMoments = await db.moments.orderBy('timestamp').reverse().toArray();
            // 反序列化图片数组
            this.moments = rawMoments.map(moment => ({
                ...moment,
                images: moment.images ? JSON.parse(moment.images) : []
            }));
            await this.loadCommentsAndLikes();
        },
        
        async loadCommentsAndLikes() {
            this.comments = await db.momentsComments.orderBy('timestamp').toArray();
            this.likes = await db.momentsLikes.orderBy('timestamp').toArray();
        },
        
        async createMoment(content, images = [], location = '') {
            try {
                console.log('Creating moment with content:', content);
                const moment = {
                    id: Date.now().toString(),
                    userId: 'user',
                    userName: '我',
                    userAvatar: '👤',
                    content: content,
                    images: JSON.stringify(images), // 序列化数组为字符串
                    location: location,
                    timestamp: Date.now()
                };
                
                console.log('Moment object:', moment);
                console.log('Database moments table:', db.moments);
                
                await db.moments.add(moment);
                console.log('Moment added to database');
                
                await this.loadMoments();
                console.log('Moments reloaded, total count:', this.moments.length);
                
                return moment.id;
            } catch (error) {
                console.error('Error in createMoment:', error);
                throw error;
            }
        },
        
        async addComment(momentId, content, replyTo = null) {
            const comment = {
                id: Date.now().toString(),
                momentId: momentId,
                userId: 'user',
                userName: '我',
                content: content,
                replyTo: replyTo,
                timestamp: Date.now()
            };
            
            await db.momentsComments.add(comment);
            await this.loadCommentsAndLikes();
            return comment.id;
        },
        
        async toggleLike(momentId) {
            const existingLike = this.likes.find(l => l.momentId === momentId && l.userId === 'user');
            
            if (existingLike) {
                await db.momentsLikes.delete(existingLike.id);
            } else {
                const like = {
                    id: Date.now().toString(),
                    momentId: momentId,
                    userId: 'user',
                    userName: '我',
                    timestamp: Date.now()
                };
                await db.momentsLikes.add(like);
            }
            
            await this.loadCommentsAndLikes();
        },
        
        getMomentsComments(momentId) {
            return this.comments.filter(c => c.momentId === momentId);
        },
        
        getMomentsLikes(momentId) {
            return this.likes.filter(l => l.momentId === momentId);
        },
        
        isLikedByUser(momentId) {
            return this.likes.some(l => l.momentId === momentId && l.userId === 'user');
        },
        
        formatTime(timestamp) {
            const now = Date.now();
            const diff = now - timestamp;
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);
            
            if (minutes < 1) return '刚刚';
            if (minutes < 60) return `${minutes}分钟前`;
            if (hours < 24) return `${hours}小时前`;
            if (days < 7) return `${days}天前`;
            
            const date = new Date(timestamp);
            return `${date.getMonth() + 1}月${date.getDate()}日`;
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
                await Alpine.store('app').loadGlobalSettings();
                await Alpine.store('chat').loadChats();
                await Alpine.store('settings').loadConfig();
                await Alpine.store('worldBook').loadBooks();
                await Alpine.store('presets').loadPresets();
                await Alpine.store('personas').loadPersonas();
                await Alpine.store('moments').loadMoments();
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
            // 使用模态框创建聊天
            document.dispatchEvent(new CustomEvent('open-create-chat'));
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
            const name = prompt('请输入人设名称:');
            if (name && name.trim()) {
                await Alpine.store('presets').createPreset(name.trim(), '');
            }
        },

        // Persona functions
        async createNewPersona() {
            const name = prompt('请输入人设名称:');
            if (name && name.trim()) {
                await Alpine.store('personas').createPersona(name.trim(), 'https://via.placeholder.com/40', '');
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

// Moments Interface Component
function momentsInterface() {
    return {
        activeCommentInput: null,
        commentText: '',
        newMomentContent: '',
        newImageUrl: '',
        newMomentImages: [],
        newMomentLocation: '',
        
        showCreateMoment() {
            Alpine.store('moments').showCreateModal = true;
            this.resetCreateForm();
        },
        
        hideCreateMoment() {
            Alpine.store('moments').showCreateModal = false;
            this.resetCreateForm();
        },
        
        resetCreateForm() {
            this.newMomentContent = '';
            this.newImageUrl = '';
            this.newMomentImages = [];
            this.newMomentLocation = '';
        },
        
        addImage() {
            if (this.newImageUrl.trim() && this.newMomentImages.length < 9) {
                this.newMomentImages.push(this.newImageUrl.trim());
                this.newImageUrl = '';
            }
        },
        
        removeImage(index) {
            this.newMomentImages.splice(index, 1);
        },
        
        async publishMoment() {
            if (!this.newMomentContent.trim()) {
                console.log('No content to publish');
                return;
            }
            
            try {
                console.log('Publishing moment:', this.newMomentContent.trim());
                console.log('Images:', this.newMomentImages);
                console.log('Location:', this.newMomentLocation.trim());
                
                await Alpine.store('moments').createMoment(
                    this.newMomentContent.trim(),
                    this.newMomentImages,
                    this.newMomentLocation.trim()
                );
                
                console.log('Moment published successfully');
                this.hideCreateMoment();
                
                // Scroll to top to show new moment
                this.$nextTick(() => {
                    const container = this.$refs.momentsContainer;
                    if (container) {
                        container.scrollTop = 0;
                    }
                });
            } catch (error) {
                console.error('Failed to publish moment:', error);
                alert('发布失败，请重试');
            }
        },
        
        showCommentInput(momentId) {
            this.activeCommentInput = this.activeCommentInput === momentId ? null : momentId;
            this.commentText = '';
        },
        
        async submitComment(momentId) {
            if (!this.commentText.trim()) return;
            
            await Alpine.store('moments').addComment(momentId, this.commentText.trim());
            this.commentText = '';
            this.activeCommentInput = null;
        },
        
        showImage(imageUrl) {
            // 简单的图片查看功能
            window.open(imageUrl, '_blank');
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