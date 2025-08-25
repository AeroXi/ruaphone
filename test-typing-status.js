const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://127.0.0.1:8888/');
  await page.waitForTimeout(1000);
  
  // Set up API configuration to ensure we can test AI responses
  await page.evaluate(() => {
    const settings = Alpine.store('settings');
    settings.apiConfig = {
      apiKey: 'test-key',
      baseURL: 'https://api.openai.com',
      model: 'gpt-3.5-turbo',
      apiType: 'openai'
    };
  });
  
  // Navigate to chat list
  await page.click('text=聊天');
  await page.waitForTimeout(1000);
  
  // Create a test chat programmatically
  await page.evaluate(async () => {
    const chatStore = Alpine.store('chat');
    if (chatStore.chats.length === 0) {
      const chatId = await chatStore.createChat('测试聊天', 'private');
      console.log('Created test chat:', chatId);
    }
  });
  
  await page.waitForTimeout(500);
  
  // Click on first chat
  await page.click('.list-item');
  await page.waitForTimeout(1000);
  
  console.log('Initial chat opened');
  
  // Check initial header title
  const initialTitle = await page.textContent('.header-title');
  console.log('Initial header title:', initialTitle);
  
  // Test the typing status by simulating loading state
  console.log('Testing typing status...');
  
  // Simulate loading state
  await page.evaluate(() => {
    Alpine.store('app').setLoading(true);
  });
  
  await page.waitForTimeout(500);
  
  // Check if header shows "对方正在输入..."
  const typingTitle = await page.textContent('.header-title');
  console.log('Typing state title:', typingTitle);
  
  if (typingTitle === '对方正在输入...') {
    console.log('✅ Typing status display works correctly!');
  } else {
    console.log('❌ Typing status not displaying correctly. Expected: "对方正在输入...", Got:', typingTitle);
  }
  
  // Wait a moment
  await page.waitForTimeout(2000);
  
  // Stop loading state
  await page.evaluate(() => {
    Alpine.store('app').setLoading(false);
  });
  
  await page.waitForTimeout(500);
  
  // Check if header goes back to normal
  const normalTitle = await page.textContent('.header-title');
  console.log('Normal state title:', normalTitle);
  
  if (normalTitle !== '对方正在输入...') {
    console.log('✅ Header returns to normal state correctly!');
  } else {
    console.log('❌ Header not returning to normal state');
  }
  
  // Test actual message sending (without real API call)
  console.log('\nTesting message sending workflow...');
  
  // Send a message
  await page.fill('.message-input', '测试消息');
  await page.click('.send-button');
  await page.waitForTimeout(500);
  
  // Check if message was sent
  const messageExists = await page.evaluate(() => {
    const messages = document.querySelectorAll('.message.user');
    return messages.length > 0;
  });
  
  if (messageExists) {
    console.log('✅ Message sent successfully!');
  } else {
    console.log('❌ Message not sent');
  }
  
  // Check that loading indicator is gone and typing messages don't appear
  const hasThinkingMessage = await page.evaluate(() => {
    return document.textContent.includes('AI正在思考中');
  });
  
  if (!hasThinkingMessage) {
    console.log('✅ No "AI正在思考中" message found!');
  } else {
    console.log('❌ Still showing "AI正在思考中" message');
  }
  
  await page.waitForTimeout(3000);
  await browser.close();
})();