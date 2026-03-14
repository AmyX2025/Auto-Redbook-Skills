# 小红书笔记样式预览

本文档展示所有可用的样式主题，方便用户选择合适的设计风格。

## 样式列表

### 1. purple（紫韵）- 默认
- **封面背景**：蓝紫色渐变
- **卡片背景**：紫蓝渐变
- **强调色**：#6366f1
- **适用场景**：通用、科技感、创意设计

```bash
python scripts/render_xhs_v2.py note.md --style purple
```

### 2. xiaohongshu（小红书红）
- **封面背景**：小红书品牌红渐变
- **卡片背景**：粉红渐变
- **强调色**：#FF2442
- **适用场景**：小红书原生风格、时尚、生活方式

```bash
python scripts/render_xhs_v2.py note.md --style xiaohongshu
```

### 3. mint（清新薄荷）
- **封面背景**：绿色渐变
- **卡片背景**：薄荷绿渐变
- **强调色**：#43e97b
- **适用场景**：健康、环保、自然、春季主题

```bash
python scripts/render_xhs_v2.py note.md --style mint
```

### 4. sunset（日落橙）
- **封面背景**：粉橙渐变
- **卡片背景**：日落渐变
- **强调色**：#fa709a
- **适用场景**：温暖、浪漫、傍晚、秋季主题

```bash
python scripts/render_xhs_v2.py note.md --style sunset
```

### 5. ocean（深海蓝）
- **封面背景**：天蓝渐变
- **卡片背景**：海洋蓝渐变
- **强调色**：#4facfe
- **适用场景**：清新、水、夏季主题、专业商务

```bash
python scripts/render_xhs_v2.py note.md --style ocean
```

### 6. elegant（优雅白）
- **封面背景**：灰白渐变
- **卡片背景**：浅灰渐变
- **强调色**：#333333
- **适用场景**：极简、商务、正式、高级

```bash
python scripts/render_xhs_v2.py note.md --style elegant
```

### 7. dark（暗黑模式）
- **封面背景**：深蓝黑色渐变
- **卡片背景**：深色渐变
- **强调色**：#e94560
- **适用场景**：夜间阅读、科技、编程、游戏

```bash
python scripts/render_xhs_v2.py note.md --style dark
```

### 8. warm-orange（暖橘风）-- 自定义封面
- **封面背景**：米白色 #FAFAF4
- **卡片背景**：米白色 #FAFAF4
- **强调色**：#D4602A（暖橘色）
- **字体**：Noto Serif SC（标题）+ Noto Sans SC（正文）
- **特色**：自定义封面模板，含核心数字展示、系列标签、作者署名
- **适用场景**：知识分享、职场教程、个人品牌

```bash
node scripts/render_xhs_v2.js note.md --style warm-orange
```

### 9. chalk-pink（粉笔风）-- 自定义封面
- **封面背景**：纯白色 #FFFFFF
- **卡片背景**：纯白色 #FFFFFF
- **强调色**：#C80059（玫红色）
- **字体**：Long Cang 手写体（标题）+ Noto Sans SC（正文）
- **特色**：自定义封面模板，手写风格标题，杂志感排版
- **适用场景**：时尚、生活方式、个人感悟

```bash
node scripts/render_xhs_v2.js note.md --style chalk-pink
```

### 10. liz-blue（Liz 经典蓝）-- 自定义封面
- **封面背景**：婴儿蓝 #BAD2E2
- **卡片背景**：婴儿蓝 #BAD2E2
- **强调色**：#9696CA（薰衣草紫面板）
- **字体**：Nunito（英文/标签）+ Noto Sans SC（中文）
- **特色**：自定义封面模板，Liz Fosslien 风格，深色胶囊标签，SVG 简笔画人物
- **适用场景**：职场观点、数据故事、创意对比

```bash
node scripts/render_xhs_v2.js note.md --style liz-blue
```

## 样式选择建议

| 内容类型 | 推荐样式 |
|----------|----------|
| 科技/编程 | dark, purple |
| 时尚/美妆 | xiaohongshu, sunset, chalk-pink |
| 健康/自然 | mint, ocean |
| 商务/职场 | ocean, elegant, warm-orange |
| 生活/情感 | sunset, xiaohongshu, chalk-pink |
| 创意/设计 | purple, dark, liz-blue |
| 知识分享 | warm-orange, liz-blue |
| 个人品牌 | warm-orange, chalk-pink, liz-blue |

## 查看所有样式

运行以下命令列出所有可用样式：

```bash
# Python 版本
python scripts/render_xhs_v2.py --list-styles

# Node.js 版本
node scripts/render_xhs_v2.js --list-styles
```
