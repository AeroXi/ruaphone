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

// Version 9: Add Minimax voice API configuration
db.version(9).stores({
    chats: '&id, name, type, personaId, created',
    messages: '&id, chatId, timestamp, role, type, voiceAudio', // Add voiceAudio for cached audio
    apiConfig: '&id',
    voiceApiConfig: '&id', // New table for voice API settings
    worldBooks: '&id, name, enabled, created',
    personas: '&id, name, avatar, persona, created',
    globalSettings: '&id',
    userProfile: '&id, avatar, name, gender, age, bio, updated'
});

// Version 10: Add group chat support with multiple personas
db.version(10).stores({
    chats: '&id, name, type, personaId, personaIds, created', // Add personaIds array for group chats
    messages: '&id, chatId, timestamp, role, type, voiceAudio, senderId', // Add senderId for group messages
    apiConfig: '&id',
    voiceApiConfig: '&id',
    worldBooks: '&id, name, enabled, created',
    personas: '&id, name, avatar, persona, created',
    globalSettings: '&id',
    userProfile: '&id, avatar, name, gender, age, bio, updated'
});

// Version 11: Add memory field to personas
db.version(11).stores({
    chats: '&id, name, type, personaId, personaIds, created',
    messages: '&id, chatId, timestamp, role, type, voiceAudio, senderId',
    apiConfig: '&id',
    voiceApiConfig: '&id',
    worldBooks: '&id, name, enabled, created',
    personas: '&id, name, avatar, persona, memory, created', // Add memory field
    globalSettings: '&id',
    userProfile: '&id, avatar, name, gender, age, bio, updated'
});

// Version 12: Add social feed posts
db.version(12).stores({
    chats: '&id, name, type, personaId, personaIds, created',
    messages: '&id, chatId, timestamp, role, type, voiceAudio, senderId',
    apiConfig: '&id',
    voiceApiConfig: '&id',
    worldBooks: '&id, name, enabled, created',
    personas: '&id, name, avatar, persona, memory, created',
    globalSettings: '&id',
    userProfile: '&id, avatar, name, gender, age, bio, updated',
    socialPosts: '&id, userId, timestamp' // New table for social posts
}).upgrade(tx => {
    // Initialize likes and comments arrays for new posts
    console.log('Upgrading database to version 12: Adding social posts...');
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
        
        // Dynamically get all table names from the database
        const tables = db.tables.map(table => table.name);
        console.log('Available tables:', tables);
        
        const exportData = {
            exportVersion: '2.0', // Updated export version for dynamic tables
            exportDate: new Date().toISOString(),
            appVersion: db.verno, // Get actual database version dynamically
            tables: tables, // Include table list for reference
            data: {}
        };
        
        // Export all table data dynamically
        let totalRecords = 0;
        
        for (const tableName of tables) {
            try {
                const tableData = await db[tableName].toArray();
                exportData.data[tableName] = tableData;
                totalRecords += tableData.length;
                console.log(`Exported ${tableName}: ${tableData.length} records`);
            } catch (error) {
                console.warn(`Failed to export ${tableName}:`, error);
                exportData.data[tableName] = [];
            }
        }
        
        // Add export summary
        exportData.summary = {
            totalTables: tables.length,
            totalRecords: totalRecords,
            browser: navigator.userAgent
        };
        
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
        
        // Get current database tables
        const currentTables = db.tables.map(table => table.name);
        console.log('Current database tables:', currentTables);
        
        // Get tables from import data
        const importTables = Object.keys(dataToImport.data);
        console.log('Tables in import file:', importTables);
        
        // Confirm import with user if showing UI
        if (showFileInput) {
            const totalRecords = dataToImport.summary?.totalRecords || 
                Object.values(dataToImport.data).reduce((sum, table) => sum + (table?.length || 0), 0);
            
            const confirmImport = confirm(
                `📥 导入数据确认\n\n` +
                `备份日期: ${dataToImport.exportDate ? new Date(dataToImport.exportDate).toLocaleString('zh-CN') : '未知'}\n` +
                `数据版本: ${dataToImport.appVersion || '未知'}\n` +
                `包含表格: ${importTables.length} 个\n` +
                `总记录数: ${totalRecords} 条\n\n` +
                `⚠️ 警告: 导入将覆盖所有现有数据！\n\n` +
                `确定要继续导入吗？此操作无法撤销。`
            );
            
            if (!confirmImport) {
                console.log('Import cancelled by user');
                return false;
            }
        }
        
        // Import data dynamically
        let importedTables = 0;
        let importedRecords = 0;
        let skippedTables = [];
        
        // Process each table in the import data
        for (const tableName in dataToImport.data) {
            try {
                // Check if table exists in current database
                if (db[tableName]) {
                    // Clear existing data
                    await db[tableName].clear();
                    
                    // Import new data if available
                    const tableData = dataToImport.data[tableName] || [];
                    if (tableData.length > 0) {
                        await db[tableName].bulkAdd(tableData);
                        importedRecords += tableData.length;
                    }
                    
                    importedTables++;
                    console.log(`✅ Imported ${tableName}: ${tableData.length} records`);
                } else {
                    // Table doesn't exist in current database version
                    console.warn(`⚠️ Table '${tableName}' not found in current database, skipping...`);
                    skippedTables.push(tableName);
                }
            } catch (error) {
                console.error(`❌ Failed to import ${tableName}:`, error);
                // Continue with other tables even if one fails
            }
        }
        
        console.log(`Import summary: ${importedTables} tables, ${importedRecords} records imported`);
        if (skippedTables.length > 0) {
            console.log('Skipped tables (not in current version):', skippedTables);
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
                await Alpine.store('socialFeed').loadPosts();
                
                console.log('All stores reloaded after import');
                
                if (showFileInput) {
                    alert(
                        `✅ 数据导入成功！\n\n` +
                        `导入了 ${importedTables} 个表格\n` +
                        `共 ${importedRecords} 条记录\n` +
                        (skippedTables.length > 0 ? `\n跳过了 ${skippedTables.length} 个不兼容的表格\n` : '') +
                        `\n页面将自动刷新以加载新数据。`
                    );
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

// Minimax TTS Service
class MinimaxTTS {
    constructor() {
        this.cache = new Map(); // Cache audio data
    }
    
    // Helper function to convert hex string to base64
    hexToBase64(hexString) {
        // Remove any whitespace
        const hex = hexString.replace(/\s/g, '');
        // Convert hex to bytes
        const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        // Convert bytes to base64
        let binary = '';
        bytes.forEach(byte => binary += String.fromCharCode(byte));
        return btoa(binary);
    }
    
    async synthesizeVoice(text, config) {
        if (!config.minimaxApiKey || !config.minimaxGroupId) {
            throw new Error('Minimax API配置不完整');
        }
        
        // Check cache first
        const cacheKey = `${text}_${config.minimaxModel}_${config.voiceId}`;
        if (this.cache.has(cacheKey)) {
            console.log('Using cached voice for:', text.substring(0, 20) + '...');
            return this.cache.get(cacheKey);
        }
        
        try {
            // Build the correct URL with GroupId as query parameter
            const apiUrl = `https://api.minimaxi.com/v1/t2a_v2?GroupId=${config.minimaxGroupId}`;
            
            const requestBody = {
                model: config.minimaxModel || 'speech-2.5-hd-preview',
                text: text,
                stream: false,
                voice_setting: {
                    voice_id: config.voiceId || 'male-qn-qingse',
                    speed: 1,
                    vol: 1,
                    pitch: 0
                },
                audio_setting: {
                    format: 'mp3',
                    sample_rate: 32000,
                    bitrate: 128000
                },
                output_format: 'hex'
            };
            
            console.log('Minimax TTS Request:', apiUrl, requestBody);
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.minimaxApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const error = await response.json();
                const errorMsg = error?.base_resp?.status_msg || error?.message || `HTTP ${response.status}`;
                throw new Error(`Minimax API错误: ${errorMsg}`);
            }
            
            const data = await response.json();
            console.log('Minimax TTS Response:', data);
            
            // Check for API-level errors
            if (data.base_resp && data.base_resp.status_code !== 0) {
                throw new Error(`Minimax API错误: ${data.base_resp.status_msg || 'Unknown error'}`);
            }
            
            // Extract and convert hex audio to base64
            if (data.data && data.data.audio) {
                const base64Audio = this.hexToBase64(data.data.audio);
                this.cache.set(cacheKey, base64Audio);
                
                // Limit cache size
                if (this.cache.size > 50) {
                    const firstKey = this.cache.keys().next().value;
                    this.cache.delete(firstKey);
                }
                
                return base64Audio;
            }
            
            throw new Error('无效的语音合成响应：未找到音频数据');
        } catch (error) {
            console.error('Voice synthesis failed:', error);
            throw error;
        }
    }
    
    clearCache() {
        this.cache.clear();
    }
}

// Initialize global TTS service
window.minimaxTTS = new MinimaxTTS();

// Default prompt templates
const DEFAULT_PROMPT_SINGLE = `你现在扮演一个名为"{chat.name}"的角色。

# 当前情景信息
- **当前时间是：{currentTime}**。

# 核心世界观设定 (必须严格遵守以下所有设定)
{worldBookContent}

# 你的角色设定：
{char.persona}

# 你的长期记忆：
{char.memory}

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
9.你能理解用户的引用消息，并且在对话中需要引用时引用用户的消息。特别是用户讲了多个话题，避免造成歧义就引用。引用消息是普通文本消息，格式是 quote<被引用消息>消息内容
10.当用户告诉你重要信息（如生日、喜好、重要事件等）时，你应该生成一条记忆消息来保存这些信息，以便在未来的对话中记住。

# 特殊消息能力
你可以发送以下类型的特殊消息：

## 图片消息
当你想要发送图片时，使用以下格式：
{"type": "image", "imageUrl": "图片的URL或base64数据", "content": "[图片] 可选的描述文字"}

## 语音消息
当你想要发送语音消息时（比如想要表达情感、急迫、私密等），使用以下格式：
{"type": "voice", "content": "语音内容文字"}

## 转账
当你想要给用户转账表达情感或在特殊情况下时，使用以下格式：
{"type": "transfer", "amount": 520, "note": "转账备注"}

## 撤回消息  
当你想要撤回刚发的消息时，使用以下格式：
{"type": "recall", "content": "刚才发送的内容"}

## HTML互动内容
当你想要创建交互式界面或可视化内容时（比如外卖APP、小游戏、表单、图表等），使用以下格式：
{"type": "html", "content": "完整的HTML代码"}

## 记忆消息
当你需要保存重要的长期记忆时（比如用户的重要信息、特殊经历、重要约定等），使用以下格式：
{"type": "memory", "content": "需要记住的内容"}
注意：记忆消息不会显示给用户，只会保存在你的长期记忆中。每次对话时你都能看到你的长期记忆。

HTML消息使用指南：
- content必须包含完整的HTML内容，支持内嵌CSS和JavaScript
- **重要尺寸限制**：
  • 建议最大宽度：300px（适配移动端屏幕）
  • 建议最大高度：400px（避免占用过多空间）
  • 超出尺寸会自动缩放，但最好设计时就考虑这些限制
- **最佳实践**：
  • 使用响应式设计：width: 100%; max-width: 300px;
  • 使用相对单位：em, rem, %而非固定px
  • 添加viewport meta标签：<meta name="viewport" content="width=device-width">
- 适用场景：创建外卖点餐界面、游戏、问卷调查、数据可视化、动画效果等
- 优化示例：外卖APP界面
{"type": "html", "content": "<div style='width:100%;max-width:300px;padding:15px'><h2 style='font-size:1.2em'>🍔 美食外卖</h2><div style='border:1px solid #ddd;border-radius:8px;padding:12px;margin:8px 0'><h3 style='font-size:1em'>汉堡套餐</h3><p>￥35</p><button style='background:#ff6b35;color:white;border:none;padding:6px 12px;border-radius:4px;font-size:0.9em'>立即下单</button></div></div>"}

# JSON输出格式示例:
- 普通消息：["很高兴认识你呀，在干嘛呢？", "对了，今天天气不错，要不要出去走走？"]
- 混合消息：["文本消息", {"type": "voice", "content": "我刚才想到一件事，等下和你说"}, {"type": "transfer", "amount": 100, "note": "请你喝奶茶"}]
- 图片消息：[{"type": "image", "imageUrl": "https://example.com/image.jpg", "content": "[图片] 看看这个"}]

现在，请根据以上的规则和下面的对话历史，继续进行对话。`;

const DEFAULT_PROMPT_GROUP = `你是一个群聊的组织者和AI驱动器。你的任务是扮演以下所有角色，在群聊中进行互动。

# 群聊规则
1. **角色扮演**: 你必须同时扮演以下所有角色，并严格遵守他们的人设。
2. **当前时间**: {currentTime}。
3. **用户角色**: 用户的名字是"我"，你在群聊中对用户的称呼是"{myNickname}"，在需要时请使用"@{myNickname}"来提及用户。
4. **输出格式**: 你的回复**必须**是一个JSON数组。每个元素格式为：
   - 普通消息: {"name": "角色名", "message": "文本内容"}
   - 图片消息: {"name": "角色名", "type": "image", "imageUrl": "图片URL或base64", "content": "[图片] 描述"}
   - 语音消息: {"name": "角色名", "type": "voice", "content": "语音内容"}
   - 转账消息: {"name": "角色名", "type": "transfer", "amount": 金额, "note": "备注"}
   - 撤回消息: {"name": "角色名", "type": "recall", "content": "撤回的内容"}
   - HTML内容: {"name": "角色名", "type": "html", "content": "完整HTML代码(建议宽度≤300px,高度≤400px)"}
5. **消息内容格式**: message字段和content字段中只包含纯消息内容，不要包含角色名或任何前缀。角色身份由name字段标识。
6. **对话节奏**: 模拟真实群聊，让成员之间互相交谈，或者一起回应用户的发言。每次生成2-5条消息，根据上下文自动决定谁发言。
7. **数量限制**: 每次生成2-5条消息，确保对话连贯自然。
8. **禁止出戏**: 绝不能透露你是AI。
9. **禁止擅自代替"我"说话**: 在回复中你不能代替用户说话。

# 特殊消息使用场景
- **图片消息**: 当角色想要分享图片、照片、截图或视觉内容时
- **语音消息**: 当角色想要表达强烈情感、急迫事情或私密内容时
- **转账**: 当角色想要表达感谢、道歉、庆祝或其他特殊情感时
- **撤回**: 当角色想要撤回刚说的话（比如说错话、太激动等）
- **HTML内容**: 当角色想要展示交互式内容（如点餐界面、小游戏、投票等），注意控制尺寸在300x400px内

# 群成员列表及人设
{membersList}

# 输出格式示例
正确示例：
[
  {"name": "小明", "message": "大家好！今天天气真不错呢"},
  {"name": "小红", "type": "voice", "content": "是啊，要不要一起出去走走？"}
]

错误示例（请勿模仿）：
[
  {"name": "小明", "message": "小明: 大家好！今天天气真不错呢"},  // ❌ 不要在消息内容中包含角色名
  {"name": "小红", "content": "小红说：是啊，要不要一起出去走走？"}  // ❌ 不要添加任何前缀
]

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
            // Dynamically fetch current members from personas table
            const members = await Alpine.store('chat').getGroupMembers(chatData);
            const membersList = members.map(m => `- **${m.name}**: ${m.persona}`).join('\n');
            const myNickname = chatData.myNickname || '我';
            
            systemPrompt = template
                .replace('{currentTime}', context.currentTime)
                .replace('{myNickname}', myNickname)
                .replace('{membersList}', membersList);
        } else {
            const userProfileContext = this.buildUserProfileContext();
            
            // 获取角色的长期记忆
            let charMemory = '';
            if (chatData.personaId) {
                const persona = await db.personas.get(chatData.personaId);
                if (persona && persona.memory) {
                    charMemory = persona.memory;
                }
            }
            
            systemPrompt = template
                .replace('{chat.name}', chatData.name)
                .replace('{currentTime}', context.currentTime)
                .replace('{myAddress}', context.myAddress || '未知城市')
                .replace('{worldBookContent}', context.worldBookContent || '')
                .replace('{char.persona}', chatData.persona || '友好的AI助手')
                .replace('{char.memory}', charMemory || '（暂无记忆）')
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
        quotedMessage: null, // Store the message being quoted
        editingMessageId: null,
        editingContent: '',
        
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
                case 'html':
                    displayText = '[互动内容]';
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

        async createGroupChat(name, personaIds, personas) {
            // Create group chat with persona IDs only (no members snapshot)
            const chat = {
                id: Date.now().toString(),
                name: name,
                type: 'group',
                personaIds: [...personaIds], // Clone array to ensure it's a plain array
                // members array removed - will fetch dynamically from personas table
                myNickname: Alpine.store('profile').profile.name || '我',
                created: Date.now(),
                avatar: 'https://via.placeholder.com/40' // Default group avatar
            };
            
            await db.chats.add(chat);
            await this.loadChats();
            return chat.id;
        },
        
        async getGroupMembers(chat) {
            // Dynamically fetch group members from personas table
            if (!chat.personaIds || chat.personaIds.length === 0) {
                return [];
            }
            
            const members = [];
            for (const personaId of chat.personaIds) {
                const persona = await db.personas.get(personaId);
                if (persona) {
                    members.push({
                        id: persona.id,
                        name: persona.name,
                        persona: persona.persona || '',
                        avatar: persona.avatar || 'https://via.placeholder.com/40'
                    });
                }
            }
            return members;
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
        
        // Start editing a message
        startEdit(messageId, content) {
            // Only allow editing text messages
            const message = this.currentMessages.find(m => m.id === messageId);
            if (!message || message.type !== 'text') return;
            
            // Remove quote prefix if present
            let editContent = content || message.content || '';
            const quoteMatch = editContent.match(/^quote<[^>]*>(.*)/s);
            if (quoteMatch) {
                editContent = quoteMatch[1]; // Only get the actual message part
            }
            
            this.editingMessageId = messageId;
            this.editingContent = editContent;
        },
        
        // Cancel editing
        cancelEdit() {
            this.editingMessageId = null;
            this.editingContent = '';
        },
        
        // Save edited message
        async saveEdit() {
            if (!this.editingMessageId || !this.editingContent.trim()) {
                this.cancelEdit();
                return;
            }
            
            try {
                // Update message in database
                await db.messages.update(this.editingMessageId, {
                    content: this.editingContent.trim(),
                    edited: true,
                    editedAt: Date.now()
                });
                
                // Reload messages for current chat
                const currentChatId = Alpine.store('app').currentChatId;
                if (currentChatId) {
                    await this.loadMessages(currentChatId);
                    await this.loadChats(); // Update last message display
                }
                
                // Clear edit state
                this.cancelEdit();
            } catch (error) {
                console.error('Failed to save edit:', error);
                alert('编辑失败，请重试');
            }
        },
        
        async sendMessage(chatId, messageData, role = 'user') {
            // Support both old format (string) and new format (object with type)
            let message;
            
            if (typeof messageData === 'string') {
                // Check if there's a quoted message
                let content = messageData;
                if (this.quotedMessage && role === 'user') {
                    // Format with quote: quote<quoted content>actual message
                    const quotedContent = this.quotedMessage.content || '';
                    content = `quote<${quotedContent}>${messageData}`;
                    // Clear quoted message after using
                    this.quotedMessage = null;
                }
                
                // Legacy text message format
                message = {
                    id: Date.now().toString(),
                    chatId: chatId,
                    content: content,
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
                        let content = msg.content;
                        
                        // For group chat messages from assistant with sender name, format properly
                        if (chat.type === 'group' && msg.role === 'assistant' && msg.senderName) {
                            // Ensure clean format: "senderName: content" (but clean any existing prefix first)
                            const cleanContent = content.replace(new RegExp(`^${msg.senderName}:\\s*`), '');
                            content = `${msg.senderName}: ${cleanContent}`;
                        }
                        
                        return {
                            role: msg.role,
                            content: content
                        };
                    })
                ];
                
                // 调试输出完整的消息载荷
                window.promptBuilder.debugMessagesPayload(messagesPayload);
                
                // Make API call
                const isGemini = apiConfig.apiType === 'gemini';
                let response;
                let requestBody; // Store request body for debugging
                
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
                    
                    // Prepare request body for debugging
                    requestBody = {
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
                    };
                    
                    // Debug output: complete request body as string
                    if (globalSettings.debugPrompt) {
                        console.group('🚀 API Request Body (Gemini)');
                        console.log('URL:', `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`);
                        console.log('📤 REQUEST JSON STRING:');
                        console.log(JSON.stringify(requestBody));
                        console.groupEnd();
                    }
                    
                    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-goog-api-key': apiKey
                        },
                        body: JSON.stringify(requestBody)
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
                    
                    // Debug output: API response
                    if (globalSettings.debugPrompt) {
                        console.group('📥 API Response (Gemini)');
                        console.log('📥 RESPONSE JSON STRING:');
                        console.log(JSON.stringify(data));
                        console.groupEnd();
                    }
                    
                    const aiResponseContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    
                    if (!aiResponseContent) {
                        throw new Error('Invalid response format from Gemini API: ' + JSON.stringify(data));
                    }
                    
                    await this.parseAndSaveAIResponse(chatId, aiResponseContent, chat.type === 'group');
                    
                } else {
                    // OpenAI API format - smart URL handling
                    const apiKey = Alpine.store('settings').getRandomApiKey(apiConfig.apiKey);
                    const apiURL = buildApiURL(apiConfig.baseURL);
                    
                    // Prepare request body for debugging
                    requestBody = {
                        model: apiConfig.model,
                        messages: messagesPayload,
                        temperature: 0.8,
                        stream: false
                    };
                    
                    // Debug output: complete request body as string
                    if (globalSettings.debugPrompt) {
                        console.group('🚀 API Request Body (OpenAI)');
                        console.log('URL:', apiURL);
                        console.log('📤 REQUEST JSON STRING:');
                        console.log(JSON.stringify(requestBody));
                        console.groupEnd();
                    }
                    
                    response = await fetch(apiURL, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestBody)
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(`OpenAI API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
                    }
                    
                    const data = await response.json();
                    
                    // Debug output: API response
                    if (globalSettings.debugPrompt) {
                        console.group('📥 API Response (OpenAI)');
                        console.log('📥 RESPONSE JSON STRING:');
                        console.log(JSON.stringify(data));
                        console.groupEnd();
                    }
                    
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
                            // For transfer messages, generate a default content if empty
                            let content = msg.content || '';
                            if (msg.type === 'transfer' && !content) {
                                content = `[转账] ¥${parseFloat(msg.amount || 0).toFixed(2)}`;
                            }
                            
                            aiMessage = {
                                ...baseMessage,
                                type: msg.type,
                                content: content
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
                    
                    // Skip empty messages (but allow transfer messages with empty content)
                    if (!aiMessage) {
                        continue;
                    }
                    
                    // For transfer and image messages, content can be empty
                    if (aiMessage.type !== 'transfer' && aiMessage.type !== 'image' && (!aiMessage.content || aiMessage.content.trim().length === 0)) {
                        continue;
                    }
                    
                    // Handle memory messages specially
                    if (aiMessage.type === 'memory' && aiMessage.content) {
                        // Get the chat to find the persona
                        const chat = await db.chats.get(chatId);
                        if (chat && chat.personaId) {
                            // Get the current persona
                            const persona = await db.personas.get(chat.personaId);
                            if (persona) {
                                // Append the new memory with a newline
                                let currentMemory = persona.memory || '';
                                if (currentMemory && !currentMemory.endsWith('\n')) {
                                    currentMemory += '\n';
                                }
                                currentMemory += aiMessage.content + '\n';
                                
                                // Update the persona's memory
                                await db.personas.update(chat.personaId, { memory: currentMemory });
                                await Alpine.store('personas').loadPersonas();
                                console.log('Memory updated for persona:', chat.personaId);
                            }
                        }
                        // Don't save memory messages to the messages database
                        continue;
                    }
                    
                    // For voice messages, auto-synthesize voice if enabled
                    if (aiMessage.type === 'voice' && aiMessage.content) {
                        const voiceConfig = Alpine.store('settings').voiceApiConfig;
                        if (voiceConfig.voiceEnabled && voiceConfig.minimaxApiKey && voiceConfig.minimaxGroupId) {
                            try {
                                // Pre-synthesize voice for AI messages
                                const audioData = await window.minimaxTTS.synthesizeVoice(aiMessage.content, voiceConfig);
                                aiMessage.voiceAudio = audioData;
                            } catch (error) {
                                console.error('Failed to pre-synthesize voice:', error);
                                // Continue without voice synthesis
                            }
                        }
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
                case 'html':
                    // HTML content is stored directly in the content field
                    // Ensure it's a complete HTML document with proper structure
                    if (!msgData.content.includes('<html') && !msgData.content.includes('<!DOCTYPE')) {
                        // Wrap partial HTML in a basic document structure
                        aiMessage.content = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            margin: 0;
            padding: 16px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            color: #333;
        }
    </style>
</head>
<body>
    ${msgData.content}
</body>
</html>`;
                    }
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
        },
        
        async deleteChat(chatId) {
            if (!confirm('确定要删除这个聊天吗？此操作不可恢复。')) {
                return;
            }
            
            try {
                // 1. 删除所有相关消息
                await db.messages.where('chatId').equals(chatId).delete();
                
                // 2. 删除聊天本身
                await db.chats.delete(chatId);
                
                // 3. 重新加载聊天列表
                await this.loadChats();
                
                // 4. 如果当前正在该聊天页面，返回聊天列表
                if (Alpine.store('app').currentChatId === chatId) {
                    Alpine.store('app').navigateTo('chat-list');
                }
                
                console.log('✅ 聊天删除成功:', chatId);
            } catch (error) {
                console.error('删除聊天失败:', error);
                alert('删除失败: ' + error.message);
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
        
        // Voice API Configuration
        voiceApiConfig: {
            voiceEnabled: false,
            minimaxApiKey: '',
            minimaxGroupId: '',
            minimaxModel: 'speech-2.5-hd-preview',
            voiceId: 'male-qn-qingse'
        },
        
        // Available voice models
        voiceModels: [
            { id: 'speech-2.5-hd-preview', name: 'Speech 2.5 HD Preview (默认)' },
            { id: 'speech-2.5-turbo-preview', name: 'Speech 2.5 Turbo Preview' },
            { id: 'speech-02-hd', name: 'Speech 02 HD' },
            { id: 'speech-02-turbo', name: 'Speech 02 Turbo' },
            { id: 'speech-01-hd', name: 'Speech 01 HD' },
            { id: 'speech-01-turbo', name: 'Speech 01 Turbo' }
        ],
        
        // Available voice characters
        voiceCharacters: [
            { id: 'male-qn-qingse', name: '青涩青年男声' },
            { id: 'male-qn-jingying', name: '精英青年男声' },
            { id: 'male-qn-badao', name: '霸道青年男声' },
            { id: 'male-qn-daxuesheng', name: '青年大学生男声' },
            { id: 'female-shaonv', name: '少女音' },
            { id: 'female-yujie', name: '御姐音' },
            { id: 'female-chengshu', name: '成熟女声' },
            { id: 'female-tianmei', name: '甜美女声' },
            { id: 'presenter_male', name: '男性主持人' },
            { id: 'presenter_female', name: '女性主持人' },
            { id: 'audiobook_male_1', name: '有声书男声1' },
            { id: 'audiobook_female_1', name: '有声书女声1' },
            { id: 'friendly_male', name: '友好男声' },
            { id: 'childvoice', name: '童声' }
        ],
        
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
            
            // Load voice API config
            const voiceConfig = await db.voiceApiConfig.get('main');
            if (voiceConfig) {
                this.voiceApiConfig = { ...this.voiceApiConfig, ...voiceConfig };
            }
        },
        
        async saveConfig() {
            await db.apiConfig.put({ 
                id: 'main', 
                ...this.apiConfig 
            });
        },
        
        async saveVoiceConfig() {
            await db.voiceApiConfig.put({
                id: 'main',
                ...this.voiceApiConfig
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
        
        async createPersona(name, avatar, persona, memory = '') {
            const personaItem = {
                id: Date.now().toString(),
                name: name,
                avatar: avatar,
                persona: persona,
                memory: memory,
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
            try {
                // 获取被删除角色的名称用于反馈
                const persona = await db.personas.get(id);
                const personaName = persona ? persona.name : '未知角色';
                
                let deletedPrivateChats = 0;
                let updatedGroupChats = 0;
                
                // 1. 删除所有相关的私聊
                const privateChats = await db.chats.where('personaId').equals(id).toArray();
                for (const chat of privateChats) {
                    // 删除聊天的所有消息
                    await db.messages.where('chatId').equals(chat.id).delete();
                    // 删除聊天本身
                    await db.chats.delete(chat.id);
                    deletedPrivateChats++;
                }
                
                // 2. 从群聊中移除该角色（但保留群聊）
                const groupChats = await db.chats.where('type').equals('group').toArray();
                for (const chat of groupChats) {
                    if (chat.personaIds && chat.personaIds.includes(id)) {
                        // 从群聊成员列表中移除该角色
                        const updatedPersonaIds = chat.personaIds.filter(pid => pid !== id);
                        // 只更新personaIds（不需要更新members，因为已改为动态获取）
                        await db.chats.update(chat.id, { personaIds: updatedPersonaIds });
                        updatedGroupChats++;
                    }
                }
                
                // 3. 删除角色本身
                await db.personas.delete(id);
                
                // 4. 重新加载数据
                await this.loadPersonas();
                await Alpine.store('chat').loadChats();
                
                // 5. 显示删除反馈
                let message = `已删除角色"${personaName}"`;
                if (deletedPrivateChats > 0) {
                    message += `\n• 删除了 ${deletedPrivateChats} 个私聊`;
                }
                if (updatedGroupChats > 0) {
                    message += `\n• 从 ${updatedGroupChats} 个群聊中移除`;
                }
                alert(message);
                
            } catch (error) {
                console.error('删除角色失败:', error);
                alert('删除角色失败: ' + error.message);
            }
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

    Alpine.store('socialFeed', {
        posts: [],
        showCreateModal: false,
        newPost: {
            content: '',
            image: ''
        },
        
        async loadPosts() {
            try {
                this.posts = await db.socialPosts.toArray();
                // Sort by timestamp descending (newest first)
                this.posts.sort((a, b) => b.timestamp - a.timestamp);
                
                // Load user info for each post
                for (const post of this.posts) {
                    if (post.userId === 'user') {
                        const profile = Alpine.store('profile').profile;
                        post.userAvatar = profile.avatar || 'https://via.placeholder.com/40';
                        post.userName = profile.name || '我';
                    } else {
                        // For persona posts (future feature)
                        const persona = await db.personas.get(post.userId);
                        if (persona) {
                            post.userAvatar = persona.avatar;
                            post.userName = persona.name;
                        }
                    }
                    
                    // Initialize likes and comments if not present
                    if (!post.likes) post.likes = [];
                    if (!post.comments) post.comments = [];
                }
            } catch (error) {
                console.error('Failed to load posts:', error);
            }
        },
        
        async createPost(content, image) {
            if (!content.trim() && !image) return false;
            
            try {
                const post = {
                    id: 'post_' + Date.now(),
                    userId: 'user', // Currently only user can post
                    timestamp: Date.now(),
                    content: content.trim(),
                    image: image || '',
                    likes: [],
                    comments: []
                };
                
                await db.socialPosts.add(post);
                await this.loadPosts();
                return true;
            } catch (error) {
                console.error('Failed to create post:', error);
                return false;
            }
        },
        
        async likePost(postId) {
            try {
                const post = await db.socialPosts.get(postId);
                if (!post) return;
                
                if (!post.likes) post.likes = [];
                
                const userId = 'user'; // Current user
                const likeIndex = post.likes.indexOf(userId);
                
                if (likeIndex === -1) {
                    // Add like
                    post.likes.push(userId);
                } else {
                    // Remove like
                    post.likes.splice(likeIndex, 1);
                }
                
                await db.socialPosts.put(post);
                await this.loadPosts();
            } catch (error) {
                console.error('Failed to like post:', error);
            }
        },
        
        isLikedByUser(post) {
            return post.likes && post.likes.includes('user');
        },
        
        formatTimestamp(timestamp) {
            const now = Date.now();
            const diff = now - timestamp;
            
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);
            
            if (minutes < 1) return '刚刚';
            if (minutes < 60) return `${minutes}分钟前`;
            if (hours < 24) return `${hours}小时前`;
            if (days < 30) return `${days}天前`;
            
            const date = new Date(timestamp);
            return date.toLocaleDateString('zh-CN');
        },
        
        openCreateModal() {
            this.showCreateModal = true;
            this.newPost = { content: '', image: '' };
        },
        
        closeCreateModal() {
            this.showCreateModal = false;
            this.newPost = { content: '', image: '' };
        },
        
        async handleImageUpload(file) {
            try {
                const compressedImage = await window.compressImage(file, { maxWidth: 800, maxHeight: 800 });
                this.newPost.image = compressedImage;
                return true;
            } catch (error) {
                console.error('Failed to upload image:', error);
                alert('图片上传失败: ' + error.message);
                return false;
            }
        },
        
        removeImage() {
            this.newPost.image = '';
        },
        
        async publishPost() {
            if (!this.newPost.content.trim() && !this.newPost.image) {
                alert('请输入文字或添加图片');
                return;
            }
            
            const success = await this.createPost(this.newPost.content, this.newPost.image);
            if (success) {
                this.closeCreateModal();
            } else {
                alert('发布失败，请重试');
            }
        }
    });

    Alpine.store('messageTooltip', {
        show: false,
        x: 0,
        y: 0,
        messageId: null,
        placement: 'top', // 'top' | 'bottom'
        longPressTimer: null,
        longPressDelay: 350, // 350ms for long press
        moveThreshold: 8, // 8px movement threshold
        startX: 0,
        startY: 0,
        isLongPressTriggered: false, // Track if tooltip was shown via long press
        
        init() {
            console.log('📱 Message Tooltip Store initialized');
        },
        
        showForMessage(element, messageId) {
            console.log('🎯 showForMessage called:', { element, messageId });
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            
            // Check if there's enough space above
            const wantsTop = rect.top >= 90;
            this.placement = wantsTop ? 'top' : 'bottom';
            
            this.x = Math.round(centerX);
            this.y = Math.round(wantsTop ? rect.top : rect.bottom);
            this.messageId = messageId;
            this.show = true;
            console.log('📍 Tooltip position:', { x: this.x, y: this.y, placement: this.placement, show: this.show });
        },
        
        hide() {
            this.show = false;
            this.messageId = null;
            this.isLongPressTriggered = false;
            this.cancelLongPress();
        },
        
        startLongPress(event, element, messageId) {
            console.log('👆 startLongPress:', { button: event.button, messageId, element });
            
            // Reset the flag
            this.isLongPressTriggered = false;
            
            // Right click on desktop - show immediately
            if (event.button === 2) {
                console.log('🖱️ Right click detected');
                this.showForMessage(element, messageId);
                return;
            }
            
            // Left click/touch - start long press timer
            this.startX = event.clientX;
            this.startY = event.clientY;
            
            console.log('⏱️ Starting long press timer for', this.longPressDelay, 'ms');
            this.longPressTimer = setTimeout(() => {
                console.log('⏰ Long press timer fired!');
                this.isLongPressTriggered = true; // Mark as triggered by long press
                this.showForMessage(element, messageId);
                this.longPressTimer = null;
            }, this.longPressDelay);
        },
        
        endLongPress() {
            console.log('☝️ endLongPress, isLongPressTriggered:', this.isLongPressTriggered);
            
            // Only cancel if tooltip hasn't been shown yet
            // If tooltip is already shown (isLongPressTriggered = true), don't hide it
            if (!this.isLongPressTriggered) {
                this.cancelLongPress();
            }
        },
        
        moveLongPress(event) {
            if (!this.longPressTimer) return;
            
            const dx = event.clientX - this.startX;
            const dy = event.clientY - this.startY;
            const distance = Math.hypot(dx, dy);
            
            // Cancel if moved too much
            if (distance > this.moveThreshold) {
                console.log('👋 Cancelled long press due to movement:', distance, 'px');
                this.cancelLongPress();
            }
        },
        
        cancelLongPress() {
            if (this.longPressTimer) {
                console.log('❌ Cancelling long press timer');
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
        },
        
        async deleteMessage() {
            if (!this.messageId) return;
            
            console.log('🗑️ Deleting message:', this.messageId);
            const messageId = this.messageId;
            const chatStore = Alpine.store('chat');
            
            try {
                // Delete from database
                await db.messages.delete(messageId);
                console.log('✅ Message deleted from database');
                
                // Reload messages for current chat
                const currentChatId = Alpine.store('app').currentChatId;
                if (currentChatId) {
                    await chatStore.loadMessages(currentChatId);
                    await chatStore.loadChats(); // Update last message display
                }
                
                this.hide();
            } catch (error) {
                console.error('❌ Failed to delete message:', error);
            }
        },
        
        async quoteMessage() {
            if (!this.messageId) return;
            
            console.log('💬 Quoting message:', this.messageId);
            const chatStore = Alpine.store('chat');
            
            // Find the message to quote - use currentMessages instead of messages
            const message = chatStore.currentMessages.find(m => m.id === this.messageId);
            if (!message) {
                console.error('Message not found:', this.messageId);
                return;
            }
            
            // Set the quoted message in chat store
            chatStore.quotedMessage = message;
            
            this.hide();
        },
        
        async editMessage() {
            if (!this.messageId) return;
            
            console.log('✏️ Editing message:', this.messageId);
            const chatStore = Alpine.store('chat');
            
            // Find the message to edit
            const message = chatStore.currentMessages.find(m => m.id === this.messageId);
            if (!message) {
                console.error('Message not found:', this.messageId);
                return;
            }
            
            // Only allow editing text messages
            if (message.type !== 'text' && message.type !== undefined) {
                console.log('Cannot edit non-text message');
                alert('只能编辑文字消息');
                this.hide();
                return;
            }
            
            // Start editing in chat store
            chatStore.startEdit(this.messageId, message.content);
            
            this.hide();
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
                await Alpine.store('socialFeed').loadPosts();
                
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
            // 使用模态框创建群聊
            document.dispatchEvent(new CustomEvent('open-create-group-chat'));
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
        // Save Voice API configuration
        async saveVoiceApiConfig() {
            try {
                const voiceConfig = Alpine.store('settings').voiceApiConfig;
                
                // Validate required fields
                if (voiceConfig.voiceEnabled) {
                    if (!voiceConfig.minimaxApiKey || !voiceConfig.minimaxGroupId) {
                        alert('请填写所有必填字段（API Key 和 Group ID）');
                        return;
                    }
                }
                
                await Alpine.store('settings').saveVoiceConfig();
                alert('语音API设置已保存');
            } catch (error) {
                console.error('Failed to save voice API config:', error);
                alert('保存失败: ' + error.message);
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
        hasInitialScroll: false,
        
        init() {
            // Watch for messages changes to scroll to bottom on initial load
            let lastChatId = null;
            this.$watch('messages', (newMessages, oldMessages) => {
                const currentChatId = Alpine.store('app').currentChatId;
                
                // Reset flag when switching to a different chat
                if (currentChatId !== lastChatId) {
                    this.hasInitialScroll = false;
                    lastChatId = currentChatId;
                }
                
                // Only auto-scroll to bottom on initial load (when messages go from empty to populated)
                if (!this.hasInitialScroll && newMessages.length > 0 && (!oldMessages || oldMessages.length === 0)) {
                    this.$nextTick(() => {
                        const container = this.$refs.messagesContainer;
                        if (container) {
                            // Instantly jump to bottom without animation
                            container.scrollTop = container.scrollHeight;
                            this.hasInitialScroll = true;
                        }
                    });
                }
            });
        },
        
        get currentChat() {
            const chatId = Alpine.store('app').currentChatId;
            return Alpine.store('chat').chats.find(c => c.id === chatId);
        },
        
        get messages() {
            return Alpine.store('chat').currentMessages;
        },
        
        clearQuote() {
            Alpine.store('chat').quotedMessage = null;
        },
        
        async sendMessage() {
            if (!this.newMessage.trim()) return;
            
            const chatId = Alpine.store('app').currentChatId;
            const message = this.newMessage.trim();
            this.newMessage = '';
            
            // Send message (quote will be handled in chat store)
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
            // Return message content without sender name (sender name is handled by HTML template)
            return message.content || '消息内容为空';
        },
        
        
        // Special message interactions
        async playVoiceMessage(message) {
            if (!message.content) return;
            
            const voiceConfig = Alpine.store('settings').voiceApiConfig;
            
            // Check if voice is enabled and properly configured
            if (!voiceConfig.voiceEnabled || !voiceConfig.minimaxApiKey || !voiceConfig.minimaxGroupId) {
                // Fallback to text display
                alert(`语音消息内容：\n${message.content}`);
                return;
            }
            
            try {
                // Show loading indicator
                const loadingToast = document.createElement('div');
                loadingToast.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 12px 24px;
                    border-radius: 8px;
                    z-index: 10000;
                    font-size: 14px;
                `;
                loadingToast.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在合成语音...';
                document.body.appendChild(loadingToast);
                
                // Check if we have cached audio
                let audioData = message.voiceAudio;
                
                if (!audioData) {
                    // Synthesize voice using Minimax API
                    audioData = await window.minimaxTTS.synthesizeVoice(message.content, voiceConfig);
                    
                    // Save audio to message for caching
                    await db.messages.where('id').equals(message.id).modify({
                        voiceAudio: audioData
                    });
                }
                
                // Remove loading indicator
                loadingToast.remove();
                
                // Create audio player modal
                const modal = document.createElement('div');
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                `;
                
                const playerContainer = document.createElement('div');
                playerContainer.style.cssText = `
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    max-width: 400px;
                    width: 90%;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                `;
                
                playerContainer.innerHTML = `
                    <div style="text-align: center;">
                        <h3 style="margin: 0 0 16px 0; color: #333;">语音消息</h3>
                        <div style="background: #f5f5f5; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                            <p style="margin: 0; color: #666; font-size: 14px;">${message.content}</p>
                        </div>
                        <audio controls autoplay style="width: 100%; margin-bottom: 16px;">
                            <source src="${audioData.startsWith('http') ? audioData : 'data:audio/mp3;base64,' + audioData}" type="audio/mp3">
                            您的浏览器不支持音频播放
                        </audio>
                        <button id="voice-modal-close-btn" style="
                            background: #007AFF;
                            color: white;
                            border: none;
                            padding: 8px 24px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                        ">关闭</button>
                    </div>
                `;
                
                modal.appendChild(playerContainer);
                document.body.appendChild(modal);
                
                // Attach event listener to close button
                const closeBtn = document.getElementById('voice-modal-close-btn');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        modal.remove();
                    });
                }
                
                // Close modal on backdrop click
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.remove();
                    }
                });
                
            } catch (error) {
                console.error('Failed to play voice message:', error);
                // Fallback to text display
                alert(`语音播放失败，显示文字内容：\n${message.content}\n\n错误: ${error.message}`);
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