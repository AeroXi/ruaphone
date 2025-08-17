// 测试配置文件 - 用于读取本地环境变量
const fs = require('fs');
const path = require('path');

function loadTestConfig() {
    const envPath = path.join(__dirname, '.env.local');
    
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');
        
        const config = {};
        lines.forEach(line => {
            if (line && !line.startsWith('#')) {
                const [key, value] = line.split('=');
                if (key && value) {
                    config[key.trim()] = value.trim();
                }
            }
        });
        
        return config;
    }
    
    // 如果没有本地文件，使用环境变量
    return {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        TEST_BASE_URL: process.env.TEST_BASE_URL || 'https://api.openai.com',
        TEST_MODEL: process.env.TEST_MODEL || 'gpt-3.5-turbo',
        API_TYPE: process.env.API_TYPE || 'openai'
    };
}

module.exports = { loadTestConfig };