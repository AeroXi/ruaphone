const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://127.0.0.1:8888/');
  
  // Wait for page to load
  await page.waitForTimeout(2000);
  
  // Check for JavaScript errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  // Force reload to check for any load errors
  await page.reload();
  await page.waitForTimeout(2000);
  
  if (errors.length > 0) {
    console.log('JavaScript errors:', errors);
  }
  
  // Click on profile icon
  await page.click('text=个人资料');
  
  // Wait for profile page
  await page.waitForTimeout(1000);
  
  // Check if save button is visible
  const saveButton = await page.locator('.profile-save-btn');
  const isVisible = await saveButton.isVisible();
  const buttonText = await saveButton.textContent();
  
  console.log('Save button visible:', isVisible);
  console.log('Save button text:', buttonText);
  
  // Check profile store
  const profileData = await page.evaluate(() => {
    return Alpine.store('profile').profile;
  });
  
  console.log('Profile data:', profileData);
  
  // Check Alpine app data
  const alpineData = await page.evaluate(() => {
    const phoneElement = document.querySelector('[x-data="phoneApp()"]');
    if (!phoneElement || !phoneElement._x_dataStack) return null;
    
    const data = phoneElement._x_dataStack[0];
    return {
      hasSaveProfile: typeof data.saveProfile === 'function',
      profileSaving: data.profileSaving,
      hasHandleAvatarUpload: typeof data.handleAvatarUpload === 'function'
    };
  });
  
  console.log('Alpine app data:', alpineData);
  
  await page.waitForTimeout(3000);
  await browser.close();
})();