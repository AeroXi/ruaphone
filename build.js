const fs = require('fs');
const path = require('path');
const { minify } = require('html-minifier-terser');
const CleanCSS = require('clean-css');
const { minify: minifyJS } = require('terser');

// 创建dist目录
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

console.log('🚀 开始构建RuaPhone...');

async function build() {
    try {
        // 1. 压缩HTML
        console.log('📄 压缩HTML文件...');
        const htmlContent = fs.readFileSync('index.html', 'utf8');
        const minifiedHtml = await minify(htmlContent, {
            removeComments: true,
            removeCommentsFromCDATA: true,
            removeCDATASectionsFromCDATA: true,
            collapseWhitespace: true,
            collapseBooleanAttributes: true,
            removeAttributeQuotes: true,
            removeRedundantAttributes: true,
            useShortDoctype: true,
            removeEmptyAttributes: true,
            removeOptionalTags: true,
            removeEmptyElements: false, // 保留空元素，Alpine.js需要
            minifyJS: true,
            minifyCSS: true
        });
        fs.writeFileSync(path.join(distDir, 'index.html'), minifiedHtml);

        // 2. 压缩CSS
        console.log('🎨 压缩CSS文件...');
        const cssContent = fs.readFileSync('styles.css', 'utf8');
        const minifiedCSS = new CleanCSS({
            level: 2,
            returnPromise: false
        }).minify(cssContent);
        
        if (minifiedCSS.errors.length > 0) {
            console.warn('CSS压缩警告:', minifiedCSS.errors);
        }
        
        fs.writeFileSync(path.join(distDir, 'styles.css'), minifiedCSS.styles);

        // 3. 压缩JavaScript
        console.log('⚡ 压缩JavaScript文件...');
        const jsContent = fs.readFileSync('script.js', 'utf8');
        const minifiedJS = await minifyJS(jsContent, {
            compress: {
                drop_console: true, // 移除console.log
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.warn'] // 移除特定函数调用
            },
            mangle: {
                reserved: ['Alpine'] // 保护Alpine.js相关变量名
            },
            format: {
                comments: false
            }
        });
        fs.writeFileSync(path.join(distDir, 'script.js'), minifiedJS.code);

        // 4. 复制Service Worker (不压缩，保持功能性)
        console.log('⚙️ 复制Service Worker...');
        if (fs.existsSync('sw.js')) {
            const swContent = fs.readFileSync('sw.js', 'utf8');
            // 轻微压缩SW，但保留可读性
            const minifiedSW = await minifyJS(swContent, {
                compress: {
                    drop_console: false, // SW中保留console用于调试
                    drop_debugger: true
                },
                mangle: false, // 不混淆SW代码
                format: {
                    comments: false
                }
            });
            fs.writeFileSync(path.join(distDir, 'sw.js'), minifiedSW.code);
        }

        // 5. 复制manifest.json
        console.log('📱 复制PWA manifest...');
        if (fs.existsSync('manifest.json')) {
            fs.copyFileSync('manifest.json', path.join(distDir, 'manifest.json'));
        }

        // 6. 创建_headers文件用于Cloudflare Pages
        console.log('🔧 创建HTTP头配置...');
        const headers = `/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()

/*.html
  Cache-Control: public, max-age=0, must-revalidate

/*.css
  Cache-Control: public, max-age=31536000, immutable

/*.js
  Cache-Control: public, max-age=31536000, immutable

/manifest.json
  Cache-Control: public, max-age=86400

/sw.js
  Cache-Control: public, max-age=0, must-revalidate`;
        
        fs.writeFileSync(path.join(distDir, '_headers'), headers);

        // 7. 创建_redirects文件用于SPA路由
        console.log('🔀 创建路由重定向配置...');
        const redirects = `# SPA fallback
/*    /index.html   200`;
        
        fs.writeFileSync(path.join(distDir, '_redirects'), redirects);

        // 8. 复制其他必要文件
        console.log('📋 复制其他文件...');
        const filesToCopy = ['README.md'];
        
        filesToCopy.forEach(file => {
            if (fs.existsSync(file)) {
                fs.copyFileSync(file, path.join(distDir, file));
            }
        });

        // 9. 生成构建信息
        const buildInfo = {
            buildTime: new Date().toISOString(),
            version: require('./package.json').version,
            environment: process.env.ENVIRONMENT || 'development'
        };
        
        fs.writeFileSync(
            path.join(distDir, 'build-info.json'), 
            JSON.stringify(buildInfo, null, 2)
        );

        console.log('✅ 构建完成！输出目录: dist/');
        console.log('📊 构建统计:');
        
        // 显示文件大小统计
        const stats = fs.readdirSync(distDir).map(file => {
            const filePath = path.join(distDir, file);
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
                return {
                    file,
                    size: (stat.size / 1024).toFixed(2) + ' KB'
                };
            }
        }).filter(Boolean);
        
        stats.forEach(({ file, size }) => {
            console.log(`  ${file}: ${size}`);
        });

    } catch (error) {
        console.error('❌ 构建失败:', error);
        process.exit(1);
    }
}

build();