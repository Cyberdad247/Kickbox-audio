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
//   3  --fix refused (CI=true or --reverse-mirror also drifting)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

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

// Print a first-diff summary (first line where source != mirror).
const sourceLines = sourceBytes.split('\n');
const mirrorLines = mirrorBytes.split('\n');
const maxLen = Math.max(sourceLines.length, mirrorLines.length);
let firstDiffLine = null;
for (let i = 0; i < maxLen; i++) {
  if (sourceLines[i] !== mirrorLines[i]) {
    firstDiffLine = i + 1;
    break;
  }
}
if (firstDiffLine != null) {
  console.error(`  first-differing-line: ${firstDiffLine}`);
  console.error(`    source:  ${JSON.stringify(sourceLines[firstDiffLine - 1] ?? '')}`);
  console.error(`    mirror:  ${JSON.stringify(mirrorLines[firstDiffLine - 1] ?? '')}`);
}

const wantsFix = process.argv.includes('--fix');
const isCI = process.env.CI === 'true' || process.env.CI === '1';

if (wantsFix && isCI) {
  console.error('[sync-memory-md] REFUSING --fix: detected CI=true; reconcile manually and re-run.');
  process.exit(3);
}

if (!wantsFix) {
  console.error('Run `node scripts/sync-memory-md.mjs --fix` to copy root → public.');
  process.exit(1);
}

// --fix path: explicit reconcile + show after-diff line count.
writeFileSync(mirrorPath, sourceBytes, 'utf8');
console.log(`[sync-memory-md] reconciled (root → public). ${sourceBytes.length} bytes written.`);

// After-fix sanity: re-read mirror and confirm equality.
const verifyBytes = readFileSync(mirrorPath, 'utf8');
const proc = spawnSync('node', [resolve(__dirname, 'sync-memory-md.mjs')], {
  stdio: 'inherit',
});
process.exit(proc.status ?? 0);
