#!/usr/bin/env node
/**
 * scripts/ops/bundle-size.mjs
 *
 * v1.2.0 T3.1: bundle-size budget enforcement for the PWA.
 *
 * Walks apps/pwa/.next/static/chunks/{app,pages,shared}/* after `next build`,
 * measures each route's first-load JS total, and fails CI if any chunk
 * exceeds BUNDLE_SIZE_BUDGET_BYTES (default 153600 = 150KB, matching the
 * v1.0.0 Green Computing ceiling from CHANGELOG.md).
 *
 * Next.js 14 App Router puts per-route chunks in `.next/static/chunks/app/`.
 * Legacy Pages Router puts them in `.next/static/chunks/pages/`. This script
 * walks both, plus the shared chunks dir, to be app-router compatible
 * (the project uses App Router but we keep Pages support for future use).
 *
 * Exit codes:
 *   0 — all routes within budget
 *   1 — one or more routes exceed budget, or build output not found
 */

import { readdir, stat } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const CHUNKS_DIR = join(ROOT, 'apps', 'pwa', '.next', 'static', 'chunks');
const BUDGET_BYTES = Number(process.env.BUNDLE_SIZE_BUDGET_BYTES) || 153_600;

async function walkJsFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return results;
    throw err;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walkJsFiles(full)));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const s = await stat(full);
      results.push({ path: full.replace(ROOT + '/', ''), size: s.size });
    }
  }
  return results;
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  console.log(`[bundle-size] budget: ${formatBytes(BUNDGET_BYTES)} per chunk`);

  // Walk the entire chunks/ directory recursively (catches app/, pages/, and shared/)
  const files = await walkJsFiles(CHUNKS_DIR);
  if (files.length === 0) {
    console.error(`[bundle-size] FATAL: no .js chunks in ${CHUNKS_DIR}`);
    console.error('[bundle-size] hint: run `npm run build --workspace=@sovereign/pwa` first');
    process.exit(1);
  }

  // Group by route. For App Router chunks, the route is the parent dir under app/
  // (e.g., app/api/health/page-abc123.js → route = 'api/health'). For Pages Router,
  // the route is the parent dir under pages/ (e.g., pages/index-abc.js → route = 'index').
  // Shared chunks (no route segment) are grouped as 'shared'.
  const byRoute = new Map();
  for (const { path, size } of files) {
    const rel = path.replace(/^apps\/pwa\/.next\/static\/chunks\//, '');
    const parts = rel.split('/');
    // parts[0] is the top-level dir: 'app', 'pages', or other (shared).
    // For 'app' and 'pages', the route is the remaining path up to the last dir.
    let route;
    if (parts[0] === 'app' && parts.length >= 3) {
      // app/<route>/<chunk>.js → route = parts.slice(1, -1).join('/')
      route = parts.slice(1, -1).join('/') || 'root';
    } else if (parts[0] === 'pages' && parts.length >= 3) {
      route = parts.slice(1, -1).join('/') || 'root';
    } else if (parts[0] === 'app' || parts[0] === 'pages') {
      route = 'root';
    } else {
      route = 'shared';
    }
    if (!byRoute.has(route)) byRoute.set(route, []);
    byRoute.get(route).push({ path, size });
  }

  let failures = 0;
  console.log('[bundle-size] per-route totals:');
  for (const [route, routeFiles] of byRoute) {
    const total = routeFiles.reduce((sum, f) => sum + f.size, 0);
    const max = Math.max(...routeFiles.map((f) => f.size));
    const ok = max <= BUDGET_BYTES;
    const marker = ok ? 'PASS' : 'FAIL';
    console.log(`  [${marker}] ${route.padEnd(20)} ${formatBytes(total).padStart(10)} total, ${formatBytes(max).padStart(10)} max`);
    if (!ok) {
      failures += 1;
      for (const f of routeFiles.filter((f) => f.size > BUDGET_BYTES)) {
        console.log(`         [OVER] ${f.path} (${formatBytes(f.size)})`);
      }
    }
  }
  const grandTotal = files.reduce((sum, f) => sum + f.size, 0);
  console.log(`[bundle-size] grand total: ${formatBytes(grandTotal)} across ${files.length} chunks in ${byRoute.size} routes`);
  if (failures > 0) {
    console.error(`[bundle-size] FAIL: ${failures} route(s) exceed the ${formatBytes(BUDGET_BYTES)} per-chunk budget`);
    process.exit(1);
  }
  console.log('[bundle-size] PASS: all routes within budget');
}

main().catch((err) => {
  console.error('[bundle-size] FATAL:', err);
  process.exit(1);
});
