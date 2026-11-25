import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Load Playwright from the local skill directory, global Node resolution,
 * or a sibling corporate-profile-design installation under the user's home directory.
 */
export async function loadPlaywright(skillRoot) {
  const candidates = [
    () => import('playwright'),
    () => import(pathToFileURL(path.resolve(skillRoot, 'node_modules/playwright/index.mjs')).href),
    () => import(pathToFileURL(path.resolve(skillRoot, '../corporate-profile-design/node_modules/playwright/index.mjs')).href),
    () => import(pathToFileURL(path.join(os.homedir(), '.agents/skills/corporate-profile-design/node_modules/playwright/index.mjs')).href)
  ];
  for (const loader of candidates) {
    try {
      return await loader();
    } catch {}
  }
  return null;
}
