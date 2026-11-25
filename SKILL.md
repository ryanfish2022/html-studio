---
name: html-studio
description: Produce bespoke, offline-ready Chinese or bilingual HTML deliverables across any topic (company introductions, product showcases, topic reports, event promos, portfolios, pitch decks) in three modes: long scrolling webpage (long-profile), 16:9 presentation deck (deck), or continuous motion opener (motion-opener). Combines intentional editorial/brand design, anti-AI-slop review, Chinese typography hierarchy, inline editable SVG charts with in-browser editing and export, restrained GSAP ScrollTrigger motion, automated Playwright overflow/screenshot checks, and PDF export. Use when asked to create or redesign a standalone HTML page, showcase webpage, 16:9 presentation deck HTML, or motion opener.
---

# HTML Studio

以真实业务、主题内容与品牌/视觉气质为核心，交付**可直接离线打开、支持浏览器原位改字调色、且经过自动化溢出校验与真实截图终审**的高定 HTML 作品（适用于公司介绍、产品发布、专题报告、活动宣传、作品集与路演画册等各类主题）。

## 1. 模式路由（开工先定形式）

按用户需求选择一种主模式（如未指定，默认 `long-profile` 并在 Brief 阶段确认）：

| 模式 | 适用场景 | 基准骨架 | 动态策略 |
|---|---|---|---|
| `long-profile` | 专题长网页、公司/产品介绍页、微信/移动端转发落地页 | `assets/starter-long.html` | 克制首屏 + 可选 GSAP ScrollTrigger 叙事 |
| `deck` | 16:9 客户宣讲、主题汇报、路演 BP、需逐页导出的横屏画册 | `assets/starter-deck.html` | 单页一焦点 + 干脆切页 + 严格防溢出 |
| `motion-opener` | 展厅大屏、主题宣传片、自动播放循环片头 | 连续舞台结构 | 连续时间轴镜头语言（参见 `references/motion-and-gsap.md`） |

## 2. 按需加载参考文档（不提前堆砌上下文）

- 选风格与行业配对：先读 `references/catalog.json` 索引，再读 `references/style-systems.md`
- 写 Style Brief 与动效 / GSAP / 宣传片：读 `references/motion-and-gsap.md`
- 画 SVG 数据图表与配置原位编辑：读 `references/svg-and-editing.md`
- 执行脚本质检、视觉终审与导出 PDF：读 `references/review-and-acceptance.md`

## 3. 六步标准生产流水线

### Step 1 — 信息取证与边界确认
收集或确认：主题与主体名称（企业、产品、项目或专题）、所属领域、核心受众、核心内容/主推卖点、真实数据或时间节点、语言需求（纯中文 / 中英双语）、可用实拍图/Logo/视觉素材、交付模式。
- **事实底线**：严禁编造真实数据与案例；若必须用占位数字演示版式，**必须在画面图注或脚注明确标出“演示数据”**。

### Step 2 — Style Brief 与双轮设计计划（去 AI 模板化）
读取 `references/catalog.json` 与 `references/style-systems.md`，向用户提出 **2–3 个差异化视觉方案**（如用户已明确指定或授权直接开工，记录所选方向后推进）：
1. 列出 `4–6` 个命名 HEX 色值（来自既有 VI、主题气质或行业材质，定义于 `:root` 语义变量）。
2. 说明中英文字体分工与版面结构（对齐方式、首屏信息重心）。
3. 定义**唯一的核心高光时刻（One Signature Moment）**，其余板块保持克制与呼吸感。
4. **自我反问检查**：对照 `references/style-systems.md` 的 **AI Tells 清单**（SaaS 均等圆角套盒、高频 `A · B · C` 眉标、非流程硬加 `01/02/03`、全区块同款淡入上滑、按钮末尾统一带 `→`）。若换一个完全不同的主题或对象也能原样套用，立刻修改设计计划再写代码。

### Step 3 — 内容架构与矢量可视化
- 围绕受众阅读与决策顺序组织信息：核心价值主张 → 可信数据/依据 → 主体内容与方案细节 → 发展脉络/案例佐证 → 明确行动入口或联系信息。
- 关键指标、发展时间线、系统架构与对比图**优先使用原生内联 `<svg>`**（禁止粗糙占位框或模糊位图），遵守 `references/svg-and-editing.md` 打标规则。
- 实拍照片必须确认来源与授权；离线单文件交付时优先内联 CSS/JS，避免关键布局依赖外网 CDN。

### Step 4 — 动效与浏览器原位编辑接入
- 若接入动效，严格遵守 `references/motion-and-gsap.md`：
  - 仅动画 `transform` 与 `opacity/autoAlpha`；
  - **强制写入 `@media print` 与 `prefers-reduced-motion` 全显规则**，确保打印或离线打开绝不出现空白区块。
- 在需要交付给业务/客户自助微调的 `long-profile` / `deck` 成品中，**直接将 `assets/editor-runtime.js` 内联到页面底部 `<script>`**（独立成品不要留外部相对路径引用），让用户在浏览器里点击 `编辑内容` 即可原位改字、换图形色并导出新版 HTML / SVG。

### Step 5 — 自动化门禁校验（必跑）
生成 HTML 后依次执行静态检查与无头浏览器渲染检查（位于本 skill 目录）：

```bash
node scripts/lint_html.mjs <output.html> --strict
node scripts/inspect_render.mjs <output.html> --out-dir <qa-dir>
```

检查未通过（存在未替换占位符、缺少打印显影兜底、横向溢出、Deck 单页溢出 `1080px`、页脚重叠、断图或控制台报错）时，**必须修复至全部通过**。

### Step 6 — 视觉截图终审（`alive` Gate）与交付
用图像读取工具亲自查看 Step 5 生成的 PNG 截图（桌面端 + 移动端或各页 Deck），对照 `references/review-and-acceptance.md` 做 `alive / templated / flat` 终审：
- 确认文字无遮挡、中英文混排舒适、对比度清晰、具备行业专属质感（`alive`）。
- 如用户需要 PDF，执行 `node scripts/export_pdf.mjs <output.html> <output.pdf>` 并确认 PDF 生成成功。
- 最终交付报告必须如实写明：输出文件绝对路径、模式与视觉方向、实际跑过的校验命令与结果、以及浏览器原位编辑使用提示。
