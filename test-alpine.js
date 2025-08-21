const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://127.0.0.1:8888/');
  await page.waitForTimeout(2000);
  
  // Test Alpine data parsing
  const alpineTest = await page.evaluate(() => {
    try {
      // Get the phone element
      const phoneElement = document.querySelector('[x-data="phoneApp()"]');
      if (!phoneElement) return 'phoneElement not found';
      
      // Check if Alpine has processed it
      if (!phoneElement._x_dataStack || phoneElement._x_dataStack.length === 0) {
        return 'Alpine dataStack not found or empty';
      }
      
      const data = phoneElement._x_dataStack[0];
      
      return {
        hasProfileSaving: 'profileSaving' in data,
        profileSavingValue: data.profileSaving,
        hasSaveProfile: 'saveProfile' in data,
        hasHandleAvatarUpload: 'handleAvatarUpload' in data,
        dataKeys: Object.keys(data).filter(k => k.includes('profile') || k.includes('save')),
        totalKeys: Object.keys(data).length
      };
    } catch (error) {
      return 'Error: ' + error.message;
    }
  });
  
  console.log('Alpine test result:', alpineTest);
  
  await page.waitForTimeout(2000);
  await browser.close();
})();