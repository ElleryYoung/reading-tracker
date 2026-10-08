# 阅读记录 Reading Tracker

个人阅读追踪网页应用 MVP：搜索添加书目、书架管理、阅读计时、可视化统计。

## 功能

- **统计（首页）**：90 天每日阅读时长日历热力图（低饱和蓝色五档梯度）、想读/在读/读完计数、类别分布图、累计总时长、连续阅读 streak、近 4 周柱状图、单书投入 Top 5、平均每 session 时长、最近阅读流水
- **书架**：想读 / 在读 / 读完三状态管理，架内搜索，在读进度条，书籍详情（状态切换、页码步进、开始计时、手动补录、编辑、删除可选择保留记录）
- **添加书籍**：Google Books API 搜索（防抖 + 中文优先），防重复检测，支持手动补录（封面实时预览）
- **计时器**：全局浮动计时胶囊，开始 / 暂停 / 继续 / 结束，结束时可记录读到页码，支持手动补录历史时长

## 技术栈

React 19 + TypeScript + Vite 7 + Tailwind CSS 3.4 + shadcn/ui，动画 Framer Motion，图表 Recharts + 自绘热力图，数据持久化于浏览器 localStorage（key: `reading-log-v1`）。

## 本地运行

```bash
npm install            # 生成 package-lock.json 并安装依赖
bash scripts/decode-assets.sh   # 将 assets-src/*.b64 还原为 public/*.png
npm run dev
npm run build
```

> 说明：本仓库通过 GitHub API 推送，图片资源（5 张 PNG 插画）以 base64 文本形式存于 `assets-src/`，克隆后需先运行 `scripts/decode-assets.sh` 还原；`package-lock.json` 未包含在仓库中，执行 `npm install` 会自动生成。

## 设计规范

- 背景米白 `#F5F0E6`，主色深蓝 `#0A2A5C`，点缀暖铜 `#A09070`
- Anthropic 风格极简编辑插画：平面色块、1.5px 细描边、大留白、低饱和配色
- 热力图梯度：`#EDE8DC → #C7D3E4 → #93ABCB → #5E7FAE → #0A2A5C`
- 移动端优先响应式，底部 Tab 导航
