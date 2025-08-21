const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://127.0.0.1:8888/');
  await page.waitForTimeout(2000);
  
  // Try to manually inject the functions
  const result = await page.evaluate(() => {
    try {
      // Get the original phoneApp
      const originalPhoneApp = window.phoneApp;
      console.log('Original phoneApp exists:', typeof originalPhoneApp === 'function');
      
      // Try to call it and see what we get
      const originalResult = originalPhoneApp();
      console.log('Original result keys:', Object.keys(originalResult));
      console.log('Has profileSaving:', 'profileSaving' in originalResult);
      
      // Manually add the missing properties
      originalResult.profileSaving = false;
      originalResult.handleAvatarUpload = async function(event) {
        console.log('Avatar upload handler called');
      };
      originalResult.saveProfile = async function() {
        console.log('Save profile called');
      };
      
      // Update the phoneApp function
      window.phoneApp = () => originalResult;
      
      return {
        success: true,
        originalKeys: Object.keys(originalResult),
        hasProfileSaving: 'profileSaving' in originalResult
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  console.log('Injection result:', result);
  
  // Now click on profile to test
  await page.click('text=个人资料');
  await page.waitForTimeout(1000);
  
  // Check if save button works now
  const buttonTest = await page.evaluate(() => {
    const saveBtn = document.querySelector('.profile-save-btn');
    return {
      exists: !!saveBtn,
      text: saveBtn ? saveBtn.textContent.trim() : null,
      disabled: saveBtn ? saveBtn.disabled : null
    };
  });
  
  console.log('Button test:', buttonTest);
  
  await page.waitForTimeout(3000);
  await browser.close();
})();