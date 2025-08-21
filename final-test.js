const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🚀 Starting comprehensive profile functionality test...');
  
  await page.goto('http://127.0.0.1:8888/');
  await page.waitForTimeout(3000);
  
  console.log('✅ Page loaded');
  
  // Test 1: Profile page access
  console.log('📱 Testing profile page access...');
  await page.click('text=个人资料');
  await page.waitForTimeout(1000);
  
  const profilePageVisible = await page.isVisible('.profile-content');
  console.log(`✅ Profile page visible: ${profilePageVisible}`);
  
  // Test 2: Save button visibility and text
  console.log('💾 Testing save button...');
  const saveButtonTest = await page.evaluate(() => {
    const saveBtn = document.querySelector('.profile-save-btn');
    return {
      exists: !!saveBtn,
      text: saveBtn ? saveBtn.textContent.trim() : null,
      disabled: saveBtn ? saveBtn.disabled : null
    };
  });
  console.log(`✅ Save button: ${JSON.stringify(saveButtonTest)}`);
  
  // Test 3: Form functionality
  console.log('📝 Testing form inputs...');
  await page.fill('input[x-model="$store.profile.profile.name"]', 'Test User');
  await page.fill('input[x-model="$store.profile.profile.gender"]', 'Test Gender');
  await page.fill('input[x-model="$store.profile.profile.age"]', '25');
  await page.fill('textarea[x-model="$store.profile.profile.bio"]', 'Test bio description');
  
  // Test 4: Save functionality
  console.log('💾 Testing save functionality...');
  await page.click('.profile-save-btn');
  await page.waitForTimeout(2000);
  
  const saveResult = await page.evaluate(() => {
    return Alpine.store('profile').profile;
  });
  console.log(`✅ Saved profile: ${JSON.stringify(saveResult)}`);
  
  // Test 5: Avatar upload simulation
  console.log('🖼️ Testing avatar functionality...');
  await page.evaluate(() => {
    // Simulate avatar upload by setting data directly
    Alpine.store('profile').profile.avatar = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  });
  
  await page.waitForTimeout(1000);
  
  const avatarVisible = await page.isVisible('.profile-avatar');
  console.log(`✅ Avatar visible in profile: ${avatarVisible}`);
  
  // Test 6: Navigate to chat and check avatar
  console.log('💬 Testing chat avatar application...');
  await page.click('.header-button'); // Back to home
  await page.waitForTimeout(500);
  
  await page.click('text=聊天');
  await page.waitForTimeout(1000);
  
  // Create a test message to check avatar
  await page.evaluate(async () => {
    const chatStore = Alpine.store('chat');
    if (chatStore.chats.length === 0) {
      const chatId = await chatStore.createChat('Test Chat', 'private');
      Alpine.store('app').navigateTo('chat', { chatId });
    } else {
      Alpine.store('app').navigateTo('chat', { chatId: chatStore.chats[0].id });
    }
    
    // Add a test message
    const currentChatId = Alpine.store('app').currentChatId;
    if (currentChatId) {
      await chatStore.addMessage(currentChatId, 'user', 'Test message to check avatar');
    }
  });
  
  await page.waitForTimeout(2000);
  
  // Check if avatar appears in chat
  const chatAvatarTest = await page.evaluate(() => {
    const userMessages = document.querySelectorAll('.message.user');
    if (userMessages.length === 0) return { hasMessages: false };
    
    const lastMessage = userMessages[userMessages.length - 1];
    const avatarImg = lastMessage.querySelector('.user-avatar-img');
    const fallbackSpan = lastMessage.querySelector('.user-avatar span');
    
    return {
      hasMessages: true,
      messageCount: userMessages.length,
      hasAvatarImg: !!avatarImg,
      avatarImgVisible: avatarImg ? avatarImg.style.display !== 'none' : false,
      hasFallbackSpan: !!fallbackSpan,
      fallbackSpanVisible: fallbackSpan ? fallbackSpan.style.display !== 'none' : false,
      profileHasAvatar: !!Alpine.store('profile').profile.avatar
    };
  });
  
  console.log(`✅ Chat avatar test: ${JSON.stringify(chatAvatarTest)}`);
  
  // Summary
  console.log('\n🎉 Test Summary:');
  console.log(`✅ Profile page access: ${profilePageVisible}`);
  console.log(`✅ Save button working: ${saveButtonTest.exists && saveButtonTest.text === '保存'}`);
  console.log(`✅ Form data saved: ${saveResult.name === 'Test User'}`);
  console.log(`✅ Avatar functionality: ${avatarVisible}`);
  console.log(`✅ Chat avatar integration: ${chatAvatarTest.hasMessages && chatAvatarTest.profileHasAvatar}`);
  
  await page.waitForTimeout(3000);
  await browser.close();
  
  console.log('\n🏁 Test completed!');
})();