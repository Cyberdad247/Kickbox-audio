#!/usr/bin/env node
// sync-memory-md.mjs — CI gate for the memory.md dual-copy.
//
// The project-root `audit-kickbox-audio/memory.md` is the doc-as-source; the
// Next.js-served mirror is `apps/pwa/public/memory.md` (so that
// `<LearnWithMe />` can `fetch('/memory.md')` at runtime). This script fails
// hard if the two diverge; run with `--fix` to copy root → public.
//
// Usage:
//   node scripts/sync-memory-md.mjs        # CI gate: exit 1 on drift
//   node scripts/sync-memory-md.mjs --fix  # repair: copy root → public
//
// Exit codes:
//   0  files identical (or `--fix` reconciled them)
//   1  drift detected, not repaired
//   2  one or both target files do not exist

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const sourcePath = resolve(root, 'memory.md');
const mirrorPath = resolve(root, 'apps/pwa/public/memory.md');

if (!existsSync(sourcePath) || !existsSync(mirrorPath)) {
  console.error('[sync-memory-md] missing target file(s):');
  console.error(`  source (root): ${sourcePath} (${existsSync(sourcePath) ? 'EXISTS' : 'MISSING'})`);
  console.error(`  mirror (public): ${mirrorPath} (${existsSync(mirrorPath) ? 'EXISTS' : 'MISSING'})`);
  process.exit(2);
}

const sourceBytes = readFileSync(sourcePath, 'utf8');
const mirrorBytes = readFileSync(mirrorPath, 'utf8');

if (sourceBytes === mirrorBytes) {
  console.log('[sync-memory-md] IDENTICAL: root memory.md == apps/pwa/public/memory.md');
  process.exit(0);
}

console.error('[sync-memory-md] DIVERGENCE detected.');
console.error(`  source (root): ${sourceBytes.length} bytes`);
console.error(`  mirror (public): ${mirrorBytes.length} bytes`);
console.error('Run `node scripts/sync-memory-md.mjs --fix` to copy root → public.');

if (process.argv.includes('--fix')) {
  writeFileSync(mirrorPath, sourceBytes, 'utf8');
  console.log('[sync-memory-md] reconciled (root → public).');
  process.exit(0);
}

process.exit(1);
