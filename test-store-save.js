const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[${msg.type()}]:`, msg.text());
  });
  
  await page.goto('http://127.0.0.1:8888/');
  await page.waitForTimeout(3000);
  
  // Test store save with detailed debugging
  const testResult = await page.evaluate(async () => {
    try {
      const store = Alpine.store('profile');
      console.log('Profile store:', store);
      console.log('Profile before save:', JSON.stringify(store.profile));
      
      // Manually call saveProfile with detailed logging
      try {
        console.log('Adding updated timestamp...');
        store.profile.updated = Date.now();
        console.log('Profile with timestamp:', JSON.stringify(store.profile));
        
        console.log('Calling db.userProfile.put...');
        await db.userProfile.put(store.profile);
        console.log('db.userProfile.put completed successfully');
        
        return { success: true, profile: store.profile };
      } catch (saveError) {
        console.error('Save error in store:', saveError);
        console.error('Save error name:', saveError.name);
        console.error('Save error message:', saveError.message);
        
        return { 
          success: false, 
          error: saveError.message,
          errorName: saveError.name
        };
      }
    } catch (error) {
      console.error('General store error:', error);
      return { success: false, generalError: error.message };
    }
  });
  
  console.log('Store save test result:', testResult);
  
  await page.waitForTimeout(2000);
  await browser.close();
})();