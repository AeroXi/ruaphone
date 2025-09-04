const { test, expect } = require('@playwright/test');
const testConfig = require('./test-config');

test.describe('Message Deletion', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the app
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
    });

    test('should maintain scroll position when deleting messages', async ({ page }) => {
        const config = testConfig.getConfig();
        
        // Navigate to settings to configure API
        await page.click('.nav-item:has-text("设置")');
        await page.waitForSelector('.header-title:has-text("设置")');
        
        // Configure API settings
        const apiTypeButtons = await page.$$('.api-type-item');
        if (apiTypeButtons.length > 0) {
            await apiTypeButtons[0].click(); // Select OpenAI
            await page.waitForTimeout(500);
        }
        
        await page.fill('input[type="url"]', config.TEST_BASE_URL);
        await page.fill('input[type="password"]', config.OPENAI_API_KEY);
        
        // Find model input by looking for any input that might contain model names
        const modelInputs = await page.$$('input[type="text"]');
        for (const input of modelInputs) {
            const placeholder = await input.getAttribute('placeholder');
            const value = await input.inputValue();
            if (placeholder && (placeholder.includes('model') || placeholder.includes('gpt') || placeholder.includes('gemini'))) {
                await input.fill(config.TEST_MODEL);
                break;
            }
        }
        
        await page.click('button:has-text("保存设置")');
        await page.waitForTimeout(1000);
        
        // Navigate to chat list
        await page.click('.nav-item:has-text("聊天")');
        await page.waitForSelector('[x-show="$store.chat.chats.length === 0"]');
        
        // Create a test chat
        await page.click('button:has-text("创建私聊")');
        await page.waitForSelector('.modal.active');
        
        // Create personas if needed
        const emptyState = await page.$('.empty-state:visible');
        if (emptyState) {
            await page.click('button:has-text("前往通讯录创建角色")');
            await page.waitForTimeout(500);
            
            // Create test personas
            const personaNames = ['Test User 1', 'Test User 2', 'Test User 3'];
            for (const name of personaNames) {
                await page.click('button:has-text("添加角色")');
                await page.waitForSelector('.modal.active');
                await page.fill('input[placeholder="输入角色名称"]', name);
                await page.fill('textarea[placeholder="请输入角色的详细描述"]', `This is ${name}`);
                await page.click('button:has-text("添加")');
                await page.waitForTimeout(500);
            }
            
            // Go back to chat
            await page.click('.nav-item:has-text("聊天")');
            await page.click('button:has-text("创建私聊")');
            await page.waitForSelector('.modal.active');
        }
        
        // Select first persona
        const personaOptions = await page.$$('.persona-option');
        if (personaOptions.length > 0) {
            await personaOptions[0].click();
            await page.click('.modal.active button:has-text("创建")');
            await page.waitForTimeout(1000);
        }
        
        // Send multiple messages to create scroll
        const messages = [
            'Message 1',
            'Message 2',
            'Message 3',
            'Message 4',
            'Message 5',
            'Message 6',
            'Message 7',
            'Message 8',
            'Message 9',
            'Message 10',
            'Message 11',
            'Message 12'
        ];
        
        for (const msg of messages) {
            await page.fill('textarea[placeholder="输入消息..."]', msg);
            await page.keyboard.press('Enter');
            await page.waitForTimeout(500);
        }
        
        // Get the messages container
        const container = await page.$('.chat-messages');
        
        // Scroll to middle of the chat
        await page.evaluate(() => {
            const msgContainer = document.querySelector('.chat-messages');
            if (msgContainer) {
                msgContainer.scrollTop = msgContainer.scrollHeight / 2;
            }
        });
        
        await page.waitForTimeout(500);
        
        // Get initial scroll position
        const initialScrollTop = await page.evaluate(() => {
            const msgContainer = document.querySelector('.chat-messages');
            return msgContainer ? msgContainer.scrollTop : 0;
        });
        
        console.log('Initial scroll position:', initialScrollTop);
        
        // Long press on a middle message to delete
        const messageWrappers = await page.$$('.message-wrapper');
        if (messageWrappers.length > 6) {
            const targetMessage = messageWrappers[5]; // Delete the 6th message
            
            // Get message position before deletion
            const messageBefore = await targetMessage.boundingBox();
            
            // Long press to show tooltip
            await targetMessage.hover();
            await page.mouse.down();
            await page.waitForTimeout(1000); // Wait for long press
            await page.mouse.up();
            
            // Wait for tooltip
            await page.waitForSelector('.message-tooltip[x-show="show"]', { state: 'visible' });
            
            // Click delete button
            await page.click('.tooltip-action:has-text("删除")');
            await page.waitForTimeout(1000); // Wait for deletion and re-render
            
            // Get new scroll position
            const newScrollTop = await page.evaluate(() => {
                const msgContainer = document.querySelector('.chat-messages');
                return msgContainer ? msgContainer.scrollTop : 0;
            });
            
            console.log('New scroll position:', newScrollTop);
            
            // Check that scroll position was maintained (with some tolerance for the deleted message height)
            // The scroll position should be relatively stable, not jump to top (0)
            expect(newScrollTop).toBeGreaterThan(50); // Should not be at top
            
            // Verify message was deleted
            const remainingMessages = await page.$$('.message-wrapper');
            expect(remainingMessages.length).toBe(messageWrappers.length - 1);
        }
    });
});