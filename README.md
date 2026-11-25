# html-studio Skill

跨主题高定 HTML 制作技能包（支持长网页 `long-profile`、16:9 演示画册 `deck`、连续动态开场 `motion-opener`），内置浏览器原位改字调色、Playwright 自动化溢出/截图验收与 PDF 导出。

## 换新电脑安装方法

1. 将解压后的整个 `html-studio` 文件夹放到新电脑的全局技能目录：
   - **macOS / Linux**：`~/.agents/skills/html-studio`
   - **Windows**：`%USERPROFILE%\.agents\skills\html-studio`
2. （可选）如果需要在新电脑运行自动截图验收（`inspect_render.mjs`）和导 PDF（`export_pdf.mjs`），确保已安装 Node.js（18+），进入 `html-studio` 目录执行一次：
   ```bash
   npm install
   npx playwright install chromium
   ```
3. 运行自检确认全部通过：
   ```bash
   node scripts/verify_skill.mjs
   ```

> 仅生成 HTML、浏览器内直接编辑或运行 `node scripts/lint_html.mjs <file.html> --strict` 时，无需安装 Playwright。
