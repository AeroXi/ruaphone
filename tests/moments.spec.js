const { test, expect } = require('@playwright/test');

test.describe('朋友圈功能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 访问主页
    await page.goto('/index.html');
    
    // 等待 Alpine.js 和所有 stores 初始化完成
    await page.waitForFunction(() => {
      return window.Alpine && 
             window.Alpine.store && 
             window.Alpine.store('moments') &&
             window.db;
    });
    
    // 等待应用完全加载
    await page.waitForTimeout(1000);
    
    // 清理数据库（如果存在之前的测试数据）
    await page.evaluate(() => {
      return Promise.all([
        window.db.moments.clear(),
        window.db.momentsComments.clear(),
        window.db.momentsLikes.clear()
      ]);
    });
  });

  test('应该成功发布朋友圈', async ({ page }) => {
    // 点击朋友圈图标进入朋友圈页面
    await page.click('[data-testid="moments-icon"]');
    
    // 等待朋友圈页面加载
    await expect(page.locator('.header-title:has-text("朋友圈")')).toBeVisible();
    
    // 点击右上角相机图标打开发布界面
    await page.click('button:has(i.fa-camera)');
    
    // 等待发布模态框出现
    await expect(page.locator('.modal-overlay')).toBeVisible();
    await expect(page.locator('span:has-text("发朋友圈")')).toBeVisible();
    
    // 输入朋友圈内容
    const momentContent = '这是我的第一条朋友圈动态！';
    await page.fill('.moment-textarea', momentContent);
    
    // 添加位置信息
    const location = '北京市朝阳区';
    await page.fill('.location-input', location);
    
    // 添加图片URL
    const imageUrl = 'https://picsum.photos/300/300?random=1';
    await page.fill('.image-url-input', imageUrl);
    await page.click('button:has-text("添加")');
    
    // 验证图片预览出现
    await expect(page.locator('.preview-image img')).toBeVisible();
    
    // 点击发表按钮
    await page.click('button:has-text("发表")');
    
    // 等待模态框关闭（增加超时时间）
    await expect(page.locator('.modal-overlay')).toBeHidden({ timeout: 10000 });
    
    // 验证朋友圈动态出现在列表中
    await expect(page.locator('.moment-item')).toBeVisible();
    await expect(page.locator('.moment-text:has-text("' + momentContent + '")')).toBeVisible();
    await expect(page.locator('.moment-location:has-text("' + location + '")')).toBeVisible();
    await expect(page.locator('.moment-image img')).toBeVisible();
    
    // 验证用户名和时间显示
    await expect(page.locator('.moment-username:has-text("我")')).toBeVisible();
    await expect(page.locator('.moment-time')).toBeVisible();
  });

  test('应该能够点赞朋友圈', async ({ page }) => {
    // 先发布一条朋友圈
    await page.evaluate(() => {
      return window.Alpine.store('moments').createMoment('测试点赞功能', [], '测试地点');
    });
    
    // 进入朋友圈页面
    await page.click('[data-testid="moments-icon"]');
    
    // 等待朋友圈动态加载
    await expect(page.locator('.moment-item')).toBeVisible();
    
    // 点击点赞按钮
    const likeButton = page.locator('.action-button:has(i.fa-heart)');
    await likeButton.click();
    
    // 验证点赞状态改变
    await expect(likeButton).toHaveClass(/liked/);
    
    // 验证点赞信息显示
    await expect(page.locator('.likes-info:has-text("我")')).toBeVisible();
    
    // 再次点击取消点赞
    await likeButton.click();
    
    // 验证点赞状态取消
    await expect(likeButton).not.toHaveClass(/liked/);
    await expect(page.locator('.likes-info')).toBeHidden();
  });

  test('应该能够评论朋友圈', async ({ page }) => {
    // 先发布一条朋友圈
    await page.evaluate(() => {
      return window.Alpine.store('moments').createMoment('测试评论功能', [], '');
    });
    
    // 进入朋友圈页面
    await page.click('[data-testid="moments-icon"]');
    
    // 等待朋友圈动态加载
    await expect(page.locator('.moment-item')).toBeVisible();
    
    // 点击评论按钮
    await page.click('.action-button:has(i.fa-comment)');
    
    // 验证评论输入框出现
    await expect(page.locator('.comment-input-container')).toBeVisible();
    
    // 输入评论内容
    const commentContent = '这是一条测试评论';
    await page.fill('.comment-input', commentContent);
    
    // 提交评论
    await page.click('.comment-submit');
    
    // 验证评论出现在评论区
    await expect(page.locator('.moment-comments')).toBeVisible();
    await expect(page.locator('.comment-content:has-text("' + commentContent + '")')).toBeVisible();
    await expect(page.locator('.comment-user:has-text("我")')).toBeVisible();
    
    // 验证评论输入框消失
    await expect(page.locator('.comment-input-container')).toBeHidden();
  });

  test('应该显示空状态当没有朋友圈时', async ({ page }) => {
    // 进入朋友圈页面
    await page.click('[data-testid="moments-icon"]');
    
    // 验证空状态显示
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('.empty-state:has-text("还没有朋友圈动态")')).toBeVisible();
    await expect(page.locator('button:has-text("发布第一条朋友圈")')).toBeVisible();
    
    // 点击发布按钮应该打开发布界面
    await page.click('button:has-text("发布第一条朋友圈")');
    await expect(page.locator('.modal-overlay')).toBeVisible();
  });

  test('应该能够添加和移除多张图片', async ({ page }) => {
    // 进入朋友圈页面
    await page.click('[data-testid="moments-icon"]');
    
    // 打开发布界面
    await page.click('button:has(i.fa-camera)');
    await expect(page.locator('.modal-overlay')).toBeVisible();
    
    // 输入内容
    await page.fill('.moment-textarea', '测试多图片发布');
    
    // 添加第一张图片
    await page.fill('.image-url-input', 'https://picsum.photos/300/300?random=1');
    await page.click('button:has-text("添加")');
    await expect(page.locator('.preview-images .preview-image')).toHaveCount(1);
    
    // 添加第二张图片
    await page.fill('.image-url-input', 'https://picsum.photos/300/300?random=2');
    await page.click('button:has-text("添加")');
    await expect(page.locator('.preview-images .preview-image')).toHaveCount(2);
    
    // 添加第三张图片
    await page.fill('.image-url-input', 'https://picsum.photos/300/300?random=3');
    await page.click('button:has-text("添加")');
    await expect(page.locator('.preview-images .preview-image')).toHaveCount(3);
    
    // 移除第二张图片
    await page.click('.preview-images .preview-image:nth-child(2) .remove-image');
    await expect(page.locator('.preview-images .preview-image')).toHaveCount(2);
    
    // 发布朋友圈
    await page.click('button:has-text("发表")');
    
    // 验证发布成功，包含2张图片
    await expect(page.locator('.moment-item .moment-images .moment-image')).toHaveCount(2);
  });

  test('应该正确显示时间格式', async ({ page }) => {
    // 创建不同时间的朋友圈用于测试时间格式
    await page.evaluate(() => {
      const now = Date.now();
      const momentsStore = window.Alpine.store('moments');
      
      // 创建几条不同时间的朋友圈
      const promises = [
        // 刚刚
        momentsStore.createMoment('刚刚发布', [], ''),
        // 30分钟前
        window.db.moments.add({
          id: 'test_30min',
          userId: 'user',
          userName: '我',
          userAvatar: '👤',
          content: '30分钟前发布',
          images: [],
          location: '',
          timestamp: now - 30 * 60 * 1000
        }),
        // 2小时前
        window.db.moments.add({
          id: 'test_2hour',
          userId: 'user',
          userName: '我',
          userAvatar: '👤',
          content: '2小时前发布',
          images: [],
          location: '',
          timestamp: now - 2 * 60 * 60 * 1000
        })
      ];
      
      return Promise.all(promises).then(() => momentsStore.loadMoments());
    });
    
    // 进入朋友圈页面
    await page.click('[data-testid="moments-icon"]');
    
    // 验证时间格式显示
    await expect(page.locator('.moment-time:has-text("刚刚"), .moment-time:has-text("分钟前")')).toBeVisible();
    await expect(page.locator('.moment-time:has-text("30分钟前")')).toBeVisible();
    await expect(page.locator('.moment-time:has-text("2小时前")')).toBeVisible();
  });

  test('发布时应该验证必填字段', async ({ page }) => {
    // 进入朋友圈页面
    await page.click('[data-testid="moments-icon"]');
    
    // 打开发布界面
    await page.click('button:has(i.fa-camera)');
    await expect(page.locator('.modal-overlay')).toBeVisible();
    
    // 不输入任何内容，发表按钮应该是禁用状态
    const publishButton = page.locator('button:has-text("发表")');
    await expect(publishButton).toBeDisabled();
    
    // 输入内容后，发表按钮应该可用
    await page.fill('.moment-textarea', '现在可以发布了');
    await expect(publishButton).toBeEnabled();
    
    // 清空内容，按钮又应该禁用
    await page.fill('.moment-textarea', '');
    await expect(publishButton).toBeDisabled();
  });
});