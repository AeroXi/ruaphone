// Initialize Database
const db = new Dexie('RuaPhoneDB');
db.version(1).stores({
    chats: '&id, name, type, created',
    messages: '&id, chatId, timestamp, role',
    apiConfig: '&id',
    worldBooks: '&id, name, created',
    presets: '&id, name, created'
});

// Alpine.js Store for global state
document.addEventListener('alpine:init', () => {
    Alpine.store('app', {
        // UI State
        currentPage: 'home',
        currentChatId: null,
        isLoading: false,
        isPWA: false,
        
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
        
        async generateAIResponse(chatId, userMessage) {
            const apiConfig = Alpine.store('settings').apiConfig;
            
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
                
                const response = await axios.post(`${apiConfig.baseURL}/v1/chat/completions`, {
                    model: apiConfig.model,
                    messages: [
                        { role: 'user', content: userMessage }
                    ]
                }, {
                    headers: {
                        'Authorization': `Bearer ${apiConfig.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                const aiMessage = {
                    id: Date.now().toString(),
                    chatId: chatId,
                    content: response.data.choices[0].message.content,
                    role: 'assistant',
                    timestamp: Date.now()
                };
                
                await db.messages.add(aiMessage);
                await this.loadMessages(chatId);
                
            } catch (error) {
                console.error('AI response error:', error);
                const errorMessage = {
                    id: Date.now().toString(),
                    chatId: chatId,
                    content: '抱歉，AI响应出错了',
                    role: 'assistant',
                    timestamp: Date.now()
                };
                await db.messages.add(errorMessage);
                await this.loadMessages(chatId);
            } finally {
                Alpine.store('app').setLoading(false);
            }
        }
    });

    Alpine.store('settings', {
        apiConfig: {
            baseURL: '',
            apiKey: '',
            model: 'gpt-3.5-turbo'
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