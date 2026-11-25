#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const target = process.argv[2];
if (!target) {
  console.error('Usage: node scripts/lint_html.mjs <path-to-html> [--strict]');
  process.exit(2);
}

const strict = process.argv.includes('--strict');
const filePath = path.resolve(target);
const html = await fs.readFile(filePath, 'utf8');

const checks = {
  doctype: /<!doctype\s+html>/i.test(html),
  lang_attr: /<html[^>]*\slang=["'][^"']+["']/i.test(html),
  viewport_meta: /<meta[^>]*name=["']viewport["']/i.test(html),
  title_tag: /<title>[^<]+<\/title>/i.test(html),
  main_landmark: /<main\b/i.test(html),
  design_tokens: /:root\s*\{[\s\S]*--[a-z0-9-]+:/i.test(html),
  print_css: /@media\s+print\s*\{/i.test(html) && /@page\s*\{/i.test(html),
  no_unresolved_placeholders: !/\{\{[A-Z0-9_]+\}\}/.test(html),
  no_external_cdn_scripts: !/<script[^>]*src=["']https?:\/\//i.test(html)
};

const usesMotionHide = /ScrollTrigger|data-reveal|opacity:\s*0\b/i.test(html);
if (usesMotionHide) {
  const printBlock = /@media\s+print\s*\{[\s\S]*?\}\s*(?:<\/style>|\n\s*@media)/i.exec(html)?.[0] || html;
  checks.print_visibility_guard = /opacity:\s*1\s*!important/i.test(printBlock) || !/opacity:\s*0\b/.test(html);
} else {
  checks.print_visibility_guard = true;
}

const warnings = [];
const middleDotMatches = html.match(/[^>\n]{1,20}\s·\s[^<\n]{1,20}/g) || [];
if (middleDotMatches.length > 4) {
  warnings.push(`Detected ${middleDotMatches.length} "A · B" middle-dot labels; review for AI-tell eyebrow overuse.`);
}
const arrowBtnMatches = html.match(/>[^<]{1,24}\s*→\s*<\/(?:a|button)>/g) || [];
if (arrowBtnMatches.length > 2) {
  warnings.push(`Detected ${arrowBtnMatches.length} buttons/links ending with "→"; review copy variety.`);
}
if (/href=["']#["']/.test(html)) {
  warnings.push('Found placeholder href="#" link; replace with real anchor or action.');
}

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
const report = {
  file: filePath,
  passed: failed.length === 0 && (!strict || warnings.length === 0),
  failed,
  checks,
  warnings
};

console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
