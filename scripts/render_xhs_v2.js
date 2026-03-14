#!/usr/bin/env node
/**
 * 小红书卡片渲染脚本 V2 - Node.js 智能分页版
 * 将 Markdown 文件渲染为小红书风格的图片卡片
 * 
 * 新特性：
 * 1. 智能分页：自动检测内容高度，超出时自动拆分到多张卡片
 * 2. 多种样式：支持多种预设样式主题
 * 
 * 使用方法:
 *   node render_xhs_v2.js <markdown_file> [options]
 * 
 * 依赖安装:
 *   npm install marked js-yaml playwright
 *   npx playwright install chromium
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { marked } = require('marked');
const yaml = require('js-yaml');

// 获取脚本所在目录
const SCRIPT_DIR = path.dirname(__dirname);
const ASSETS_DIR = path.join(SCRIPT_DIR, 'assets');

// 卡片尺寸配置 (3:4 比例)
const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1440;

// 内容区域安全高度
const SAFE_HEIGHT = CARD_HEIGHT - 120 - 100 - 80 - 40; // ~1100px

// 样式配置
const STYLES = {
    'warm-orange': {
        name: "暖橘风",
        cover_bg: "#FAFAF4",
        card_bg: "#FAFAF4",
        accent_color: "#D4602A",
        custom_cover: true,
    },
    'chalk-pink': {
        name: "粉笔风",
        cover_bg: "#FFFFFF",
        card_bg: "#FFFFFF",
        accent_color: "#C80059",
        custom_cover: true,
    },
    'liz-blue': {
        name: "Liz 经典蓝",
        cover_bg: "#BAD2E2",
        card_bg: "#BAD2E2",
        accent_color: "#9696CA",
        custom_cover: true,
    },
};

/**
 * 解析 Markdown 文件，提取 YAML 头部和正文内容
 */
function parseMarkdownFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const yamlPattern = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const yamlMatch = content.match(yamlPattern);
    
    let metadata = {};
    let body = content;
    
    if (yamlMatch) {
        try {
            metadata = yaml.load(yamlMatch[1]) || {};
        } catch (e) {
            metadata = {};
        }
        body = content.slice(yamlMatch[0].length);
    }
    
    return { metadata, body: body.trim() };
}

/**
 * 按照 --- 分隔符拆分正文为多张卡片内容
 */
function splitContentBySeparator(body) {
    const parts = body.split(/\n---+\n/);
    return parts.filter(part => part.trim()).map(part => part.trim());
}

/**
 * 预估内容高度
 */
function estimateContentHeight(content) {
    const lines = content.split('\n');
    let totalHeight = 0;
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            totalHeight += 20;
            continue;
        }
        
        if (trimmed.startsWith('# ')) {
            totalHeight += 130;
        } else if (trimmed.startsWith('## ')) {
            totalHeight += 110;
        } else if (trimmed.startsWith('### ')) {
            totalHeight += 90;
        } else if (trimmed.startsWith('```')) {
            totalHeight += 80;
        } else if (trimmed.match(/^[-*+]\s/)) {
            totalHeight += 85;
        } else if (trimmed.startsWith('>')) {
            totalHeight += 100;
        } else if (trimmed.startsWith('![')) {
            totalHeight += 300;
        } else {
            const charCount = trimmed.length;
            const linesNeeded = Math.max(1, charCount / 28);
            totalHeight += Math.floor(linesNeeded * 42 * 1.7) + 35;
        }
    }
    
    return totalHeight;
}

/**
 * 智能拆分内容
 */
function smartSplitContent(content, maxHeight = SAFE_HEIGHT) {
    const blocks = [];
    let currentBlock = [];
    
    const lines = content.split('\n');
    
    for (const line of lines) {
        if (line.trim().startsWith('#') && currentBlock.length > 0) {
            blocks.push(currentBlock.join('\n'));
            currentBlock = [line];
        } else if (line.trim() === '---') {
            if (currentBlock.length > 0) {
                blocks.push(currentBlock.join('\n'));
                currentBlock = [];
            }
        } else {
            currentBlock.push(line);
        }
    }
    
    if (currentBlock.length > 0) {
        blocks.push(currentBlock.join('\n'));
    }
    
    if (blocks.length <= 1) {
        const paragraphs = content.split('\n\n').filter(b => b.trim());
        blocks.length = 0;
        blocks.push(...paragraphs);
    }
    
    const cards = [];
    let currentCard = [];
    let currentHeight = 0;
    
    for (const block of blocks) {
        const blockHeight = estimateContentHeight(block);
        
        if (blockHeight > maxHeight) {
            if (currentCard.length > 0) {
                cards.push(currentCard.join('\n\n'));
                currentCard = [];
                currentHeight = 0;
            }
            
            const blockLines = block.split('\n');
            let subBlock = [];
            let subHeight = 0;
            
            for (const line of blockLines) {
                const lineHeight = estimateContentHeight(line);
                
                if (subHeight + lineHeight > maxHeight && subBlock.length > 0) {
                    cards.push(subBlock.join('\n'));
                    subBlock = [line];
                    subHeight = lineHeight;
                } else {
                    subBlock.push(line);
                    subHeight += lineHeight;
                }
            }
            
            if (subBlock.length > 0) {
                cards.push(subBlock.join('\n'));
            }
        } else if (currentHeight + blockHeight > maxHeight && currentCard.length > 0) {
            cards.push(currentCard.join('\n\n'));
            currentCard = [block];
            currentHeight = blockHeight;
        } else {
            currentCard.push(block);
            currentHeight += blockHeight;
        }
    }
    
    if (currentCard.length > 0) {
        cards.push(currentCard.join('\n\n'));
    }
    
    return cards.length > 0 ? cards : [content];
}

/**
 * 将 Markdown 转换为 HTML
 */
function convertMarkdownToHtml(mdContent, style = STYLES.purple) {
    const tagsPattern = /((?:#[\w\u4e00-\u9fa5]+\s*)+)$/m;
    const tagsMatch = mdContent.match(tagsPattern);
    let tagsHtml = "";
    
    if (tagsMatch) {
        const tagsStr = tagsMatch[1];
        mdContent = mdContent.slice(0, tagsMatch.index).trim();
        const tags = tagsStr.match(/#([\w\u4e00-\u9fa5]+)/g);
        if (tags) {
            const accent = style.accent_color;
            tagsHtml = '<div class="tags-container">';
            for (const tag of tags) {
                tagsHtml += `<span class="tag" style="background: ${accent};">${tag}</span>`;
            }
            tagsHtml += '</div>';
        }
    }
    
    const html = marked.parse(mdContent, { breaks: true, gfm: true });
    return html + tagsHtml;
}

/**
 * 加载自定义封面模板
 */
function loadCustomCoverTemplate(styleKey, metadata) {
    const coverPath = path.join(ASSETS_DIR, 'covers', `${styleKey}.html`);
    if (!fs.existsSync(coverPath)) return null;

    let html = fs.readFileSync(coverPath, 'utf-8');

    // 处理 hook 字段：生成 HOOK_BLOCK
    const hookText = metadata.hook || '';
    let hookBlock = '';
    if (hookText) {
        // 简单 Markdown → HTML：**bold** → <strong>bold</strong>，换行 → <br>
        let hookHtml = hookText
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        hookBlock = `<div class="hook-section"><div class="hook-text">${hookHtml}</div></div>`;
    } else if (metadata.stat_number) {
        // 没有 hook 时回退到大数字展示
        hookBlock = `<div class="hero-num">
            <div class="num-label">${metadata.stat_label || ''}</div>
            <div class="big-num">${metadata.stat_number || ''}</div>
            <div class="num-unit">${metadata.stat_unit || ''}</div>
        </div>`;
    }

    // 替换所有占位符
    const replacements = {
        '{{TITLE}}': metadata.title || '标题',
        '{{SUBTITLE}}': metadata.subtitle || '',
        '{{EMOJI}}': metadata.emoji || '📝',
        '{{SERIES}}': metadata.series || 'AI × 职场',
        '{{ISSUE}}': metadata.issue || 'NO.01',
        '{{STAT_NUMBER}}': metadata.stat_number || '',
        '{{STAT_UNIT}}': metadata.stat_unit || '',
        '{{STAT_LABEL}}': metadata.stat_label || '',
        '{{AUTHOR}}': metadata.author || 'Amy',
        '{{AUTHOR_TAG}}': metadata.author_tag || 'AI 应用 · 每周更新',
        '{{HOOK_BLOCK}}': hookBlock,
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
        html = html.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    return html;
}

/**
 * 生成封面 HTML
 */
function generateCoverHtml(metadata, styleKey = 'chalk-pink') {
    const style = STYLES[styleKey] || STYLES['chalk-pink'];

    // 尝试加载自定义封面模板
    if (style.custom_cover) {
        const customHtml = loadCustomCoverTemplate(styleKey, metadata);
        if (customHtml) return customHtml;
    }

    const emoji = metadata.emoji || '📝';
    let title = metadata.title || '标题';
    let subtitle = metadata.subtitle || '';

    if (title.length > 15) title = title.slice(0, 15);
    if (subtitle.length > 15) subtitle = subtitle.slice(0, 15);

    const isDark = styleKey === 'dark';
    const textColor = isDark ? '#ffffff' : '#000000';
    const titleGradient = isDark
        ? 'linear-gradient(180deg, #ffffff 0%, #cccccc 100%)'
        : 'linear-gradient(180deg, #2E67B1 0%, #4C4C4C 100%)';
    const innerBg = isDark ? '#1a1a2e' : '#F3F3F3';

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1080, height=1440">
    <title>小红书封面</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Noto Sans SC', 'Source Han Sans CN', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            width: 1080px; height: 1440px; overflow: hidden;
        }
        .cover-container {
            width: 1080px; height: 1440px;
            background: ${style.cover_bg};
            position: relative; overflow: hidden;
        }
        .cover-inner {
            position: absolute; width: 950px; height: 1310px;
            left: 65px; top: 65px;
            background: ${innerBg};
            border-radius: 25px;
            display: flex; flex-direction: column;
            padding: 80px 85px;
        }
        .cover-emoji { font-size: 180px; line-height: 1.2; margin-bottom: 50px; }
        .cover-title {
            font-weight: 900; font-size: 130px; line-height: 1.4;
            background: ${titleGradient};
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            flex: 1;
            display: flex; align-items: flex-start;
            word-break: break-all;
        }
        .cover-subtitle {
            font-weight: 350; font-size: 72px; line-height: 1.4;
            color: ${textColor};
            margin-top: auto;
        }
    </style>
</head>
<body>
    <div class="cover-container">
        <div class="cover-inner">
            <div class="cover-emoji">${emoji}</div>
            <div class="cover-title">${title}</div>
            <div class="cover-subtitle">${subtitle}</div>
        </div>
    </div>
</body>
</html>`;
}

/**
 * 加载主题 CSS 文件
 */
function loadThemeCss(styleKey) {
    const themePath = path.join(ASSETS_DIR, 'themes', `${styleKey}.css`);
    if (fs.existsSync(themePath)) {
        return fs.readFileSync(themePath, 'utf-8');
    }
    return '';
}

/**
 * 生成正文卡片 HTML
 */
function generateCardHtml(content, pageNumber = 1, totalPages = 1, styleKey = 'chalk-pink') {
    const style = STYLES[styleKey] || STYLES['chalk-pink'];
    const htmlContent = convertMarkdownToHtml(content, style);
    const pageText = totalPages > 1 ? `${pageNumber}/${totalPages}` : '';

    // 如果有自定义主题 CSS，加载并注入
    const themeCss = style.custom_cover ? loadThemeCss(styleKey) : '';
    
    const isDark = styleKey === 'dark';
    const cardBg = isDark ? 'rgba(30, 30, 46, 0.95)' : 'rgba(255, 255, 255, 0.95)';
    const textColor = isDark ? '#e0e0e0' : '#475569';
    const headingColor = isDark ? '#ffffff' : '#1e293b';
    const h2Color = isDark ? '#e0e0e0' : '#334155';
    const h3Color = isDark ? '#c0c0c0' : '#475569';
    const codeBg = isDark ? '#252540' : '#f1f5f9';
    const preBg = isDark ? '#0f0f23' : '#1e293b';
    const blockquoteBg = isDark ? '#252540' : '#f1f5f9';
    const blockquoteColor = isDark ? '#a0a0a0' : '#64748b';
    const hrBg = isDark ? '#333355' : '#e2e8f0';
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1080">
    <title>小红书卡片</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Noto Sans SC', 'Source Han Sans CN', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            width: 1080px; min-height: 1440px; overflow: hidden; background: transparent;
        }
        .card-container {
            width: 1080px; min-height: 1440px;
            background: ${style.card_bg};
            position: relative; padding: 50px; overflow: hidden;
        }
        .card-inner {
            background: ${cardBg};
            border-radius: 20px;
            padding: 60px;
            min-height: calc(1440px - 100px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
        }
        .card-content {
            color: ${textColor};
            font-size: 42px;
            line-height: 1.7;
        }
        .card-content h1 {
            font-size: 72px; font-weight: 700; color: ${headingColor};
            margin-bottom: 40px; line-height: 1.3;
        }
        .card-content h2 {
            font-size: 56px; font-weight: 600; color: ${h2Color};
            margin: 50px 0 25px 0; line-height: 1.4;
        }
        .card-content h3 {
            font-size: 48px; font-weight: 600; color: ${h3Color};
            margin: 40px 0 20px 0;
        }
        .card-content p { margin-bottom: 35px; }
        .card-content strong { font-weight: 700; color: ${headingColor}; }
        .card-content em { font-style: italic; color: ${style.accent_color}; }
        .card-content a {
            color: ${style.accent_color}; text-decoration: none;
            border-bottom: 2px solid ${style.accent_color};
        }
        .card-content ul, .card-content ol {
            margin: 30px 0; padding-left: 60px;
        }
        .card-content li { margin-bottom: 20px; line-height: 1.6; }
        .card-content blockquote {
            border-left: 8px solid ${style.accent_color};
            padding-left: 40px;
            background: ${blockquoteBg};
            padding-top: 25px; padding-bottom: 25px; padding-right: 30px;
            margin: 35px 0;
            color: ${blockquoteColor};
            font-style: italic;
            border-radius: 0 12px 12px 0;
        }
        .card-content blockquote p { margin: 0; }
        .card-content code {
            background: ${codeBg};
            padding: 6px 16px; border-radius: 8px;
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
            font-size: 38px;
            color: ${style.accent_color};
        }
        .card-content pre {
            background: ${preBg};
            color: ${isDark ? '#e0e0e0' : '#e2e8f0'};
            padding: 40px; border-radius: 16px;
            margin: 35px 0;
            overflow-x: visible;
            overflow-wrap: break-word;
            word-wrap: break-word;
            word-break: break-all;
            white-space: pre-wrap;
            font-size: 36px; line-height: 1.5;
        }
        .card-content pre code {
            background: transparent; color: inherit; padding: 0; font-size: inherit;
        }
        .card-content img {
            max-width: 100%; height: auto; border-radius: 16px;
            margin: 35px auto; display: block;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        .card-content hr {
            border: none; height: 2px;
            background: ${hrBg};
            margin: 50px 0;
        }
        .tags-container {
            margin-top: 50px; padding-top: 30px;
            border-top: 2px solid ${hrBg};
        }
        .tag {
            display: inline-block;
            background: ${style.accent_color};
            color: white;
            padding: 12px 28px; border-radius: 30px;
            font-size: 34px;
            margin: 10px 15px 10px 0;
            font-weight: 500;
        }
        .page-number {
            position: absolute;
            bottom: 80px; right: 80px;
            font-size: 36px;
            color: rgba(255, 255, 255, 0.8);
            font-weight: 500;
        }
        ${themeCss ? `/* Theme Override */\n${themeCss}` : ''}
    </style>
</head>
<body>
    <div class="card-container">
        <div class="card-inner">
            <div class="card-content">
                ${htmlContent}
            </div>
        </div>
        <div class="page-number">${pageText}</div>
    </div>
</body>
</html>`;
}

/**
 * 测量内容高度
 * 优先测量 .card-content 的实际内容高度（避免 min-height 干扰）
 */
async function measureContentHeight(page, htmlContent) {
    await page.setContent(htmlContent, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);

    return await page.evaluate(() => {
        // 优先测量内容区域实际高度，加上 padding
        const content = document.querySelector('.card-content');
        if (content) {
            const inner = document.querySelector('.card-inner');
            const innerStyle = inner ? getComputedStyle(inner) : null;
            const paddingTop = innerStyle ? parseFloat(innerStyle.paddingTop) : 60;
            const paddingBottom = innerStyle ? parseFloat(innerStyle.paddingBottom) : 60;
            return content.scrollHeight + paddingTop + paddingBottom;
        }
        const container = document.querySelector('.card-container');
        return container ? container.scrollHeight : document.body.scrollHeight;
    });
}

/**
 * 处理和渲染卡片 — 贪心段落填充算法
 * 把所有内容视为连续段落流，一段段往卡片里填，填满再开下一页
 */
async function processAndRenderCards(cardContents, outputDir, styleKey) {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: CARD_WIDTH, height: CARD_HEIGHT } });

    const FILL_THRESHOLD = CARD_HEIGHT - 20; // 尽量填满

    try {
        // 把所有内容合并，按段落（空行）拆分
        const allContent = cardContents.join('\n\n');
        const blocks = allContent.split(/\n\n+/).filter(b => b.trim());

        const cards = [];
        let currentBlocks = [];

        for (const block of blocks) {
            const testContent = [...currentBlocks, block].join('\n\n');
            const testHtml = generateCardHtml(testContent, 1, 1, styleKey);
            const testHeight = await measureContentHeight(page, testHtml);

            if (testHeight > FILL_THRESHOLD && currentBlocks.length > 0) {
                // 当前卡片已满，保存并开新卡
                cards.push(currentBlocks.join('\n\n'));
                currentBlocks = [block];
            } else {
                currentBlocks.push(block);
            }
        }

        if (currentBlocks.length > 0) {
            cards.push(currentBlocks.join('\n\n'));
        }

        return cards;
    } finally {
        await browser.close();
    }
}

/**
 * 渲染 HTML 到图片
 */
async function renderHtmlToImage(page, htmlContent, outputPath) {
    await page.setContent(htmlContent, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    
    await page.screenshot({
        path: outputPath,
        clip: { x: 0, y: 0, width: CARD_WIDTH, height: CARD_HEIGHT },
        type: 'png'
    });
    
    console.log(`  ✅ 已生成: ${outputPath}`);
}

/**
 * 主渲染函数
 */
async function renderMarkdownToCards(mdFile, outputDir, styleKey = 'chalk-pink') {
    console.log(`\n🎨 开始渲染: ${mdFile}`);
    console.log(`🎨 使用样式: ${STYLES[styleKey].name}`);
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const data = parseMarkdownFile(mdFile);
    const { metadata, body } = data;
    
    const cardContents = splitContentBySeparator(body);
    console.log(`  📄 检测到 ${cardContents.length} 个内容块`);
    
    console.log('  🔍 分析内容高度并智能分页...');
    const processedCards = await processAndRenderCards(cardContents, outputDir, styleKey);
    const totalCards = processedCards.length;
    console.log(`  📄 将生成 ${totalCards} 张卡片`);
    
    const style = STYLES[styleKey] || STYLES['chalk-pink'];
    if (metadata.emoji || metadata.title || style.custom_cover) {
        console.log('  📷 生成封面...');
        const coverHtml = generateCoverHtml(metadata, styleKey);
        
        const browser = await chromium.launch();
        const page = await browser.newPage({ viewport: { width: CARD_WIDTH, height: CARD_HEIGHT } });
        
        try {
            await renderHtmlToImage(page, coverHtml, path.join(outputDir, 'cover.png'));
        } finally {
            await browser.close();
        }
    }
    
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: CARD_WIDTH, height: CARD_HEIGHT } });
    
    try {
        for (let i = 0; i < processedCards.length; i++) {
            const pageNum = i + 1;
            console.log(`  📷 生成卡片 ${pageNum}/${totalCards}...`);
            
            const cardHtml = generateCardHtml(processedCards[i], pageNum, totalCards, styleKey);
            const cardPath = path.join(outputDir, `card_${pageNum}.png`);
            
            await renderHtmlToImage(page, cardHtml, cardPath);
        }
    } finally {
        await browser.close();
    }
    
    console.log(`\n✨ 渲染完成！共生成 ${totalCards} 张卡片，保存到: ${outputDir}`);
    return totalCards;
}

/**
 * 列出所有样式
 */
function listStyles() {
    console.log('\n📋 可用样式列表：');
    console.log('-'.repeat(40));
    for (const [key, style] of Object.entries(STYLES)) {
        console.log(`  ${key.padEnd(12)} - ${style.name}`);
    }
    console.log('-'.repeat(40));
}

/**
 * 解析命令行参数
 */
function parseArgs() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help')) {
        console.log(`
使用方法: node render_xhs_v2.js <markdown_file> [options]

选项:
  -o, --output-dir <dir>   输出目录（默认为当前工作目录）
  -s, --style <style>      样式主题（默认: chalk-pink）
  --list-styles           列出所有可用样式
  --help                  显示帮助信息

可用样式:
  warm-orange, chalk-pink, liz-blue

示例:
  node render_xhs_v2.js note.md
  node render_xhs_v2.js note.md -o ./output --style warm-orange
        `);
        process.exit(0);
    }
    
    if (args.includes('--list-styles')) {
        listStyles();
        process.exit(0);
    }
    
    let markdownFile = null;
    let outputDir = process.cwd();
    let style = 'chalk-pink';
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--output-dir' || args[i] === '-o') {
            outputDir = args[i + 1];
            i++;
        } else if (args[i] === '--style' || args[i] === '-s') {
            if (STYLES[args[i + 1]]) {
                style = args[i + 1];
            } else {
                console.error(`❌ 无效样式: ${args[i + 1]}`);
                console.log('可用样式:', Object.keys(STYLES).join(', '));
                process.exit(1);
            }
            i++;
        } else if (!args[i].startsWith('-')) {
            markdownFile = args[i];
        }
    }
    
    if (!markdownFile) {
        console.error('❌ 错误: 请指定 Markdown 文件');
        process.exit(1);
    }
    
    if (!fs.existsSync(markdownFile)) {
        console.error(`❌ 错误: 文件不存在 - ${markdownFile}`);
        process.exit(1);
    }
    
    return { markdownFile, outputDir, style };
}

// 主函数
async function main() {
    const { markdownFile, outputDir, style } = parseArgs();
    await renderMarkdownToCards(markdownFile, outputDir, style);
}

main().catch(error => {
    console.error('❌ 渲染失败:', error.message);
    process.exit(1);
});
