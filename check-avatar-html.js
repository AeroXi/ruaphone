const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://127.0.0.1:8888/');
  await page.waitForTimeout(3000);
  
  // Check the HTML structure for user avatar
  const htmlCheck = await page.evaluate(() => {
    // Find the chat message template
    const messageTemplate = document.querySelector('template[x-for="message in messages"]');
    if (!messageTemplate) return { found: false, reason: 'Message template not found' };
    
    // Get the template content
    const templateContent = messageTemplate.content || messageTemplate;
    
    // Check for user avatar structure
    const userAvatarDiv = templateContent.querySelector('.user-avatar');
    const avatarImg = templateContent.querySelector('.user-avatar-img');
    const profileReference = templateContent.textContent.includes('$store.profile.profile.avatar');
    
    return {
      found: true,
      hasUserAvatarDiv: !!userAvatarDiv,
      hasAvatarImg: !!avatarImg,
      hasProfileReference: profileReference,
      templateHTML: templateContent.innerHTML?.substring(0, 500)
    };
  });
  
  console.log('HTML structure check:', htmlCheck);
  
  // Also check if we can find the chat page
  const chatPageCheck = await page.evaluate(() => {
    const chatPage = document.querySelector('.page:nth-child(2)'); // Should be chat page
    if (!chatPage) return { found: false };
    
    const userAvatarElements = chatPage.querySelectorAll('.user-avatar');
    const avatarImgElements = chatPage.querySelectorAll('.user-avatar-img');
    
    return {
      found: true,
      userAvatarCount: userAvatarElements.length,
      avatarImgCount: avatarImgElements.length,
      chatPageHTML: chatPage.innerHTML.substring(0, 1000)
    };
  });
  
  console.log('Chat page check:', chatPageCheck);
  
  await page.waitForTimeout(2000);
  await browser.close();
})();