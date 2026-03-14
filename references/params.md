# 参数参考文档

## Node.js 渲染脚本 V2（render_xhs_v2.js）-- 推荐

```bash
node scripts/render_xhs_v2.js <markdown_file> [options]
```

### 参数列表

| 参数 | 简写 | 说明 | 默认值 |
|---|---|---|---|
| `--output-dir` | `-o` | 输出目录 | 当前工作目录 |
| `--style` | `-s` | 样式主题 | `purple` |
| `--list-styles` | | 列出所有可用样式 | |
| `--help` | | 显示帮助信息 | |

### 样式主题（`--style`）

| 值 | 名称 | 说明 |
|---|---|---|
| `purple` | 紫韵 | 蓝紫色渐变，默认 |
| `xiaohongshu` | 小红书红 | 小红书品牌红渐变 |
| `mint` | 清新薄荷 | 绿色薄荷渐变 |
| `sunset` | 日落橙 | 粉橙日落渐变 |
| `ocean` | 深海蓝 | 天蓝海洋渐变 |
| `elegant` | 优雅白 | 极简灰白渐变 |
| `dark` | 暗黑模式 | 深色编程风格 |
| `warm-orange` | **暖橘风** | 米白底 + 暖橘强调，自定义封面 |
| `chalk-pink` | **粉笔风** | 纯白底 + 玫红强调，Long Cang 手写体，自定义封面 |
| `liz-blue` | **Liz 经典蓝** | 婴儿蓝底 + 薰衣草紫面板，Liz Fosslien 风格，自定义封面 |

---

## Python 渲染脚本（render_xhs.py）

```bash
python scripts/render_xhs.py <markdown_file> [options]
```

### 参数列表

| 参数 | 简写 | 说明 | 默认值 |
|---|---|---|---|
| `--output-dir` | `-o` | 输出目录 | 当前工作目录 |
| `--theme` | `-t` | 排版主题 | `sketch` |
| `--mode` | `-m` | 分页模式 | `separator` |
| `--width` | `-w` | 图片宽度（px） | `1080` |
| `--height` | | 图片高度（`dynamic` 下为最小高度） | `1440` |
| `--max-height` | | `dynamic` 模式下的最大高度 | `4320` |
| `--dpr` | | 设备像素比（清晰度） | `2` |

### 排版主题（`--theme`）

| 值 | 名称 | 说明 |
|---|---|---|
| `sketch` | 手绘素描 | 手绘风格，默认 |
| `default` | 默认简约 | 浅灰渐变背景（`#f3f3f3 → #f9f9f9`） |
| `playful-geometric` | 活泼几何 | Memphis 设计风格 |
| `neo-brutalism` | 新粗野主义 | 粗框线条、强对比 |
| `botanical` | 植物园自然 | 自然绿植风格 |
| `professional` | 专业商务 | 简洁商务蓝 |
| `retro` | 复古怀旧 | 暖色复古感 |
| `terminal` | 终端命令行 | 深色代码终端风格 |

### 分页模式（`--mode`）

| 值 | 说明 | 适用场景 |
|---|---|---|
| `separator` | 按 `---` 分隔符分页 | 内容已手动控量，需要精确分页 |
| `auto-fit` | 固定尺寸，自动整体缩放内容 | 封面 + 单张图，尺寸固定不溢出 |
| `auto-split` | 根据渲染后高度自动切分 | 内容长短不稳定，推荐通用选择 |
| `dynamic` | 根据内容动态调整图片高度 | 允许不同高度卡片，字数 ≤550 |

### 常用命令示例

```bash
# 默认：sketch 主题 + 手动分隔分页
python scripts/render_xhs.py content.md

# 自动分页（推荐内容不稳定时使用）
python scripts/render_xhs.py content.md -m auto-split

# 固定尺寸自动缩放
python scripts/render_xhs.py content.md -m auto-fit

# 切换主题
python scripts/render_xhs.py content.md -t playful-geometric -m auto-split

# 自定义尺寸
python scripts/render_xhs.py content.md -t retro -m dynamic --width 1080 --height 1440 --dpr 2
```

---

## 发布脚本（publish_xhs.py）

```bash
python scripts/publish_xhs.py --title "标题" --desc "描述" --images img1.png img2.png
```

### 参数列表

| 参数 | 简写 | 说明 | 默认值 |
|---|---|---|---|
| `--title` | `-t` | 笔记标题（不超过 20 字） | 必填 |
| `--desc` | `-d` | 笔记描述/正文内容 | `""` |
| `--images` | `-i` | 图片文件路径（可多个） | 必填 |
| `--public` | | 公开发布（默认仅自己可见） | `False` |
| `--post-time` | | 定时发布（格式：`2024-01-01 12:00:00`） | 立即发布 |
| `--api-mode` | | 通过 xhs-api 服务发布 | 本地模式 |
| `--api-url` | | API 服务地址 | `http://localhost:5005` |
| `--dry-run` | | 仅验证，不实际发布 | `False` |

> **注意**：默认以「仅自己可见」发布，确认内容无误后再用 `--public` 公开。

### 常用命令示例

```bash
# 默认（仅自己可见，用于预览确认）
python scripts/publish_xhs.py --title "标题" --desc "描述" --images cover.png card_1.png card_2.png

# 公开发布
python scripts/publish_xhs.py --title "标题" --desc "描述" --images cover.png card_1.png --public

# 定时发布
python scripts/publish_xhs.py --title "标题" --desc "描述" --images *.png --post-time "2024-12-01 10:00:00" --public

# API 模式
python scripts/publish_xhs.py --title "标题" --desc "描述" --images *.png --api-mode

# 仅验证不发布
python scripts/publish_xhs.py --title "标题" --desc "描述" --images *.png --dry-run
```

### 环境变量配置（.env）

```bash
cp env.example.txt .env
```

编辑 `.env`：

```env
# 必需：小红书 Cookie
XHS_COOKIE=your_cookie_string_here

# 可选：API 模式服务地址
XHS_API_URL=http://localhost:5005
```

**Cookie 获取方式**：浏览器登录小红书 → F12 → Network → 任意请求的 Cookie 头，复制完整字符串。

---

## Markdown 文档格式

### YAML 头部元数据

基础字段（所有主题通用）：

```yaml
---
emoji: "🚀"           # 封面装饰 Emoji（默认主题使用）
title: "大标题"        # 封面大标题（不超过 15 字）
subtitle: "副标题文案"  # 封面副标题（不超过 15 字）
---
```

扩展字段（自定义封面主题：warm-orange / chalk-pink / liz-blue）：

```yaml
---
title: "用AI发现你的下一个职业机会"
subtitle: "我是怎么做到的——真实工具，真实方法"
series: "AI × 职场"           # 系列名称（默认：AI × 职场）
issue: "NO.01"                # 期号（默认：NO.01）
stat_number: "6"              # 封面核心数字
stat_unit: "个月"              # 数字单位
stat_label: "提前"             # 数字上方说明
author: "Amy"                 # 作者名（默认：Amy）
author_tag: "AI 应用 · 每周更新" # 作者标签
---
```

### 分页分隔符

使用 `---` 手动分割卡片（配合 `-m separator` 使用）：

```markdown
---
emoji: "💡"
title: "工具推荐"
subtitle: "提升效率的 5 个神器"
---

# 神器一：Notion

> 全能笔记工具...

---

# 神器二：Raycast

快捷启动工具...
```
