const { test, expect } = require('@playwright/test');
const { loadTestConfig } = require('../test-config');

test.describe('RuaPhone AI Chat', () => {
    let config;

    test.beforeAll(() => {
        config = loadTestConfig();
        console.log('Test config loaded:', {
            hasApiKey: !!config.OPENAI_API_KEY,
            baseUrl: config.TEST_BASE_URL,
            model: config.TEST_MODEL,
            apiType: config.API_TYPE
        });
    });

    test.beforeEach(async ({ page }) => {
        // 启动本地服务器或直接打开文件
        await page.goto('file://' + __dirname + '/../index.html');
        
        // 等待Alpine.js初始化
        await page.waitForTimeout(1000);
    });

    test('should load the app correctly', async ({ page }) => {
        // 检查主要元素是否存在
        await expect(page.locator('.phone-frame')).toBeVisible();
        await expect(page.locator('.status-bar')).toBeVisible();
        await expect(page.locator('.home-screen')).toBeVisible();
        
        // 检查应用图标
        await expect(page.locator('.app-icon').first()).toBeVisible();
    });

    test('should navigate to chat list', async ({ page }) => {
        // 点击聊天应用
        await page.click('.app-icon:has-text("聊天")');
        
        // 检查是否进入聊天列表页
        await expect(page.locator('.header-title:has-text("聊天")')).toBeVisible();
    });

    test('should create a new chat', async ({ page }) => {
        // 先创建一个联系人
        await page.click('.app-icon:has-text("通讯录")');
        await page.click('.header-button:has(.fa-plus)');
        await page.fill('input[placeholder="请输入人设名称"]', '小助手');
        await page.fill('textarea[placeholder="请输入详细的人设描述..."]', '友好的AI助手，喜欢聊天');
        await page.click('.modal.active button:has-text("创建")');
        await page.waitForTimeout(200);
        await page.click('.header-button:has(i.fa-arrow-left)');

        // 进入聊天列表
        await page.click('.app-icon:has-text("聊天")');

        // 打开创建聊天弹窗并选择人设
        await page.click('.header-button:has(i.fa-user)');
        await page.click('.persona-option:has-text("小助手")');
        await page.click('.modal.active button:has-text("创建")');

        // 应该进入聊天界面
        await expect(page.locator('.chat-page')).toBeVisible();
        await expect(page.locator('.header-title:has-text("小助手")')).toBeVisible();
    });

    test('should configure API settings', async ({ page }) => {
        // 进入API设置
        await page.click('.app-icon:has-text("API设置")');
        
        // 检查API设置页面
        await expect(page.locator('.header-title:has-text("API设置")')).toBeVisible();
        
        if (config.OPENAI_API_KEY && config.TEST_BASE_URL) {
            // 配置API设置
            await page.selectOption('select', config.API_TYPE);
            
            if (config.API_TYPE === 'openai') {
                await page.fill('input[placeholder*="api.openai.com"]', config.TEST_BASE_URL);
            }
            
            await page.fill('input[type="password"]', config.OPENAI_API_KEY);
            await page.fill('input[placeholder*="gpt-3.5-turbo"], input[placeholder*="gemini-1.5-flash"]', config.TEST_MODEL);
            
            // 保存设置
            await page.click('button:has-text("保存设置")');
            
            // 等待保存完成
            await page.waitForTimeout(500);
        }
    });

    test('should send and receive AI messages', async ({ page }) => {
        // 跳过如果没有API key
        test.skip(!config.OPENAI_API_KEY, 'No API key provided');

        // 先配置API
        await page.click('.app-icon:has-text("API设置")');
        await page.selectOption('select', config.API_TYPE);
        
        if (config.API_TYPE === 'openai') {
            await page.fill('input[placeholder*="api.openai.com"]', config.TEST_BASE_URL);
        }
        
        await page.fill('input[type="password"]', config.OPENAI_API_KEY);
        await page.fill('input[placeholder*="gpt-3.5-turbo"], input[placeholder*="gemini-1.5-flash"]', config.TEST_MODEL);
        await page.click('button:has-text("保存设置")');
        await page.waitForTimeout(500);

        // 回到首页
        await page.click('.header-button:has(i.fa-arrow-left)');
        
        // 创建新聊天
        await page.click('.app-icon:has-text("聊天")');
        await page.click('.header-button:has(i.fa-user)');
        
        // 处理弹窗
        page.on('dialog', async dialog => {
            if (dialog.message().includes('聊天对象名称')) {
                await dialog.accept('AI助手');
            } else if (dialog.message().includes('角色设定')) {
                await dialog.accept('你是一个友好的AI助手');
            }
        });
        
        await page.waitForTimeout(500);

        // 发送消息
        const testMessage = '你好，请简单介绍一下你自己';
        await page.fill('.message-input', testMessage);
        await page.click('.send-button');

        // 检查用户消息是否显示
        await expect(page.locator('.message.user').last()).toContainText(testMessage);

        // 触发AI响应
        await page.click('.ai-button');

        // 等待AI响应（最多30秒）
        await expect(page.locator('.message.assistant').last()).toBeVisible({ timeout: 30000 });
        
        // 检查AI响应内容不为空
        const aiResponse = await page.locator('.message.assistant .message-text').last().textContent();
        expect(aiResponse.length).toBeGreaterThan(0);
        
        console.log('AI Response:', aiResponse);
    });

    test('should handle API errors gracefully', async ({ page }) => {
        // 配置错误的API设置
        await page.click('.app-icon:has-text("API设置")');
        await page.fill('input[placeholder*="api.openai.com"]', 'https://invalid-api.com');
        await page.fill('input[type="password"]', 'invalid-key');
        await page.fill('input[placeholder*="gpt-3.5-turbo"]', 'invalid-model');
        await page.click('button:has-text("保存设置")');
        await page.waitForTimeout(500);

        // 回到首页并创建聊天
        await page.click('.header-button:has(i.fa-arrow-left)');
        await page.click('.app-icon:has-text("聊天")');
        await page.click('.header-button:has(i.fa-user)');
        
        page.on('dialog', async dialog => {
            if (dialog.message().includes('聊天对象名称')) {
                await dialog.accept('测试');
            } else if (dialog.message().includes('角色设定')) {
                await dialog.accept('测试助手');
            }
        });
        
        await page.waitForTimeout(500);

        // 发送消息
        await page.fill('.message-input', '测试消息');
        await page.click('.send-button');

        // 触发AI响应
        await page.click('.ai-button');

        // 应该显示错误消息
        await expect(page.locator('.message.assistant').last()).toContainText('抱歉，AI响应出错了');
    });

    test('should create group chat', async ({ page }) => {
        // 先创建两个联系人
        await page.click('.app-icon:has-text("通讯录")');

        // 创建第一个人设
        await page.click('.header-button:has(.fa-plus)');
        await page.fill('input[placeholder="请输入人设名称"]', '小明');
        await page.fill('textarea[placeholder="请输入详细的人设描述..."]', '活泼的朋友');
        await page.click('.modal.active button:has-text("创建")');
        await page.waitForTimeout(200);

        // 创建第二个人设
        await page.click('.header-button:has(.fa-plus)');
        await page.fill('input[placeholder="请输入人设名称"]', '小红');
        await page.fill('textarea[placeholder="请输入详细的人设描述..."]', '安静的朋友');
        await page.click('.modal.active button:has-text("创建")');
        await page.waitForTimeout(200);

        // 返回首页并进入聊天列表
        await page.click('.header-button:has(i.fa-arrow-left)');
        await page.click('.app-icon:has-text("聊天")');

        // 打开创建群聊弹窗
        await page.click('.header-button:has(i.fa-users)');
        await page.fill('input[placeholder="请输入群聊名称"]', '测试群');
        await page.click('.persona-option:has-text("小明")');
        await page.click('.persona-option:has-text("小红")');
        await page.click('.modal.active button:has-text("创建")');

        // 应该进入群聊界面
        await expect(page.locator('.header-title:has-text("测试群")')).toBeVisible();
    });
});