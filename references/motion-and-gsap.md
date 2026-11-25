# Motion, Style Brief & GSAP Guidelines

本文件统一规范三种模式下的动态表现：**阅读型网页要克制，演示翻页要清晰，宣传片模式要连续。**

## 1. Style Brief（开工前必写）

动手写 HTML 前，先向用户给出（或内部锁定）2–3 个候选方向并记录一份简短 Style Brief：
- **业务对象与受众**：公司属于什么行业，这份 HTML 发给谁看（客户/投资人/展会/内部）？
- **视觉基调与色板来源**：4–6 个命名 HEX 色值，说明为什么契合该公司（来自企业 Logo/行业材质，而非通用默认色）。
- **核心排版与版式草图**：左右不对称 / 编辑长卷 / 网格画册 / 16:9 舞台，明确对齐方式。
- **一个高光时刻（One Signature Moment）**：全页最有记忆点的设计是什么？（其余区域保持干净克制）。
- **要拒绝的模板套路**：明确点出本案放弃的 AI 默认写法。

> 自我反问：**“如果把公司名称换成另一家完全不同行业的企业，这套视觉还能直接套用吗？”** 如果答案是“可以”，立刻修改方案直到贴合目标企业特征。

## 2. 长网页模式（`long-profile`）：GSAP + 克制滚动叙事

吸收 `gsap-skills` 与 `kubai 011/019` 实战规则：
1. **反泛滥动画**：禁止给每个 `<section>` 都套相同的 `fade-up` 淡入上滑，禁止给每张卡片加浮夸 hover 跳动。只在**首屏入场**或**关键数据/时间线/能力展示区**做有叙事意义的动效。
2. **合成层性能优先**：动画只操作 `transform`（`x`/`y`/`scale`/`rotation`）和 `opacity`/`autoAlpha`，不动画 `width`/`height`/`top`/`left`。
3. **专业缓动曲线**：入场退场优先使用明确阻尼曲线（如 `cubic-bezier(0.22, 1, 0.36, 1)` 或 GSAP `power3.out`），避免机械的线性或默认 `ease`。
4. **滚动卡片交互**：业务矩阵/案例展示可根据叙事需要采用轻量水平错落、聚焦高亮或阶梯揭晓，保持文字随时可读。
5. **⚠️ 导出 PDF 与离线/降级铁律（必加！）**：
   - 若使用了 GSAP ScrollTrigger 把未滚入视口的区块初始设为 `opacity: 0`，**必须同时写入**：
     1. `@media print` 下强制所有区块 `opacity: 1 !important; transform: none !important; visibility: visible !important;`；
     2. `@media (prefers-reduced-motion: reduce)` 下直接显示静态成稿；
     3. 若页面运行在完全离线环境且未内联 GSAP，所有内容默认可见（渐进增强：只在脚本确认执行时才注册初始隐藏态，避免 JS 未加载导致整页白屏！）。

```js
// 推荐的渐进增强写法：JS 成功执行且非打印/减弱动效模式时才增强
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduceMotion && window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  // 使用 gsap.fromTo 或只动已明确标记 [data-reveal] 的少数关键元素
}
```

## 3. 16:9 画册模式（`deck`）：稳定与单页焦点

- 每页聚焦 **1 个核心结论**，最多 2 层视觉层级。
- 切换采用干脆的横移或淡切（250ms–350ms），不堆叠花哨 3D 翻转干扰客户阅读。
- 支持键盘 `ArrowLeft` / `ArrowRight` / `PageUp` / `PageDown` / `Home` / `End` 与底部指示器跳转。

## 4. 宣传片模式（`motion-opener`）：吸收 `bang-motion` 反 PPT 规则

当用户明确需要**公司宣传片、展厅大屏循环片头、品牌快闪视频 HTML**时切换此模式：
- **单一连续世界**：背景始终有轻微呼吸或流动，不出现每页硬切回静态白板的“PPT 感”。
- **镜头语言与衔接**：通过缩放推进（push-through）、锚点元素延续（persistent subject）串联信息，而非标题+列表+淡入淡出。
- **字号底线**：在 `1920×1080` 或 `1080×1920` 舞台上，主要展示文字足够大且停留时长够人眼读完。
- **调试能力**：支持 `?debug=1` 显示时间轴进度条与暂停/重播控制，便于确认关键秒数画面。
