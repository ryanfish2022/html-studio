#!/usr/bin/env node
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { loadPlaywright } from './lib/load_playwright.mjs';

const input = process.argv[2];
if (!input) {
  console.error('Usage: node scripts/inspect_render.mjs <path-to-html> [--out-dir <dir>]');
  process.exit(2);
}

const outIdx = process.argv.indexOf('--out-dir');
const htmlPath = path.resolve(input);
const outDir = path.resolve(outIdx >= 0 && process.argv[outIdx + 1] ? process.argv[outIdx + 1] : path.join(path.dirname(htmlPath), 'qa-inspect'));
const skillRoot = path.resolve(new URL('..', import.meta.url).pathname);

const playwright = await loadPlaywright(skillRoot);
if (!playwright) {
  console.error('Playwright is unavailable. Install playwright or check node_modules.');
  process.exit(1);
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp'
};

const baseDir = path.dirname(htmlPath);
const server = http.createServer(async (req, res) => {
  const cleanUrl = (req.url || '/').split('?')[0];
  const rel = cleanUrl === '/' ? path.basename(htmlPath) : decodeURIComponent(cleanUrl.replace(/^\/+/, ''));
  const tryPaths = [
    path.resolve(baseDir, rel),
    path.resolve(skillRoot, rel.replace(/^(\.\.\/)+/, ''))
  ];
  for (const candidate of tryPaths) {
    try {
      const data = await fs.readFile(candidate);
      const ext = path.extname(candidate).toLowerCase();
      res.writeHead(200, { 'content-type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(data);
      return;
    } catch {}
  }
  res.writeHead(404);
  res.end('Not found');
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}/`;

await fs.mkdir(outDir, { recursive: true });
const browser = await playwright.chromium.launch({ headless: true });

const report = {
  input: htmlPath,
  outDir,
  mode: 'long-profile',
  consoleErrors: [],
  brokenImages: [],
  viewports: [],
  slides: [],
  screenshots: [],
  passed: true
};

try {
  const page = await browser.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') report.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    report.consoleErrors.push(String(err));
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  const meta = await page.evaluate(() => ({
    mode: document.documentElement.dataset.mode || document.body.dataset.layout || 'long-profile',
    slideCount: document.querySelectorAll('.slide').length,
    hasEditable: Boolean(document.querySelector('[data-editable-html], [data-editable-text], [data-editable-shape]')),
    hasToolbar: Boolean(document.getElementById('chs-editor-toolbar'))
  }));

  report.mode = meta.slideCount > 0 || meta.mode === 'deck' ? 'deck' : 'long-profile';

  const imgs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img')).map((img) => ({
      src: img.getAttribute('src'),
      complete: img.complete,
      naturalWidth: img.naturalWidth
    }))
  );
  report.brokenImages = imgs.filter((i) => !i.complete || i.naturalWidth === 0);

  if (report.mode === 'deck') {
    for (let i = 0; i < meta.slideCount; i++) {
      await page.evaluate((idx) => {
        if (typeof window.__CHS_GO_TO_SLIDE__ === 'function') window.__CHS_GO_TO_SLIDE__(idx);
      }, i);
      await page.waitForTimeout(80);
      const slideCheck = await page.evaluate((idx) => {
        const slide = document.querySelectorAll('.slide')[idx];
        const footer = slide?.querySelector('.slide-footer');
        const body = slide?.querySelector('.slide-body');
        const stage = document.getElementById('deck-stage');
        const stageRect = stage ? stage.getBoundingClientRect() : null;
        const stageScale = stageRect ? stageRect.width / 1920 : 1;
        const stageFitsViewport = stageRect
          ? stageRect.left >= -1 && stageRect.top >= -1 && stageRect.right <= window.innerWidth + 1 && stageRect.bottom <= window.innerHeight + 1
          : true;
        const footerTopUnscaled = footer && stageRect
          ? (footer.getBoundingClientRect().top - stageRect.top) / stageScale
          : null;
        return {
          index: idx + 1,
          scrollHeight: slide ? slide.scrollHeight : 0,
          clientHeight: slide ? slide.clientHeight : 0,
          noVerticalOverflow: slide ? slide.scrollHeight <= 1082 : true,
          stageFitsViewport,
          bodyOverlapsFooter: body && footer
            ? body.getBoundingClientRect().bottom > footer.getBoundingClientRect().top + 2
            : false,
          footerTopUnscaled: footerTopUnscaled !== null ? Math.round(footerTopUnscaled) : null
        };
      }, i);
      report.slides.push(slideCheck);
      const shot = path.join(outDir, `slide-${String(i + 1).padStart(2, '0')}.png`);
      await page.screenshot({ path: shot });
      report.screenshots.push(shot);
    }
  } else {
    for (const vp of [
      { name: 'desktop', width: 1440, height: 900, fullPage: true },
      { name: 'mobile', width: 390, height: 844, fullPage: true }
    ]) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(100);
      const vpCheck = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
        smallTextCount: Array.from(document.querySelectorAll('p, li, span, a')).filter((el) => {
          const cs = getComputedStyle(el);
          return cs.display !== 'none' && cs.visibility !== 'hidden' && el.textContent.trim().length > 0 && parseFloat(cs.fontSize) < 12;
        }).length
      }));
      report.viewports.push({ name: vp.name, width: vp.width, height: vp.height, checks: vpCheck });
      const shot = path.join(outDir, `${vp.name}.png`);
      await page.screenshot({ path: shot, fullPage: true });
      report.screenshots.push(shot);
    }
  }

  report.editorToolbarActive = !meta.hasEditable || meta.hasToolbar;
  report.passed =
    report.consoleErrors.length === 0 &&
    report.brokenImages.length === 0 &&
    report.editorToolbarActive &&
    report.viewports.every((v) => v.checks.noHorizontalOverflow) &&
    report.slides.every((s) => s.noVerticalOverflow && s.stageFitsViewport && !s.bodyOverlapsFooter);

  const reportPath = path.join(outDir, 'inspect-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
