#!/usr/bin/env node
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { loadPlaywright } from './lib/load_playwright.mjs';

const input = process.argv[2];
if (!input) {
  console.error('Usage: node scripts/export_pdf.mjs <path-to-html> [output.pdf]');
  process.exit(2);
}

const htmlPath = path.resolve(input);
const outPath = path.resolve(process.argv[3] || htmlPath.replace(/\.html?$/i, '.pdf'));
const skillRoot = path.resolve(new URL('..', import.meta.url).pathname);

const playwright = await loadPlaywright(skillRoot);
if (!playwright) {
  console.error('Playwright is unavailable for PDF export.');
  process.exit(1);
}

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
      const ct = ext === '.html' ? 'text/html; charset=utf-8' : ext === '.js' ? 'text/javascript; charset=utf-8' : 'application/octet-stream';
      res.writeHead(200, { 'content-type': ct });
      res.end(data);
      return;
    } catch {}
  }
  res.writeHead(404);
  res.end('Not found');
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const browser = await playwright.chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({
    content: `
      [data-reveal], section, .slide { opacity: 1 !important; visibility: visible !important; }
      #chs-editor-toolbar, .chs-svg-editor-overlay { display: none !important; }
    `
  });
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await page.pdf({
    path: outPath,
    preferCSSPageSize: true,
    printBackground: true
  });
  console.log(JSON.stringify({ exported: outPath, ok: true }, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
