#!/usr/bin/env bun

/**
 * Session Start Hook for Claude Code
 * Runs when a new Claude session starts
 */

import * as fs from 'fs';
import * as path from 'path';

const HOME = process.env.HOME!;
const PATCH_MARKER = '<!-- knowledge-lookup-patch-v1 -->';
const STEP0_FILE = path.join(HOME, '.claude', 'code-reviewer-step0.md');
const INJECT_BEFORE = '## What Was Implemented';

/**
 * Surgical patcher: injects Step 0 (knowledge lookup) into the active
 * superpowers code-reviewer.md template. Runs every session so plugin
 * version updates don't silently drop our additions.
 */
function patchCodeReviewer(): void {
  const pluginBase = path.join(HOME, '.claude', 'plugins', 'cache', 'superpowers-marketplace', 'superpowers');

  if (!fs.existsSync(pluginBase) || !fs.existsSync(STEP0_FILE)) return;

  const versions = fs.readdirSync(pluginBase).filter(v => /^\d+\.\d+\.\d+$/.test(v)).sort();
  if (versions.length === 0) return;

  const latestVersion = versions[versions.length - 1];
  const targetFile = path.join(pluginBase, latestVersion, 'skills', 'requesting-code-review', 'code-reviewer.md');

  if (!fs.existsSync(targetFile)) return;

  const current = fs.readFileSync(targetFile, 'utf-8');

  // Idempotent: skip if already patched this version
  if (current.includes(PATCH_MARKER)) return;

  const step0Content = fs.readFileSync(STEP0_FILE, 'utf-8');
  const injectionPoint = current.indexOf(INJECT_BEFORE);

  if (injectionPoint === -1) {
    console.log(`⚠️  code-reviewer patch: injection point "${INJECT_BEFORE}" not found in v${latestVersion} — skipping`);
    return;
  }

  const patched =
    current.slice(0, injectionPoint)
    + PATCH_MARKER + '\n'
    + step0Content + '\n'
    + current.slice(injectionPoint);

  fs.writeFileSync(targetFile, patched);
  console.log(`✅ Patched superpowers code-reviewer.md (v${latestVersion}) with knowledge-lookup Step 0`);
}

async function main() {
  try {
    // Read any input from stdin (session start hooks typically don't have input)
    await new Promise<string>((resolve) => {
      let data = '';
      process.stdin.on('data', (chunk) => data += chunk);
      process.stdin.on('end', () => resolve(data));
      setTimeout(() => resolve(data), 100);
    });

    console.log(`🚀 Claude session started at ${new Date().toISOString()}`);

    // Ensure superpowers code-reviewer always has the knowledge-lookup Step 0
    patchCodeReviewer();

    process.exit(0);
  } catch (error) {
    console.error('Session start hook error:', error);
    process.exit(0); // Exit gracefully — never block Claude
  }
}

main();
