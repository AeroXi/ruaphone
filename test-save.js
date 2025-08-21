const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen to console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Error:', msg.text());
    }
  });
  
  await page.goto('http://127.0.0.1:8888/');
  await page.waitForTimeout(2000);
  
  // Test profile save with detailed error checking
  const testResult = await page.evaluate(async () => {
    try {
      const store = Alpine.store('profile');
      console.log('Profile before save:', store.profile);
      
      // Test database access directly
      try {
        await db.userProfile.put({
          id: 'test_profile',
          avatar: '',
          name: 'Test User',
          gender: 'test',
          age: '25',
          bio: 'Test bio',
          updated: Date.now()
        });
        console.log('Direct database write successful');
      } catch (dbError) {
        console.error('Direct database write failed:', dbError);
        return { success: false, error: 'Database write failed: ' + dbError.message };
      }
      
      // Now test the store save
      const result = await store.saveProfile();
      console.log('Store save result:', result);
      
      return { success: true, result, profile: store.profile };
    } catch (error) {
      console.error('Test error:', error);
      return { success: false, error: error.message, stack: error.stack };
    }
  });
  
  console.log('Test result:', testResult);
  
  await page.waitForTimeout(2000);
  await browser.close();
})();