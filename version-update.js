// 版本更新检查器
class VersionUpdater {
    constructor() {
        this.currentVersion = '1.11.0';
        this.checkInterval = 600000; // 30秒检查一次
        this.init();
    }

    init() {
        // 检查Service Worker更新
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('New service worker activated');
                this.showUpdateNotification();
            });

            // 定期检查更新
            setInterval(() => {
                this.checkForUpdates();
            }, this.checkInterval);

            // 页面加载时检查一次
            setTimeout(() => {
                this.checkForUpdates();
            }, 5000);
        }
    }

    async checkForUpdates() {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            try {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    await registration.update();
                    
                    // 检查是否有新版本等待
                    if (registration.waiting) {
                        this.showUpdateNotification();
                    }
                }
            } catch (error) {
                console.log('Update check failed:', error);
            }
        }
    }

    showUpdateNotification() {
        // 检查是否已经显示过通知
        if (sessionStorage.getItem('update-notification-shown')) {
            return;
        }

        const notification = document.createElement('div');
        notification.id = 'update-notification';
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 60px;
                left: 50%;
                transform: translateX(-50%);
                background: #007AFF;
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10000;
                font-size: 14px;
                text-align: center;
                max-width: 300px;
                animation: slideDown 0.3s ease;
            ">
                <div style="margin-bottom: 8px;">🎉 发现新版本！</div>
                <div style="margin-bottom: 12px; font-size: 12px; opacity: 0.9;">
                    点击刷新按钮获取最新功能
                </div>
                <div>
                    <button onclick="window.versionUpdater.applyUpdate()" style="
                        background: white;
                        color: #007AFF;
                        border: none;
                        padding: 6px 12px;
                        border-radius: 4px;
                        font-size: 12px;
                        cursor: pointer;
                        margin-right: 8px;
                    ">立即刷新</button>
                    <button onclick="window.versionUpdater.dismissUpdate()" style="
                        background: transparent;
                        color: white;
                        border: 1px solid white;
                        padding: 6px 12px;
                        border-radius: 4px;
                        font-size: 12px;
                        cursor: pointer;
                    ">稍后</button>
                </div>
            </div>
            <style>
                @keyframes slideDown {
                    from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
            </style>
        `;

        document.body.appendChild(notification);
        sessionStorage.setItem('update-notification-shown', 'true');

        // 10秒后自动消失
        setTimeout(() => {
            this.dismissUpdate();
        }, 10000);
    }

    async applyUpdate() {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration && registration.waiting) {
                // 告诉waiting SW跳过等待
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
        }
        
        // 强制刷新页面
        window.location.reload(true);
    }

    dismissUpdate() {
        const notification = document.getElementById('update-notification');
        if (notification) {
            notification.remove();
        }
    }
}

// 监听来自Service Worker的消息
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SKIP_WAITING') {
            window.location.reload();
        }
    });
}

// 全局初始化
window.versionUpdater = new VersionUpdater();