const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[${msg.type()}]:`, msg.text());
  });
  
  await page.goto('http://127.0.0.1:8888/', { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Test the new saveProfile method
  const testResult = await page.evaluate(async () => {
    try {
      const store = Alpine.store('profile');
      console.log('Calling store.saveProfile()...');
      
      const result = await store.saveProfile();
      console.log('Store.saveProfile() result:', result);
      
      return { success: true, result };
    } catch (error) {
      console.error('Error calling store.saveProfile():', error);
      return { success: false, error: error.message };
    }
  });
  
  console.log('New save test result:', testResult);
  
  await page.waitForTimeout(2000);
  await browser.close();
})();