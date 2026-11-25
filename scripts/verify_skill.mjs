#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadPlaywright } from './lib/load_playwright.mjs';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const required = [
  'SKILL.md',
  'package.json',
  'references/catalog.json',
  'references/style-systems.md',
  'references/motion-and-gsap.md',
  'references/svg-and-editing.md',
  'references/review-and-acceptance.md',
  'assets/editor-runtime.js',
  'assets/starter-long.html',
  'assets/starter-deck.html',
  'scripts/lib/load_playwright.mjs',
  'scripts/lint_html.mjs',
  'scripts/inspect_render.mjs',
  'scripts/export_pdf.mjs'
];

const missing = [];
for (const rel of required) {
  try { await fs.access(path.join(root, rel)); } catch { missing.push(rel); }
}

const skillMd = await fs.readFile(path.join(root, 'SKILL.md'), 'utf8');
const fm = /^---\n([\s\S]*?)\n---/.exec(skillMd)?.[1] ?? '';

let catalogValid = false;
try {
  const cat = JSON.parse(await fs.readFile(path.join(root, 'references/catalog.json'), 'utf8'));
  catalogValid = Array.isArray(cat.modes) && Array.isArray(cat.styles) && cat.styles.length >= 5;
} catch {}

const playwrightReady = Boolean(await loadPlaywright(root));

const checks = {
  node: process.versions.node,
  required_files: missing.length === 0,
  frontmatter_name: /(^|\n)name:\s*html-studio\s*$/m.test(fm),
  frontmatter_description: /(^|\n)description:\s*\S/.test(fm),
  catalog_valid: catalogValid,
  playwright_ready: playwrightReady
};

console.log(JSON.stringify({ root, checks, missing }, null, 2));
if (missing.length || !checks.frontmatter_name || !checks.frontmatter_description || !checks.catalog_valid) {
  process.exitCode = 1;
}
