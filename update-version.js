#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 获取当前版本号
function getCurrentVersion() {
    const indexContent = fs.readFileSync('index.html', 'utf8');
    const versionMatch = indexContent.match(/RuaPhone v([\d.]+)/);
    return versionMatch ? versionMatch[1] : '1.0.0';
}

// 递增版本号
function incrementVersion(version, type = 'patch') {
    const parts = version.split('.').map(n => parseInt(n));
    
    switch (type) {
        case 'major':
            parts[0]++;
            parts[1] = 0;
            parts[2] = 0;
            break;
        case 'minor':
            parts[1]++;
            parts[2] = 0;
            break;
        case 'patch':
        default:
            parts[2]++;
            break;
    }
    
    return parts.join('.');
}

// 更新所有文件中的版本号
function updateVersion(newVersion) {
    console.log(`🔄 更新版本号到 v${newVersion}`);
    
    // 更新 index.html
    let indexContent = fs.readFileSync('index.html', 'utf8');
    indexContent = indexContent
        .replace(/styles\.css\?v=[\d.]+/g, `styles.css?v=${newVersion}`)
        .replace(/script\.js\?v=[\d.]+/g, `script.js?v=${newVersion}`)
        .replace(/version-update\.js\?v=[\d.]+/g, `version-update.js?v=${newVersion}`)
        .replace(/RuaPhone v[\d.]+/g, `RuaPhone v${newVersion}`);
    fs.writeFileSync('index.html', indexContent);
    
    // 更新 sw.js
    let swContent = fs.readFileSync('sw.js', 'utf8');
    swContent = swContent.replace(/ruaphone-v[\d.]+/g, `ruaphone-v${newVersion}`);
    fs.writeFileSync('sw.js', swContent);
    
    // 更新 version-update.js
    let versionUpdateContent = fs.readFileSync('version-update.js', 'utf8');
    versionUpdateContent = versionUpdateContent.replace(/currentVersion = '[\d.]+'/g, `currentVersion = '${newVersion}'`);
    fs.writeFileSync('version-update.js', versionUpdateContent);
    
    console.log(`✅ 版本号已更新到 v${newVersion}`);
    console.log(`📋 请记住在提交时使用: git commit -m "release: v${newVersion}"`);
}

// 主函数
function main() {
    const args = process.argv.slice(2);
    const versionType = args[0] || 'patch';
    
    if (!['major', 'minor', 'patch'].includes(versionType)) {
        console.error('❌ 无效的版本类型。使用: major, minor, 或 patch');
        process.exit(1);
    }
    
    const currentVersion = getCurrentVersion();
    const newVersion = incrementVersion(currentVersion, versionType);
    
    console.log(`📦 当前版本: v${currentVersion}`);
    console.log(`🚀 新版本: v${newVersion}`);
    
    updateVersion(newVersion);
}

if (require.main === module) {
    main();
}

module.exports = { getCurrentVersion, incrementVersion, updateVersion };