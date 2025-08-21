const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://127.0.0.1:8888/');
  await page.waitForTimeout(2000);
  
  // First set up a profile with avatar
  await page.evaluate(async () => {
    const store = Alpine.store('profile');
    store.profile.name = 'Test User';
    store.profile.avatar = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // 1x1 transparent gif
    await store.saveProfile();
    console.log('Profile set up with avatar');
  });
  
  // Navigate to chat list
  await page.click('text=聊天');
  await page.waitForTimeout(1000);
  
  // Create a new chat if none exists
  const hasChats = await page.evaluate(() => {
    return Alpine.store('chat').chats.length > 0;
  });
  
  if (!hasChats) {
    await page.click('button[title="私聊"]');
    await page.waitForTimeout(500);
    
    // Fill in chat name
    await page.fill('input[placeholder="输入聊天名称"]', 'Test Chat');
    await page.click('button:text("创建")');
    await page.waitForTimeout(1000);
  }
  
  // Click on first chat
  await page.click('.list-item');
  await page.waitForTimeout(1000);
  
  // Send a test message
  await page.fill('.message-input', 'Test message');
  await page.click('.send-button');
  await page.waitForTimeout(1000);
  
  // Check if user avatar is displayed
  const avatarCheck = await page.evaluate(() => {
    const userMessages = document.querySelectorAll('.message.user');
    if (userMessages.length === 0) return { hasMessages: false };
    
    const lastMessage = userMessages[userMessages.length - 1];
    const avatarImg = lastMessage.querySelector('.user-avatar-img');
    const avatarSpan = lastMessage.querySelector('.user-avatar span');
    
    return {
      hasMessages: true,
      hasAvatarImg: !!avatarImg,
      avatarImgSrc: avatarImg ? avatarImg.src : null,
      hasAvatarSpan: !!avatarSpan,
      avatarSpanText: avatarSpan ? avatarSpan.textContent : null
    };
  });
  
  console.log('Avatar check result:', avatarCheck);
  
  await page.waitForTimeout(3000);
  await browser.close();
})();