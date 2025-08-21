const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[${msg.type()}]:`, msg.text());
  });
  
  await page.goto('http://127.0.0.1:8888/');
  await page.waitForTimeout(3000);
  
  // Test database operations with more detailed error info
  const testResult = await page.evaluate(async () => {
    try {
      // Check if database is open
      console.log('Database isOpen:', db.isOpen());
      
      // Try to access userProfile table
      console.log('userProfile table:', db.userProfile);
      
      // Try to put a simple test record
      const testRecord = {
        id: 'test123',
        avatar: '',
        name: 'Test',
        gender: 'test',
        age: '25',
        bio: 'test bio',
        updated: Date.now()
      };
      
      console.log('Attempting to save test record:', testRecord);
      
      try {
        await db.userProfile.put(testRecord);
        console.log('Test record saved successfully');
        
        // Try to retrieve it
        const retrieved = await db.userProfile.get('test123');
        console.log('Retrieved record:', retrieved);
        
        return { success: true, retrieved };
      } catch (putError) {
        console.error('Put error details:', putError);
        console.error('Put error name:', putError.name);
        console.error('Put error message:', putError.message);
        console.error('Put error stack:', putError.stack);
        
        return { 
          success: false, 
          error: putError.message,
          errorName: putError.name,
          errorStack: putError.stack
        };
      }
    } catch (error) {
      console.error('General error:', error);
      return { success: false, generalError: error.message };
    }
  });
  
  console.log('Database test result:', testResult);
  
  await page.waitForTimeout(2000);
  await browser.close();
})();