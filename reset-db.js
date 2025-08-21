const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://127.0.0.1:8888/');
  await page.waitForTimeout(2000);
  
  // Reset database
  const resetResult = await page.evaluate(async () => {
    try {
      if (typeof window.resetDatabase === 'function') {
        await window.resetDatabase();
        return 'Database reset successfully';
      } else {
        return 'resetDatabase function not found';
      }
    } catch (error) {
      return 'Error resetting database: ' + error.message;
    }
  });
  
  console.log('Reset result:', resetResult);
  
  // Wait for page reload after reset
  await page.waitForTimeout(3000);
  
  // Try profile save again
  const testResult = await page.evaluate(async () => {
    try {
      const store = Alpine.store('profile');
      const result = await store.saveProfile();
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  console.log('Test result after reset:', testResult);
  
  await page.waitForTimeout(2000);
  await browser.close();
})();