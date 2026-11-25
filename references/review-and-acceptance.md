# Engineering Lint, Visual Design Review & PDF Export

代码写完**不等于完成**。必须依次通过 **脚本静态检查 → 无头浏览器渲染与截图 → 视觉终审（`alive` 判定）** 三道门禁，才能交付用户。

## 1. 静态门禁（`scripts/lint_html.mjs`）

```bash
node scripts/lint_html.mjs path/to/output.html
```

自动检查以下硬性指标：
- HTML 结构完整性（`<title>`、`lang`、`<main>` 或 Deck 舞台容器、视口 meta）；
- Semantic Design Tokens 是否存在（`:root` CSS 变量）；
- `@media print` 与 `@page` 是否配置；
- 若存在隐藏入场类或 GSAP ScrollTrigger，是否在 `@media print` 中写了 `opacity: 1` 兜底；
- 离线交付检查：是否意外引入了未声明的外部 CDN 脚本/外链资源；
- 常见 AI Tell 扫描提醒（如高频 ` · ` 拼接眉标、滥用硬编号等，提示复核）。

## 2. 浏览器实测与截图（`scripts/inspect_render.mjs`）

```bash
node scripts/inspect_render.mjs path/to/output.html --out-dir ./artifacts/qa
```

该脚本自动启动本地临时 HTTP 服务并用 Playwright Chromium 打开页面检查：
- **桌面端 (`1440×900`)** 与 **移动端 (`390×844`)** 是否存在横向溢出（`scrollWidth <= innerWidth + 1`）；
- **`deck` 模式**：逐页切换全部幻灯片，检测每页内容是否超出 `1080px` 舞台高度、页脚是否错位或被裁切；
- 控制台 `console.error` / 未捕获异常与图片资源 `naturalWidth === 0` 断图检测；
- 自动保存全页与关键视口截图 PNG 到输出目录，供视觉终审。

## 3. 视觉终审评分（`design-review` Gate）

用图像查看工具读取上一步生成的 PNG 截图，逐项对照最初的 Style Brief 做主观设计总监评审：

| 评级 | 判定标准 | 处理动作 |
| :--- | :--- | :--- |
| **`alive`（通过）** | 版式与企业行业高度贴合，有清晰记忆点，排版呼吸舒适，无遮挡错位与 AI 模板味 | 允许交付 & 导出 PDF |
| **`templated`（返工）** | 排版虽然没坏，但换家公司名字也能套用，卡片套盒多、缺少品牌辨识度 | 调整主视觉/版式节奏后重验 |
| **`flat`（打回）** | 留白塌陷、文字对比度低、图标/图表贴边裁切、存在明显溢出或重叠 | 立即修复结构与样式问题 |

## 4. 离线 PDF 导出（`scripts/export_pdf.mjs`）

```bash
node scripts/export_pdf.mjs path/to/output.html path/to/output.pdf
```

- 自动识别页面是否为 `deck`（按每页 16:9 页面打印）或 `long-profile`（按 A4 横向 / 设定打印规则排版）；
- 打印前自动注入打印安全样式，确保所有动效区块完全显影、隐藏编辑浮条、开启 `printBackground: true`。
- **只有亲手跑完导出脚本并确认 PDF 文件生成后，才能向用户报告 PDF 已生成。**
