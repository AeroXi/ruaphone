// Initialize Database
const db = new Dexie('RuaPhoneDB');

// Define all tables in version 7 to add enabled field to worldBooks
db.version(7).stores({
    chats: '&id, name, type, personaId, created',
    messages: '&id, chatId, timestamp, role',
    apiConfig: '&id',
    worldBooks: '&id, name, enabled, created',
    personas: '&id, name, avatar, persona, created',
    globalSettings: '&id',
    moments: '&id, userId, userName, timestamp, content',
    momentsComments: '&id, momentId, userId, userName, timestamp',
    momentsLikes: '&id, momentId, userId, userName, timestamp',
    userProfile: '&id, avatar, name, gender, age, bio, updated'
});

// Version 8: Add message type support for special messages
db.version(8).stores({
    chats: '&id, name, type, personaId, created',
    messages: '&id, chatId, timestamp, role, type', // Add type index for message types
    apiConfig: '&id',
    worldBooks: '&id, name, enabled, created',
    personas: '&id, name, avatar, persona, created',
    globalSettings: '&id',
    moments: '&id, userId, userName, timestamp, content',
    momentsComments: '&id, momentId, userId, userName, timestamp',
    momentsLikes: '&id, momentId, userId, userName, timestamp',
    userProfile: '&id, avatar, name, gender, age, bio, updated'
}).upgrade(tx => {
    // Migrate existing messages to have type: 'text'
    console.log('Upgrading database to version 8: Adding message types...');
    return tx.messages.toCollection().modify(message => {
        // Set type to 'text' for all existing messages if not already set
        if (!message.type) {
            message.type = 'text';
        }
    });
});

// Database upgrade and error handling
db.open().catch(function(error) {
    console.error('Database failed to open:', error);
    
    if (error.name === 'VersionError') {
        // Version conflict detected - show user options instead of auto-delete
        const upgradeDatabase = () => {
            if (confirm(
                '检测到数据库结构已更新，需要升级数据库。\n\n' +
                '选择"确定"将尝试保留现有数据并升级\n' +
                '选择"取消"将不进行任何操作\n\n' +
                '如果升级失败，您可以选择导出数据后重置数据库。'
            )) {
                // Try to upgrade gracefully
                handleDatabaseUpgrade();
            } else {
                console.log('Database upgrade cancelled by user');
                // Show upgrade required message
                showUpgradeRequiredMessage();
            }
        };
        
        // Delay the prompt to allow page to load
        setTimeout(upgradeDatabase, 1000);
    }
});

// Database management functions (protected in production)
if (typeof window !== 'undefined') {
    // Only expose debug functions in development
    const isDevelopment = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.port;
    
    if (isDevelopment) {
        window.resetDatabase = async function() {
            if (confirm('⚠️ 警告: 这将删除所有数据！\n\n确定要重置数据库吗？此操作无法撤销。')) {
                try {
                    await db.delete();
                    console.log('Database deleted');
                    window.location.reload();
                } catch (error) {
                    console.error('Failed to reset database:', error);
                }
            }
        };
        
        console.log('Development mode: resetDatabase() function available');
    }
    
    // Always available database management functions
    window.exportData = exportAllData;
    window.importData = importAllData;
}

// Image utility functions
window.compressImage = function(file, maxWidth = 800, maxHeight = 800, quality = 0.8) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            // Calculate new dimensions
            let { width, height } = img;
            
            if (width > height) {
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedDataUrl);
        };
        
        img.src = URL.createObjectURL(file);
    });
};

window.fileToBase64 = function(file) {
    return new Promise((resolve, reject) => {
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            reject(new Error('图片文件过大，请选择小于5MB的图片'));
            return;
        }
        
        // Check file type
        if (!file.type.startsWith('image/')) {
            reject(new Error('请选择图片文件'));
            return;
        }
        
        // Compress and convert to base64
        window.compressImage(file).then(dataUrl => {
            resolve(dataUrl);
        }).catch(reject);
    });
};

// Database upgrade handling function
async function handleDatabaseUpgrade() {
    try {
        console.log('Attempting database upgrade...');
        
        // Try to backup existing data first
        let backupData = null;
        try {
            backupData = await exportAllData(false); // Don't show download
            console.log('Backup created successfully');
        } catch (backupError) {
            console.warn('Could not create backup:', backupError);
        }
        
        // Close the current database connection
        db.close();
        
        // Delete the old database
        await db.delete();
        console.log('Old database deleted');
        
        // Reinitialize with new structure
        await db.open();
        console.log('New database structure created');
        
        // Try to restore data if backup was successful
        if (backupData) {
            try {
                await importAllData(backupData, false);
                console.log('Data restored from backup');
                alert('✅ 数据库升级成功！数据已恢复。');
            } catch (restoreError) {
                console.error('Failed to restore data:', restoreError);
                alert('⚠️ 数据库已升级，但数据恢复失败。\n\n请检查浏览器控制台的详细错误信息。');
            }
        } else {
            alert('⚠️ 数据库已升级，但无法备份旧数据。\n\n如果您之前有重要数据，请联系技术支持。');
        }
        
        // Reload the page to reinitialize everything
        window.location.reload();
        
    } catch (error) {
        console.error('Database upgrade failed:', error);
        alert('❌ 数据库升级失败: ' + error.message + '\n\n请刷新页面重试，或联系技术支持。');
    }
}

// Show upgrade required message
function showUpgradeRequiredMessage() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        padding: 24px;
        border-radius: 12px;
        max-width: 400px;
        text-align: center;
        margin: 20px;
    `;
    
    dialog.innerHTML = `
        <h2 style="color: #ff6b35; margin-top: 0;">📱 需要数据库升级</h2>
        <p>检测到数据库结构已更新，需要升级才能正常使用应用。</p>
        <div style="margin: 20px 0;">
            <button onclick="location.reload()" style="
                background: #007AFF;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                margin: 5px;
            ">重试升级</button>
            <button onclick="window.exportData && window.exportData()" style="
                background: #34C759;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                margin: 5px;
            ">导出数据</button>
        </div>
        <small style="color: #666;">
            如果问题持续，可以先导出数据备份，然后刷新页面。
        </small>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
}

// Data export function
async function exportAllData(showDownload = true) {
    try {
        console.log('Exporting all data...');
        
        const exportData = {
            exportVersion: '1.0',
            exportDate: new Date().toISOString(),
            appVersion: 5, // Current database version
            data: {}
        };
        
        // Export all table data
        const tables = ['chats', 'messages', 'apiConfig', 'worldBooks', 'presets', 'personas', 'globalSettings', 'moments', 'momentsComments', 'momentsLikes'];
        
        for (const tableName of tables) {
            try {
                const tableData = await db[tableName].toArray();
                exportData.data[tableName] = tableData;
                console.log(`Exported ${tableName}: ${tableData.length} records`);
            } catch (error) {
                console.warn(`Failed to export ${tableName}:`, error);
                exportData.data[tableName] = [];
            }
        }
        
        // Create downloadable file if requested
        if (showDownload) {
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `ruaphone-backup-${new Date().toISOString().split('T')[0]}.json`;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up object URL
            setTimeout(() => URL.revokeObjectURL(link.href), 1000);
            
            console.log('Data exported and download triggered');
        }
        
        return exportData;
        
    } catch (error) {
        console.error('Export failed:', error);
        if (showDownload) {
            alert('导出失败: ' + error.message);
        }
        throw error;
    }
}

// Data import function
async function importAllData(importData = null, showFileInput = true) {
    try {
        let dataToImport = importData;
        
        // If no data provided and file input requested, show file selector
        if (!dataToImport && showFileInput) {
            dataToImport = await new Promise((resolve, reject) => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                
                input.onchange = (event) => {
                    const file = event.target.files[0];
                    if (!file) {
                        reject(new Error('No file selected'));
                        return;
                    }
                    
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const data = JSON.parse(e.target.result);
                            resolve(data);
                        } catch (error) {
                            reject(new Error('Invalid JSON file: ' + error.message));
                        }
                    };
                    reader.onerror = () => reject(new Error('Failed to read file'));
                    reader.readAsText(file);
                };
                
                input.click();
            });
        }
        
        if (!dataToImport) {
            throw new Error('No data to import');
        }
        
        // Validate import data structure
        if (!dataToImport.exportVersion || !dataToImport.data) {
            throw new Error('Invalid backup file format');
        }
        
        console.log('Starting data import...');
        console.log('Export version:', dataToImport.exportVersion);
        console.log('Export date:', dataToImport.exportDate);
        console.log('App version:', dataToImport.appVersion);
        
        // Confirm import with user if showing UI
        if (showFileInput) {
            const confirmImport = confirm(
                `📥 导入数据确认\n\n` +
                `备份日期: ${dataToImport.exportDate ? new Date(dataToImport.exportDate).toLocaleString('zh-CN') : '未知'}\n` +
                `数据版本: ${dataToImport.appVersion || '未知'}\n\n` +
                `⚠️ 警告: 导入将覆盖所有现有数据！\n\n` +
                `确定要继续导入吗？此操作无法撤销。`
            );
            
            if (!confirmImport) {
                console.log('Import cancelled by user');
                return false;
            }
        }
        
        // Clear existing data and import new data
        const tables = ['chats', 'messages', 'apiConfig', 'worldBooks', 'presets', 'personas', 'globalSettings', 'moments', 'momentsComments', 'momentsLikes'];
        
        for (const tableName of tables) {
            try {
                // Clear existing data
                await db[tableName].clear();
                
                // Import new data if available
                const tableData = dataToImport.data[tableName] || [];
                if (tableData.length > 0) {
                    await db[tableName].bulkAdd(tableData);
                }
                
                console.log(`Imported ${tableName}: ${tableData.length} records`);
            } catch (error) {
                console.warn(`Failed to import ${tableName}:`, error);
                // Continue with other tables even if one fails
            }
        }
        
        // Reload all Alpine stores
        setTimeout(async () => {
            try {
                await Alpine.store('app').loadGlobalSettings();
                await Alpine.store('chat').loadChats();
                await Alpine.store('settings').loadConfig();
                await Alpine.store('worldBook').loadBooks();
                await Alpine.store('personas').loadPersonas();
                await Alpine.store('profile').loadProfile();
                await Alpine.store('moments').loadMoments();
                
                console.log('All stores reloaded after import');
                
                if (showFileInput) {
                    alert('✅ 数据导入成功！页面将刷新以应用更改。');
                    window.location.reload();
                }
            } catch (error) {
                console.error('Failed to reload stores after import:', error);
                if (showFileInput) {
                    alert('⚠️ 数据导入完成，但页面状态更新失败。请刷新页面。');
                }
            }
        }, 500);
        
        return true;
        
    } catch (error) {
        console.error('Import failed:', error);
        if (showFileInput) {
            alert('导入失败: ' + error.message);
        }
        throw error;
    }
}

// Smart API URL builder function
function buildApiURL(baseURL, endpoint = '/chat/completions') {
    if (!baseURL) {
        throw new Error('Base URL is required');
    }
    
    // Clean up the base URL
    let cleanBaseURL = baseURL.trim();
    
    // Remove trailing slash
    if (cleanBaseURL.endsWith('/')) {
        cleanBaseURL = cleanBaseURL.slice(0, -1);
    }
    
    // Handle different base URL formats:
    // Format 1: https://example.com/v1 -> https://example.com/v1/chat/completions
    // Format 2: https://example.com -> https://example.com/v1/chat/completions
    
    let apiURL;
    
    if (cleanBaseURL.endsWith('/v1')) {
        // Format 1: baseURL already includes /v1
        apiURL = `${cleanBaseURL}${endpoint}`;
    } else {
        // Format 2: baseURL doesn't include /v1, need to add it
        apiURL = `${cleanBaseURL}/v1${endpoint}`;
    }
    
    console.log(`API URL built: ${baseURL} -> ${apiURL}`);
    return apiURL;
}

// Test the URL builder function (only in development)
if (typeof window !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.port)) {
    window.testApiURL = function() {
        console.log('Testing API URL builder...');
        
        // Test cases
        const testCases = [
            'https://api.openai.com',
            'https://api.openai.com/',
            'https://api.openai.com/v1',
            'https://api.openai.com/v1/',
            'https://api.example.com',
            'https://api.example.com/',
            'https://api.example.com/v1',
            'https://api.example.com/v1/',
            'http://localhost:8080',
            'http://localhost:8080/v1'
        ];
        
        testCases.forEach(testURL => {
            try {
                const result = buildApiURL(testURL);
                console.log(`✅ ${testURL} -> ${result}`);
            } catch (error) {
                console.log(`❌ ${testURL} -> Error: ${error.message}`);
            }
        });
        
        console.log('URL builder test completed!');
    };
    
    console.log('Development mode: testApiURL() function available');
}

// Default prompt templates
const DEFAULT_PROMPT_SINGLE = `你现在扮演一个名为"{chat.name}"的角色。

# 当前情景信息
- **当前时间是：{currentTime}**。

# 核心世界观设定 (必须严格遵守以下所有设定)
{worldBookContent}

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
8.对话内容要符合世界观。

# 特殊消息能力
你可以发送以下类型的特殊消息：

## 语音消息
当你想要发送语音消息时（比如想要表达情感、急迫、私密等），使用以下格式：
{"type": "voice", "content": "语音内容文字"}

## 转账
当你想要给用户转账表达情感或在特殊情况下时，使用以下格式：
{"type": "transfer", "amount": 520, "note": "转账备注"}

## 撤回消息  
当你想要撤回刚发的消息时，使用以下格式：
{"type": "recall", "content": "刚才发送的内容"}

# JSON输出格式示例:
- 普通消息：["很高兴认识你呀，在干嘛呢？", "对了，今天天气不错，要不要出去走走？"]
- 混合消息：["文本消息", {"type": "voice", "content": "我刚才想到一件事，等下和你说"}, {"type": "transfer", "amount": 100, "note": "请你喝奶茶"}]

现在，请根据以上的规则和下面的对话历史，继续进行对话。`;

const DEFAULT_PROMPT_GROUP = `你是一个群聊的组织者和AI驱动器。你的任务是扮演以下所有角色，在群聊中进行互动。

# 群聊规则
1. **角色扮演**: 你必须同时扮演以下所有角色，并严格遵守他们的人设。
2. **当前时间**: {currentTime}。
3. **用户角色**: 用户的名字是"我"，你在群聊中对用户的称呼是"{myNickname}"，在需要时请使用"@{myNickname}"来提及用户。
4. **输出格式**: 你的回复**必须**是一个JSON数组。每个元素格式为：
   - 普通消息: {"name": "角色名", "message": "文本内容"}
   - 语音消息: {"name": "角色名", "type": "voice", "content": "语音内容"}
   - 转账消息: {"name": "角色名", "type": "transfer", "amount": 金额, "note": "备注"}
   - 撤回消息: {"name": "角色名", "type": "recall", "content": "撤回的内容"}
5. **对话节奏**: 模拟真实群聊，让成员之间互相交谈，或者一起回应用户的发言。
6. **数量限制**: 每次生成的总消息数**不得超过10条**。
7. **禁止出戏**: 绝不能透露你是AI。
8. **禁止擅自代替"我"说话**: 在回复中你不能代替用户说话。

# 特殊消息使用场景
- **语音消息**: 当角色想要表达强烈情感、急迫事情或私密内容时
- **转账**: 当角色想要表达感谢、道歉、庆祝或其他特殊情感时
- **撤回**: 当角色想要撤回刚说的话（比如说错话、太激动等）

# 群成员列表及人设
{membersList}

现在，请根据以上规则和下面的对话历史，继续这场群聊。`;

// PromptBuilder - 统一管理 Prompt 构建的模块
class PromptBuilder {
    constructor() {
        this.debugMode = false;
        this.templates = {
            single: DEFAULT_PROMPT_SINGLE,
            group: DEFAULT_PROMPT_GROUP
        };
    }
    
    // 设置调试模式
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }
    
    // 构建用户个人资料上下文
    buildUserProfileContext() {
        const profile = Alpine.store('profile').profile;
        if (!profile.name && !profile.gender && !profile.age && !profile.bio) {
            return '';
        }
        
        let profileContext = '\n\n# 用户个人资料';
        if (profile.name) profileContext += `\n- **姓名**: ${profile.name}`;
        if (profile.gender) profileContext += `\n- **性别**: ${profile.gender}`;
        if (profile.age) profileContext += `\n- **年龄**: ${profile.age}`;
        if (profile.bio) profileContext += `\n- **个人简介**: ${profile.bio}`;
        
        return profileContext;
    }
    
    // 构建系统 prompt
    async buildSystemPrompt(chatType, chatData, context = {}) {
        let template = this.templates[chatType];
        let systemPrompt;
        
        if (chatType === 'group') {
            const membersList = (chatData.members || []).map(m => `- **${m.name}**: ${m.persona}`).join('\n');
            const myNickname = chatData.myNickname || '我';
            
            systemPrompt = template
                .replace('{currentTime}', context.currentTime)
                .replace('{myNickname}', myNickname)
                .replace('{membersList}', membersList);
        } else {
            const userProfileContext = this.buildUserProfileContext();
            
            systemPrompt = template
                .replace('{chat.name}', chatData.name)
                .replace('{currentTime}', context.currentTime)
                .replace('{myAddress}', context.myAddress || '未知城市')
                .replace('{worldBookContent}', context.worldBookContent || '')
                .replace('{char.persona}', chatData.persona || '友好的AI助手')
                .replace('{user.persona}', context.userPersona || '普通用户');
            
            // 在私聊中添加用户个人资料
            systemPrompt += userProfileContext;
        }
        
        // 调试输出
        if (this.debugMode) {
            this.debugOutput('系统 Prompt', systemPrompt);
        }
        
        return systemPrompt;
    }
    
    // 调试输出
    debugOutput(title, content) {
        console.group(`🔧 PromptBuilder Debug: ${title}`);
        console.log(content);
        console.groupEnd();
    }
    
    // 输出完整的消息载荷用于调试
    debugMessagesPayload(messagesPayload) {
        if (this.debugMode) {
            console.group('🔧 PromptBuilder Debug: 完整消息载荷');
            console.log('消息数量:', messagesPayload.length);
            messagesPayload.forEach((msg, index) => {
                console.log(`[${index}] ${msg.role}:`, msg.content);
            });
            console.groupEnd();
        }
    }
}

// 全局 PromptBuilder 实例
window.promptBuilder = new PromptBuilder();

// Alpine.js Store for global state
document.addEventListener('alpine:init', () => {
    Alpine.store('app', {
        // UI State
        currentPage: 'home',
        currentChatId: null,
        isLoading: false,
        isPWA: false,
        storageStatus: 'unknown', // persistent, not-persistent, unknown
        customCSSSaving: false,
        customCSSSaved: false,
        
        // Global Settings
        globalSettings: {
            activePresetId: null,
            myAddress: '未知城市',
            myPersona: '普通用户',
            maxMemory: 20,
            debugPrompt: false,
            customCSS: ''
        },
        
        // Initialize global settings
        async loadGlobalSettings() {
            const settings = await db.globalSettings.get('main');
            if (settings) {
                this.globalSettings = { ...this.globalSettings, ...settings };
            } else {
                await this.saveGlobalSettings();
            }
            // Apply custom CSS after loading settings
            this.applyCustomCSS();
        },
        
        async saveGlobalSettings() {
            await db.globalSettings.put({ 
                id: 'main',
                ...this.globalSettings
            });
        },
        
        // Custom CSS Management
        applyCustomCSS() {
            // Remove existing custom CSS
            const existingStyle = document.getElementById('custom-chat-css');
            if (existingStyle) {
                existingStyle.remove();
            }
            
            // Apply new custom CSS if exists
            if (this.globalSettings.customCSS.trim()) {
                const style = document.createElement('style');
                style.id = 'custom-chat-css';
                style.textContent = this.globalSettings.customCSS;
                document.head.appendChild(style);
            }
        },
        
        async saveCustomCSS(css) {
            try {
                this.customCSSSaving = true;
                this.customCSSSaved = false;
                
                this.globalSettings.customCSS = css;
                await this.saveGlobalSettings();
                this.applyCustomCSS();
                
                this.customCSSSaved = true;
                
                // 2秒后隐藏成功状态
                setTimeout(() => {
                    this.customCSSSaved = false;
                }, 2000);
            } catch (error) {
                console.error('保存自定义CSS失败:', error);
                alert('保存失败，请重试');
            } finally {
                this.customCSSSaving = false;
            }
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
        },
        
        // Storage persistence management
        async checkStorageStatus() {
            if (!navigator.storage || !navigator.storage.persisted) {
                this.storageStatus = 'not-supported';
                return 'not-supported';
            }
            
            try {
                const isPersistent = await navigator.storage.persisted();
                this.storageStatus = isPersistent ? 'persistent' : 'not-persistent';
                return this.storageStatus;
            } catch (error) {
                console.error('Failed to check storage status:', error);
                this.storageStatus = 'unknown';
                return 'unknown';
            }
        },
        
        async requestPersistentStorage() {
            if (!navigator.storage || !navigator.storage.persist) {
                return false;
            }
            
            try {
                const granted = await navigator.storage.persist();
                await this.checkStorageStatus(); // Update status
                return granted;
            } catch (error) {
                console.error('Failed to request persistent storage:', error);
                return false;
            }
        },
        
        async showStoragePrompt() {
            // Silent storage permission handling - no user prompts
            const status = await this.checkStorageStatus();
            
            if (status === 'not-persistent' || status === 'unknown') {
                // Silently try to request persistent storage without user prompt
                try {
                    const granted = await this.requestPersistentStorage();
                    if (granted) {
                        console.log('✅ Persistent storage granted silently');
                    } else {
                        console.log('⚠️ Persistent storage not granted, using temporary storage');
                    }
                } catch (error) {
                    console.log('Failed to request persistent storage:', error);
                }
            }
            
            return status;
        }
    });

    Alpine.store('chat', {
        chats: [],
        currentMessages: [],
        
        async loadChats() {
            this.chats = await db.chats.orderBy('created').reverse().toArray();
            
            // Add lastMessage display for each chat
            for (let chat of this.chats) {
                const messages = await db.messages.where('chatId').equals(chat.id).toArray();
                if (messages.length > 0) {
                    const lastMsg = messages[messages.length - 1];
                    chat.lastMessage = this.getLastMessageDisplay(lastMsg);
                } else {
                    chat.lastMessage = '暂无消息';
                }
            }
        },
        
        // Helper method to get last message display text
        getLastMessageDisplay(message) {
            if (!message) return '暂无消息';
            
            let displayText = '';
            
            switch(message.type) {
                case 'voice':
                    displayText = '[语音]';
                    break;
                case 'image':
                    displayText = '[图片]';
                    break;
                case 'transfer':
                    displayText = '[转账]';
                    break;
                case 'recall':
                    displayText = '撤回了一条消息';
                    break;
                case 'sticker':
                    displayText = '[表情]';
                    break;
                default:
                    displayText = message.content?.substring(0, 20) || '消息';
                    if (displayText.length > 20) displayText += '...';
                    break;
            }
            
            // For group chats, add sender name
            if (message.senderName) {
                return `${message.senderName}: ${displayText}`;
            }
            
            return displayText;
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
            // 先清空避免串扰
            this.currentMessages = [];
            
            this.currentMessages = await db.messages
                .where('chatId')
                .equals(chatId)
                .toArray();
            
            // Sort by timestamp
            this.currentMessages.sort((a, b) => a.timestamp - b.timestamp);
        },
        
        async sendMessage(chatId, messageData, role = 'user') {
            // Support both old format (string) and new format (object with type)
            let message;
            
            if (typeof messageData === 'string') {
                // Legacy text message format
                message = {
                    id: Date.now().toString(),
                    chatId: chatId,
                    content: messageData,
                    role: role,
                    type: 'text',
                    timestamp: Date.now()
                };
            } else {
                // New message object format with type support
                message = {
                    id: Date.now().toString(),
                    chatId: chatId,
                    role: role,
                    timestamp: Date.now(),
                    type: messageData.type || 'text',
                    content: messageData.content || '',
                    ...messageData // Spread additional properties (imageUrl, voiceDuration, etc.)
                };
            }
            
            await db.messages.add(message);
            await this.loadMessages(chatId);
            await this.loadChats(); // Refresh chat list to update last message
            
            // Note: AI response is now triggered manually, not automatically
        },
        
        async generateAIResponse(chatId) {
            const apiConfig = Alpine.store('settings').apiConfig;
            const globalSettings = Alpine.store('app').globalSettings;
            
            // 根据全局设置启用调试模式
            window.promptBuilder.setDebugMode(globalSettings.debugPrompt);
            
            if (!apiConfig.apiKey || (apiConfig.apiType !== 'gemini' && !apiConfig.baseURL)) {
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
                
                // 使用 PromptBuilder 构建系统 prompt
                const currentTime = new Date().toLocaleString('zh-CN');
                const worldBookContent = await this.getWorldBookContent();
                
                const context = {
                    currentTime: currentTime,
                    myAddress: globalSettings.myAddress,
                    worldBookContent: worldBookContent,
                    userPersona: globalSettings.myPersona
                };
                
                const chatType = chat.type === 'group' ? 'group' : 'single';
                const systemPrompt = await window.promptBuilder.buildSystemPrompt(chatType, chat, context);
                
                // Convert messages to API format
                const messagesPayload = [
                    { role: 'system', content: systemPrompt },
                    ...recentMessages.map(msg => {
                        // Handle image messages with the new OpenAI format
                        if (msg.type === 'image' && msg.imageUrl) {
                            return {
                                role: msg.role,
                                content: [
                                    { 
                                        type: "image_url", 
                                        image_url: { 
                                            url: msg.imageUrl 
                                        }
                                    }
                                ]
                            };
                        }
                        // Handle regular text messages
                        return {
                            role: msg.role,
                            content: msg.content
                        };
                    })
                ];
                
                // 调试输出完整的消息载荷
                window.promptBuilder.debugMessagesPayload(messagesPayload);
                
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
                            // Handle image content for Gemini
                            if (Array.isArray(msg.content)) {
                                const parts = [];
                                for (const item of msg.content) {
                                    if (item.type === 'image_url') {
                                        // Convert base64 data URL to Gemini format
                                        const base64Match = item.image_url.url.match(/^data:image\/([^;]+);base64,(.+)$/);
                                        if (base64Match) {
                                            parts.push({
                                                inline_data: {
                                                    mime_type: `image/${base64Match[1]}`,
                                                    data: base64Match[2]
                                                }
                                            });
                                        }
                                    } else if (item.type === 'text') {
                                        parts.push({ text: item.text });
                                    }
                                }
                                contents.push({
                                    role: 'user',
                                    parts: parts
                                });
                            } else {
                                contents.push({
                                    role: 'user',
                                    parts: [{ text: msg.content }]
                                });
                            }
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
                            'X-goog-api-key': apiKey
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
                    // OpenAI API format - smart URL handling
                    const apiKey = Alpine.store('settings').getRandomApiKey(apiConfig.apiKey);
                    const apiURL = buildApiURL(apiConfig.baseURL);
                    
                    response = await fetch(apiURL, {
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
                    let aiMessage = null;
                    
                    if (typeof msg === 'string') {
                        // Simple text message
                        aiMessage = {
                            id: `${Date.now()}_${i}`,
                            chatId: chatId,
                            content: msg.trim(),
                            role: 'assistant',
                            type: 'text',
                            timestamp: Date.now() + i
                        };
                    } else if (typeof msg === 'object' && msg !== null) {
                        const baseMessage = {
                            id: `${Date.now()}_${i}`,
                            chatId: chatId,
                            role: 'assistant',
                            timestamp: Date.now() + i
                        };
                        
                        if (isGroup && msg.name && (msg.message || msg.content || msg.type)) {
                            // Group message - can be text or special type
                            aiMessage = {
                                ...baseMessage,
                                senderName: msg.name
                            };
                            
                            if (msg.type) {
                                // Special message in group
                                aiMessage.type = msg.type;
                                aiMessage.content = msg.content || '';
                                
                                // Add type-specific properties
                                this.addSpecialMessageProperties(aiMessage, msg);
                            } else {
                                // Text message in group
                                aiMessage.type = 'text';
                                aiMessage.content = msg.message || msg.content || '';
                            }
                        } else if (msg.type) {
                            // Special message type
                            aiMessage = {
                                ...baseMessage,
                                type: msg.type,
                                content: msg.content || ''
                            };
                            
                            // Add type-specific properties
                            this.addSpecialMessageProperties(aiMessage, msg);
                        } else {
                            // Fallback: treat as text
                            aiMessage = {
                                ...baseMessage,
                                type: 'text',
                                content: JSON.stringify(msg)
                            };
                        }
                    } else {
                        // Fallback for other types
                        aiMessage = {
                            id: `${Date.now()}_${i}`,
                            chatId: chatId,
                            content: String(msg),
                            role: 'assistant',
                            type: 'text',
                            timestamp: Date.now() + i
                        };
                    }
                    
                    // Skip empty messages
                    if (!aiMessage || !aiMessage.content || aiMessage.content.trim().length === 0) {
                        continue;
                    }
                    
                    await db.messages.add(aiMessage);
                }
                
                await this.loadMessages(chatId);
                await this.loadChats(); // Refresh chat list to update last message
                
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
                await this.loadChats(); // Refresh chat list to update last message
            }
        },
        
        // Helper method to add special message type properties
        addSpecialMessageProperties(aiMessage, msgData) {
            switch (msgData.type) {
                case 'voice':
                    aiMessage.voiceDuration = msgData.duration || Math.ceil((msgData.content || '').length / 5);
                    break;
                case 'image':
                    aiMessage.imageUrl = msgData.url || msgData.imageUrl;
                    break;
                case 'transfer':
                    aiMessage.transferAmount = parseFloat(msgData.amount) || 0;
                    aiMessage.transferNote = msgData.note || '';
                    break;
                case 'recall':
                    aiMessage.originalMessageId = msgData.originalMessageId;
                    break;
                case 'sticker':
                    aiMessage.stickerUrl = msgData.url || msgData.stickerUrl;
                    break;
            }
        },
        
        async getWorldBookContent() {
            try {
                const worldBooks = await db.worldBooks.toArray();
                if (worldBooks.length === 0) return '';
                
                // Only include enabled world books
                const enabledBooks = worldBooks.filter(book => book.enabled === true);
                if (enabledBooks.length === 0) return '';
                
                return '\n\n# 世界设定\n' + enabledBooks.map(book => 
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
        
        // Model list management
        availableModels: [],
        modelsLoading: false,
        modelsError: null,
        modelsLastFetch: null,
        
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
                // Clear models and auto-fetch Gemini models
                this.availableModels = [];
                if (this.apiConfig.apiKey) {
                    this.fetchAvailableModels();
                }
            } else {
                this.apiConfig.model = 'gpt-3.5-turbo';
                if (!this.apiConfig.baseURL) {
                    this.apiConfig.baseURL = 'https://api.openai.com';
                }
                // Auto-fetch models for OpenAI-compatible APIs
                this.fetchAvailableModels();
            }
        },
        
        // Fetch available models from API
        async fetchAvailableModels() {
            // Check if we need to fetch (cache for 5 minutes)
            const now = Date.now();
            const cacheTime = 5 * 60 * 1000; // 5 minutes
            if (this.modelsLastFetch && (now - this.modelsLastFetch) < cacheTime && this.availableModels.length > 0) {
                console.log('Using cached models');
                return this.availableModels;
            }
            
            // For Gemini, check API key; for others, check baseURL and apiKey
            if (this.apiConfig.apiType === 'gemini') {
                if (!this.apiConfig.apiKey) {
                    console.log('Cannot fetch Gemini models: missing apiKey');
                    this.modelsError = '请先配置 Gemini API 密钥';
                    return [];
                }
            } else {
                if (!this.apiConfig.baseURL || !this.apiConfig.apiKey) {
                    console.log('Cannot fetch models: missing baseURL or apiKey');
                    this.modelsError = '请先配置 API 地址和密钥';
                    return [];
                }
            }
            
            this.modelsLoading = true;
            this.modelsError = null;
            
            try {
                console.log('Fetching available models...');
                
                const apiKey = this.getRandomApiKey(this.apiConfig.apiKey);
                let modelsURL;
                let requestOptions;
                
                if (this.apiConfig.apiType === 'gemini') {
                    // Gemini API models endpoint
                    modelsURL = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
                    requestOptions = {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    };
                } else {
                    // OpenAI-compatible APIs
                    modelsURL = buildApiURL(this.apiConfig.baseURL, '/models');
                    requestOptions = {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    };
                }
                
                const response = await fetch(modelsURL, requestOptions);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    let errorMessage = `HTTP ${response.status}`;
                    try {
                        const errorData = JSON.parse(errorText);
                        if (this.apiConfig.apiType === 'gemini') {
                            errorMessage = errorData.error?.message || errorMessage;
                        } else {
                            errorMessage = errorData.error?.message || errorMessage;
                        }
                    } catch {
                        // Use HTTP status if can't parse error
                    }
                    throw new Error(errorMessage);
                }
                
                const data = await response.json();
                console.log('Models API response:', data);
                
                let models;
                
                if (this.apiConfig.apiType === 'gemini') {
                    // Parse Gemini API response
                    if (!data.models || !Array.isArray(data.models)) {
                        throw new Error('Invalid Gemini models API response format');
                    }
                    
                    models = data.models
                        .filter(model => model.name && model.supportedGenerationMethods?.includes('generateContent'))
                        .map(model => {
                            // Extract model ID from name (e.g., "models/gemini-1.5-flash-001" -> "gemini-1.5-flash-001")
                            const modelId = model.name.replace('models/', '');
                            return {
                                id: modelId,
                                name: model.displayName || modelId,
                                owned_by: 'google',
                                version: model.version || '',
                                inputTokenLimit: model.inputTokenLimit || 0,
                                outputTokenLimit: model.outputTokenLimit || 0
                            };
                        })
                        .sort((a, b) => a.id.localeCompare(b.id));
                } else {
                    // Parse OpenAI-compatible API response
                    if (!data.data || !Array.isArray(data.data)) {
                        throw new Error('Invalid models API response format');
                    }
                    
                    models = data.data
                        .filter(model => model.id) // Only models with valid IDs
                        .map(model => ({
                            id: model.id,
                            name: model.id, // Use ID as display name
                            owned_by: model.owned_by || 'unknown',
                            created: model.created || 0
                        }))
                        .sort((a, b) => a.id.localeCompare(b.id)); // Sort alphabetically
                }
                
                this.availableModels = models;
                this.modelsLastFetch = now;
                this.modelsError = null;
                
                console.log(`Fetched ${models.length} models:`, models.map(m => m.id));
                
                // If current model is not in the list, set to first available model
                if (models.length > 0 && !models.some(m => m.id === this.apiConfig.model)) {
                    console.log(`Current model '${this.apiConfig.model}' not found, switching to '${models[0].id}'`);
                    this.apiConfig.model = models[0].id;
                }
                
                return models;
                
            } catch (error) {
                console.error('Failed to fetch models:', error);
                this.modelsError = error.message;
                
                // Fallback to default models if fetch fails
                this.availableModels = this.getDefaultModels();
                
                return this.availableModels;
            } finally {
                this.modelsLoading = false;
            }
        },
        
        // Get default models as fallback
        getDefaultModels() {
            return [
                { id: 'gpt-4', name: 'gpt-4', owned_by: 'openai' },
                { id: 'gpt-4-turbo', name: 'gpt-4-turbo', owned_by: 'openai' },
                { id: 'gpt-4o', name: 'gpt-4o', owned_by: 'openai' },
                { id: 'gpt-4o-mini', name: 'gpt-4o-mini', owned_by: 'openai' },
                { id: 'gpt-3.5-turbo', name: 'gpt-3.5-turbo', owned_by: 'openai' }
            ].sort((a, b) => a.id.localeCompare(b.id));
        },
        
        // Refresh models (force fetch)
        async refreshModels() {
            this.modelsLastFetch = null; // Clear cache
            return await this.fetchAvailableModels();
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
                enabled: true,
                created: Date.now()
            };
            
            await db.worldBooks.add(book);
            await this.loadBooks();
            return book.id;
        },
        
        async updateBook(id, data) {
            await db.worldBooks.update(id, data);
            await this.loadBooks();
        },
        
        async deleteBook(id) {
            await db.worldBooks.delete(id);
            await this.loadBooks();
        },
        
        async toggleBook(id) {
            const book = await db.worldBooks.get(id);
            if (book) {
                await db.worldBooks.update(id, { enabled: !book.enabled });
                await this.loadBooks();
            }
        },
        
        async selectAll() {
            const updates = this.books.map(book => 
                db.worldBooks.update(book.id, { enabled: true })
            );
            await Promise.all(updates);
            await this.loadBooks();
        },
        
        async deselectAll() {
            const updates = this.books.map(book => 
                db.worldBooks.update(book.id, { enabled: false })
            );
            await Promise.all(updates);
            await this.loadBooks();
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

    Alpine.store('profile', {
        profile: {
            id: 'user_profile',
            avatar: '',
            name: '',
            gender: '',
            age: '',
            bio: ''
        },
        
        async loadProfile() {
            try {
                const savedProfile = await db.userProfile.get('user_profile');
                if (savedProfile) {
                    this.profile = savedProfile;
                } else {
                    // Create default profile
                    await this.saveProfile();
                }
            } catch (error) {
                console.error('Failed to load profile:', error);
            }
        },
        
        async saveProfile() {
            try {
                this.profile.updated = Date.now();
                // Convert to plain object to avoid DataCloneError
                const profileData = {
                    id: this.profile.id,
                    avatar: this.profile.avatar,
                    name: this.profile.name,
                    gender: this.profile.gender,
                    age: this.profile.age,
                    bio: this.profile.bio,
                    updated: this.profile.updated
                };
                await db.userProfile.put(profileData);
                return true;
            } catch (error) {
                console.error('Failed to save profile:', error);
                return false;
            }
        },
        
        async updateAvatar(file) {
            try {
                const compressedImage = await window.compressImage(file);
                this.profile.avatar = compressedImage;
                return true;
            } catch (error) {
                console.error('Failed to update avatar:', error);
                return false;
            }
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
            
            // Check storage persistence silently
            setTimeout(async () => {
                await Alpine.store('app').showStoragePrompt();
            }, 1000); // Reduced delay for silent handling
            
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
                // Wait a bit to ensure all stores are defined
                await new Promise(resolve => setTimeout(resolve, 100));
                
                await Alpine.store('app').loadGlobalSettings();
                await Alpine.store('chat').loadChats();
                await Alpine.store('settings').loadConfig();
                await Alpine.store('worldBook').loadBooks();
                await Alpine.store('personas').loadPersonas();
                await Alpine.store('profile').loadProfile();
                await Alpine.store('moments').loadMoments();
                
                // Auto-fetch models for all APIs after loading config
                setTimeout(() => {
                    Alpine.store('settings').fetchAvailableModels();
                }, 1000); // Delay to let UI load
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
                this.batteryLevel = Math.max(10, Math.round(this.batteryLevel - Math.random() * 2));
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

        async createNewGroupChat() {
            // 创建群聊功能
            const groupName = prompt('请输入群聊名称:');
            if (groupName && groupName.trim()) {
                const chatId = await Alpine.store('chat').createChat(groupName.trim(), 'group');
                if (chatId) {
                    Alpine.store('chat').currentMessages = []; // 清空当前消息避免串扰
                    this.navigateTo('chat', { chatId });
                }
            }
        },

        async openChat(chatId) {
            Alpine.store('chat').currentMessages = []; // 先清空避免串扰
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

        async editWorldBook(bookId) {
            const book = Alpine.store('worldBook').books.find(b => b.id === bookId);
            if (book) {
                window.dispatchEvent(new CustomEvent('edit-world-book', {
                    detail: book
                }));
            }
        },

        showMessage(message) {
            // Simple alert for now, can be enhanced with toast notifications later
            alert(message);
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
                
                // Auto-fetch models after saving config for all APIs
                Alpine.store('settings').refreshModels();
                
                alert('API设置已保存');
            } catch (error) {
                console.error('Failed to save API config:', error);
                alert('保存失败');
            }
        },

        // Get computed properties for current page
        get currentPage() {
            return Alpine.store('app').currentPage;
        },

        // Profile management
        profileSaving: false,
        
        async handleAvatarUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            try {
                const success = await Alpine.store('profile').updateAvatar(file);
                if (success) {
                    // Clear the input for next selection
                    event.target.value = '';
                } else {
                    alert('头像上传失败，请重试');
                }
            } catch (error) {
                console.error('Failed to upload avatar:', error);
                alert('头像上传失败: ' + error.message);
            }
        },
        
        async saveProfile() {
            if (this.profileSaving) return;
            
            this.profileSaving = true;
            try {
                const success = await Alpine.store('profile').saveProfile();
                if (success) {
                    alert('✅ 个人资料保存成功');
                } else {
                    alert('❌ 保存失败，请重试');
                }
            } catch (error) {
                console.error('Failed to save profile:', error);
                alert('保存失败: ' + error.message);
            } finally {
                this.profileSaving = false;
            }
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
        },
        
        
        // Special message interactions
        playVoiceMessage(message) {
            if (message.content) {
                alert(`语音消息内容：\n${message.content}`);
            }
        },
        
        viewImage(imageUrl) {
            if (imageUrl) {
                // Create a modal to show image
                const modal = document.createElement('div');
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    cursor: pointer;
                `;
                
                const img = document.createElement('img');
                img.src = imageUrl;
                img.style.cssText = `
                    max-width: 90%;
                    max-height: 90%;
                    object-fit: contain;
                `;
                
                modal.appendChild(img);
                modal.onclick = () => modal.remove();
                document.body.appendChild(modal);
            }
        },
        
    }
}

// Moments Interface Component
function momentsInterface() {
    return {
        activeCommentInput: null,
        commentText: '',
        newMomentContent: '',
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
            this.newMomentImages = [];
            this.newMomentLocation = '';
        },
        
        async handleImageUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            if (this.newMomentImages.length >= 9) {
                alert('最多只能添加9张图片');
                return;
            }
            
            try {
                const base64 = await window.fileToBase64(file);
                this.newMomentImages.push(base64);
                // Clear the input for next selection
                event.target.value = '';
            } catch (error) {
                alert(error.message);
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