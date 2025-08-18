const { test, expect } = require('@playwright/test');

test.describe('朋友圈基础功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    
    // 等待 Alpine.js 和相关资源加载完成
    await page.waitForFunction(() => {
      return window.Alpine && 
             window.Alpine.store && 
             window.db &&
             window.Alpine.store('moments');
    });
    
    // 额外等待确保所有初始化完成
    await page.waitForTimeout(2000);
    
    // 清理数据库
    await page.evaluate(async () => {
      await window.db.moments.clear();
      await window.db.momentsComments.clear();  
      await window.db.momentsLikes.clear();
      await window.Alpine.store('moments').loadMoments();
    });
  });

  test('应该能够进入朋友圈页面', async ({ page }) => {
    // 点击朋友圈图标
    await page.click('[data-testid="moments-icon"]');
    
    // 验证进入朋友圈页面
    await expect(page.locator('.header-title:has-text("朋友圈")')).toBeVisible();
    await expect(page.locator('.moments-feed')).toBeVisible();
    
    // 验证空状态
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('.empty-state:has-text("还没有朋友圈动态")')).toBeVisible();
  });

  test('应该能够打开发布朋友圈界面', async ({ page }) => {
    // 进入朋友圈页面
    await page.click('[data-testid="moments-icon"]');
    
    // 点击相机图标
    await page.click('button:has(i.fa-camera)');
    
    // 验证模态框打开
    await expect(page.locator('.modal-overlay')).toBeVisible();
    await expect(page.locator('span:has-text("发朋友圈")')).toBeVisible();
    await expect(page.locator('.moment-textarea')).toBeVisible();
    
    // 验证发表按钮初始状态为禁用
    await expect(page.locator('button:has-text("发表")')).toBeDisabled();
  });

  test('应该能够发布简单的文字朋友圈', async ({ page }) => {
    // 进入朋友圈页面
    await page.click('[data-testid="moments-icon"]');
    
    // 打开发布界面
    await page.click('button:has(i.fa-camera)');
    
    // 输入内容
    const content = '这是一条测试朋友圈';
    await page.fill('.moment-textarea', content);
    
    // 验证发表按钮变为可用
    await expect(page.locator('button:has-text("发表")')).toBeEnabled();
    
    // 发布
    await page.click('button:has-text("发表")');
    
    // 等待发布完成，模态框关闭
    await page.waitForFunction(() => {
      const modal = document.querySelector('.modal-overlay');
      return !modal || getComputedStyle(modal).display === 'none';
    });
    
    // 验证朋友圈出现
    await expect(page.locator('.moment-item')).toBeVisible();
    await expect(page.locator('.moment-text:has-text("' + content + '")')).toBeVisible();
    await expect(page.locator('.moment-username:has-text("我")')).toBeVisible();
  });

  test('应该能够点赞朋友圈', async ({ page }) => {
    // 先创建一条朋友圈
    await page.evaluate(async () => {
      await window.Alpine.store('moments').createMoment('测试点赞', [], '');
    });
    
    // 进入朋友圈页面
    await page.click('[data-testid="moments-icon"]');
    
    // 等待朋友圈加载
    await expect(page.locator('.moment-item')).toBeVisible();
    
    // 点击点赞
    const likeButton = page.locator('.action-button:has(i.fa-heart)').first();
    await likeButton.click();
    
    // 验证点赞状态
    await expect(likeButton).toHaveClass(/liked/);
    
    // 再次点击取消点赞
    await likeButton.click();
    
    // 验证取消点赞
    await expect(likeButton).not.toHaveClass(/liked/);
  });

  test('应该能够评论朋友圈', async ({ page }) => {
    // 先创建一条朋友圈
    await page.evaluate(async () => {
      await window.Alpine.store('moments').createMoment('测试评论', [], '');
    });
    
    // 进入朋友圈页面
    await page.click('[data-testid="moments-icon"]');
    
    // 等待朋友圈加载
    await expect(page.locator('.moment-item')).toBeVisible();
    
    // 点击评论按钮
    await page.click('.action-button:has(i.fa-comment)');
    
    // 验证评论输入框出现
    await expect(page.locator('.comment-input')).toBeVisible();
    
    // 输入评论
    const comment = '这是一条评论';
    await page.fill('.comment-input', comment);
    
    // 提交评论
    await page.click('.comment-submit');
    
    // 验证评论出现
    await expect(page.locator('.comment-content:has-text("' + comment + '")')).toBeVisible();
  });

  test('应该能够在模态框中添加图片URL', async ({ page }) => {
    // 进入朋友圈页面
    await page.click('[data-testid="moments-icon"]');
    
    // 打开发布界面
    await page.click('button:has(i.fa-camera)');
    
    // 输入内容
    await page.fill('.moment-textarea', '测试图片');
    
    // 添加图片URL
    const imageUrl = 'https://picsum.photos/300/300?random=1';
    await page.fill('.image-url-input', imageUrl);
    await page.click('button:has-text("添加")');
    
    // 验证图片预览出现
    await expect(page.locator('.preview-image img')).toBeVisible();
    
    // 验证输入框被清空
    await expect(page.locator('.image-url-input')).toHaveValue('');
  });
});