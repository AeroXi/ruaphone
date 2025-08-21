const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://127.0.0.1:8888/');
  await page.waitForTimeout(2000);
  
  // Navigate to profile and set avatar
  await page.click('text=个人资料');
  await page.waitForTimeout(1000);
  
  // Set profile data
  await page.evaluate(async () => {
    const store = Alpine.store('profile');
    store.profile.name = 'Test User';
    store.profile.avatar = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    await store.saveProfile();
    console.log('Profile updated with avatar');
  });
  
  // Go back home and navigate to chat
  await page.click('.header-button');
  await page.waitForTimeout(500);
  
  await page.click('text=聊天');
  await page.waitForTimeout(1000);
  
  // Check if we have any chats, if not create one via JS
  const chatCheck = await page.evaluate(async () => {
    const chatStore = Alpine.store('chat');
    if (chatStore.chats.length === 0) {
      // Create a test chat
      const chatId = await chatStore.createChat('Test Chat', 'private');
      console.log('Created test chat:', chatId);
      return { hasChats: true, chatId };
    }
    return { hasChats: true, firstChatId: chatStore.chats[0].id };
  });
  
  console.log('Chat check:', chatCheck);
  
  // Open the chat
  if (chatCheck.hasChats) {
    await page.click('.list-item');
    await page.waitForTimeout(1000);
    
    // Send a message via JS to avoid UI complications
    await page.evaluate(() => {
      const chatStore = Alpine.store('chat');
      const currentChatId = Alpine.store('app').currentChatId;
      chatStore.addMessage(currentChatId, 'user', 'Test message from user');
    });
    
    await page.waitForTimeout(1000);
    
    // Check avatar display
    const avatarResult = await page.evaluate(() => {
      const userMessages = document.querySelectorAll('.message.user');
      if (userMessages.length === 0) return { found: false, reason: 'No user messages' };
      
      const lastMessage = userMessages[userMessages.length - 1];
      const userAvatarDiv = lastMessage.querySelector('.user-avatar');
      const avatarImg = lastMessage.querySelector('.user-avatar-img');
      const fallbackSpan = lastMessage.querySelector('.user-avatar span');
      
      const profileStore = Alpine.store('profile');
      
      return {
        found: true,
        hasUserAvatarDiv: !!userAvatarDiv,
        hasAvatarImg: !!avatarImg,
        avatarImgVisible: avatarImg ? !avatarImg.style.display || avatarImg.style.display !== 'none' : false,
        avatarImgSrc: avatarImg ? avatarImg.src.substring(0, 50) + '...' : null,
        hasFallbackSpan: !!fallbackSpan,
        fallbackSpanVisible: fallbackSpan ? !fallbackSpan.style.display || fallbackSpan.style.display !== 'none' : false,
        profileHasAvatar: !!profileStore.profile.avatar,
        profileAvatarSrc: profileStore.profile.avatar.substring(0, 50) + '...'
      };
    });
    
    console.log('Avatar display result:', avatarResult);
  }
  
  await page.waitForTimeout(3000);
  await browser.close();
})();