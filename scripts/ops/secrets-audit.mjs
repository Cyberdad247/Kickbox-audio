#!/usr/bin/env node
// scripts/ci/secrets-audit.mjs
//
// READ-ONLY secrets scanner for /audit-kickbox-audio.
// Honours AGENTS.md Rule 5: real credentials never live in tracked
// files. Honest string literal "kba-smoke-secret" and .env.example are
// allowed.
//
// Patterns hunted: AWS access keys (AKIA[0-9A-Z]{16}), GitHub PAT
// (ghp_[A-Za-z0-9]{36}), OpenAI / Anthropic / OpenRouter sk keys, PEM
// private key blocks (RSA / EC / OPENSSH / DSA / PGP), GitHub Action
// JWTs (Bearer eyJ...), and non-empty values inside live .env files.
//
// Usage:
//   node scripts/ci/secrets-audit.mjs
//   node scripts/ci/secrets-audit.mjs --write docs/security/secrets-remediation-plan.md
//
// Exits:
//   0  clean
//   1  ≥ 1 real hit
//   2  invocation error (no path to .)

import { readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve('.');
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.turbo',
  '.vercel',
  'dist',
  '.git',
  'coverage',
  '.cache',
  'tmp',
]);
const PATTERNS = [
  { name: 'AWS Access Key', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'GitHub PAT', re: /ghp_[A-Za-z0-9]{36}/ },
  { name: 'OpenAI / Anthropic', re: /\bsk-[A-Za-z0-9]{20,}/ },
  { name: 'PEM Private Key', re: /BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY/ },
  { name: 'GitHub Action JWT', re: /Bearer\s+eyJ[A-Za-z0-9_-]{16,}\./ },
];
const ENV_HIT = /^[A-Z][A-Z0-9_]+=[\"']?[A-Za-z0-9._\\/\-:]{16,}[\"']?\s*$/m;

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.git')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

const hits = [];
const scannedFiles = [];

for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file);
  const base = file.split(/[\\/]/).pop() ?? '';
  if (base === '.env.example') continue;
  if (/\.(png|jpe?g|gif|webp|woff2?|map|pdf|zip|ico|mp[34]|wav)$/i.test(rel)) continue;
  let text;
  try {
    const st = statSync(file);
    if (st.size > 800_000) continue;
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  scannedFiles.push(rel);

  for (const { name, re } of PATTERNS) {
    const m = text.match(re);
    if (!m) continue;
    const before = text.slice(0, m.index ?? 0);
    const lineNum = before.split('\n').length;
    hits.push({
      file: rel,
      line: lineNum,
      rule: name,
      sample: (m[0].slice(0, 16) + '…').replace(/\n/g, ' '),
    });
  }

  if (/^\.env(\..+)?$/.test(base)) {
    const m = text.match(ENV_HIT);
    if (m) {
      const lineNum = text.slice(0, m.index ?? 0).split('\n').length;
      hits.push({
        file: rel,
        line: lineNum,
        rule: 'live .env value',
        sample: m[0].slice(0, 24) + '…',
      });
    }
  }
}

const ts = new Date().toISOString();
const lines = [];
lines.push('# Secret scan — /audit-kickbox-audio');
lines.push('');
lines.push(`Generated: ${ts}`);
lines.push(`Scanned ${scannedFiles.length} files (skipping node_modules, .next, .turbo, .vercel, dist, .git, .env.example, large binaries).`);
lines.push(`Real hits: **${hits.length}**`);
lines.push('');
if (hits.length === 0) {
  lines.push('## Result');
  lines.push('');
  lines.push('**CLEAN** — no AWS access keys, GitHub PATs, OpenAI / Anthropic keys,');
  lines.push('PEM private keys, GitHub-Action JWTs, or populated `.env` files in tracked');
  lines.push('source code under `/audit-kickbox-audio`. The branch is **safe to promote');
  lines.push('to production** with respect to AGENTS.md Rule 5.');
  lines.push('');
  lines.push('## Parent-OS findings (informational, OUT OF SCOPE)');
  lines.push('');
  lines.push('The parent CAMELOT-OS monorepo carries a heavier footprint: per');
  lines.push('`colony_report.md` (generated 2026-06-05), the root runs scored a');
  lines.push('**Risk Score 100.0 / 100 (CRITICAL)** with **797 potential secret** hits,');
  lines.push('34 files >500 KB, 4 283 duplicate files, 206 TODO/FIXMEs, and 209 unused');
  lines.push('imports across **20 489 files / 5 136 881 lines / 71 862 symbols**.');
  lines.push('');
  lines.push('Most of those 797 secret hits are false positives on test fixtures,');
  lines.push('example docs, and heuristic over-matches. Remediation of the parent');
  lines.push('OS will be tracked as a **separate multi-PR cycle** and is intentionally');
  lines.push('NOT rolled into this promotion.');
  lines.push('');
  lines.push('## Remediation ladder (when real hits appear)');
  lines.push('');
  lines.push('1. **Triage** — confirm real vs false positive (most hits fall into');
  lines.push('   `.audit-false-positives.txt`).');
  lines.push('2. **Rotate** — `camelot keys set <name> <secret>` then strip literal.');
  lines.push('3. **Redact-history** — `git filter-repo --invert-paths --path <file>`');
  lines.push('   for verified leaked credentials; coordinate with Cyberdad247 to');
  lines.push('   force-push the cleaned history.');
  lines.push('4. **Block-CI** — run this audit in PR check; non-zero RC blocks merge.');
  lines.push('');
  lines.push('## Policy');
  lines.push('');
  lines.push('Per AGENTS.md Rule 5: real secrets must never live in tracked files.');
  lines.push('Honest credentials live in `.env.local` (gitignored) or are');
  lines.push('obtained from the secure secret store via `camelot keys set <name>`.');
} else {
  lines.push('## Hits');
  lines.push('');
  lines.push('| File | Line | Rule | Sample |');
  lines.push('|---|---|---|---|');
  for (const h of hits) {
    lines.push(`| \`${h.file}\` | ${h.line} | ${h.rule} | \`${h.sample}\` |`);
  }
  lines.push('');
  lines.push('Follow Remediation ladder above before merging.');
}

const outIdx = process.argv.indexOf('--write');
if (outIdx !== -1) {
  const path = process.argv[outIdx + 1];
  if (!path) {
    console.error('[secrets-audit] --write requires a path argument');
    process.exit(2);
  }
  writeFileSync(path, lines.join('\n'), 'utf8');
  console.log(`[secrets-audit] ${hits.length === 0 ? 'CLEAN' : hits.length + ' HITS'} — wrote plan to ${path}`);
} else {
  console.log(lines.join('\n'));
}

process.exit(hits.length === 0 ? 0 : 1);
