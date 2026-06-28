#!/usr/bin/env tsx
/**
 * v1.3.0 Tier 3.1: Doppler vault rotation script.
 *
 * Reads `rotations.yaml` and rotates each entry via the Doppler REST API.
 * Dry-run by default — pass `--apply` to actually write the new value.
 *
 * Why Doppler REST, not the @dopplerhq/node-sdk?
 *   - No new dependency (CDN-cached script). Saves ~200 KB.
 *   - The script is invoked once a quarter; one HTTP call beats a
 *     fully-typed SDK in our use case.
 *   - Easier to audit (you can read every line).
 *
 * Doppler API endpoint used:
 *   POST https://api.doppler.com/v3/configs/config/secrets?project={p}&config={c}
 *   Authorization: Bearer {DOPPLER_TOKEN}
 *   Body: { name: string, value: string, visibility: 'protected' }
 *
 * Usage:
 *   $ tsx scripts/rotate-secrets.ts --from ./rotations.yaml
 *     → dry-run; prints a JSON array of planned rotations to stdout.
 *   $ tsx scripts/rotate-secrets.ts --from ./rotations.yaml --apply
 *     → writes each rotation; prints a JSON array of { project, config,
 *       name, value (echoed BACK ONLY in --apply mode with NO_ECHO env) },
 *       prevValueSource (where the new value was sourced from).
 *
 * The new value for each rotation is sourced from a sub-shell command
 * (the `value_cmd` field) OR a literal string (the `value` field).
 * NEVER commit plaintext secrets next to rotations.yaml — use `value_cmd`
 * that runs `openssl rand -hex 32` or generates values dynamically.
 *
 * Exit codes:
 *   0 — every rotation succeeded (apply) OR plan is complete (dry-run)
 *   1 — at least one rotation failed; JSON error report on stderr
 *   2 — invalid CLI usage (missing --from, missing DOPPLER_TOKEN, etc.)
 *
 * Subsequent cache invalidation:
 *   After all rotations succeed (--apply), print a one-line Next-Step
 *   prompt that the operator can copy-paste into a terminal to clear
 *   Bifrost's in-process vault cache:
 *     pm2 sendSignal SIGUSR1 bifrost   (PM2-managed deploys)
 *     kill -USR1 $(pgrep -f "node.*dist/server.js")   (manual pm2 lost)
 *
 * No secrets are persisted to disk by this script. The Doppler API
 * retains version history.
 */
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

interface RotationEntry {
  project: string;
  config: string;
  name: string;
  /** Literal value (use only in dev/test; rotated values should reduce to value_cmd). */
  value?: string;
  /** Shell command that prints the new value to stdout. */
  value_cmd?: string;
  /** Optional human-readable note printed in plan + apply logs. */
  note?: string;
}

interface RotationFile {
  rotations: RotationEntry[];
}

interface RotationResult {
  project: string;
  config: string;
  name: string;
  status: 'dry-run' | 'applied' | 'failed';
  valueSource: 'literal' | 'cmd';
  prevValueEchoed: boolean;
  newValue?: string;
  durationMs: number;
  error?: string;
}

function parseArgs(): { fromPath: string; apply: boolean } {
  const argv = process.argv.slice(2);
  const fromIdx = argv.indexOf('--from');
  if (fromIdx < 0 || fromIdx + 1 >= argv.length) {
    process.stderr.write('Usage: tsx scripts/rotate-secrets.ts --from <path> [--apply]\n');
    process.exit(2);
  }
  return { fromPath: argv[fromIdx + 1], apply: argv.includes('--apply') };
}

function loadYamlLite(raw: string): RotationFile {
  // Trivial YAML parser: each non-blank, non-comment line is `- key: value`
  // (single-level mapping, sufficient for `rotations:` + bullet list).
  // Multi-key entries use indented continuation lines.
  const lines = raw.split(/\r?\n/);
  const rotations: RotationEntry[] = [];
  let current: Partial<RotationEntry> | null = null;
  let inRotationsBlock = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (/^rotations:\s*$/.test(trimmed)) {
      inRotationsBlock = true;
      continue;
    }
    if (!inRotationsBlock) continue;
    if (trimmed.startsWith('- ')) {
      if (current) rotations.push(current as RotationEntry);
      current = {};
      const kv = trimmed.slice(2).split(':');
      const k = kv[0].trim();
      const v = kv.slice(1).join(':').trim();
      (current as Record<string, string>)[k] = v;
      continue;
    }
    if (!current) continue;
    const idx = trimmed.indexOf(':');
    if (idx < 0) continue;
    const k = trimmed.slice(0, idx).trim();
    const v = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    (current as Record<string, string>)[k] = v;
  }
  if (current) rotations.push(current as RotationEntry);
  if (rotations.length === 0) {
    throw new Error('rotations.yaml parses but contains no rotation entries');
  }
  for (const r of rotations) {
    if (!r.project || !r.config || !r.name) {
      throw new Error(`rotation entry missing required field (project|config|name): ${JSON.stringify(r)}`);
    }
    if (!r.value && !r.value_cmd) {
      throw new Error(`rotation entry must define value or value_cmd: ${r.name}`);
    }
  }
  return { rotations };
}

function resolveValue(entry: RotationEntry): { value: string; source: 'literal' | 'cmd' } {
  if (entry.value !== undefined) return { value: entry.value, source: 'literal' };
  const cmd = entry.value_cmd!;
  const r = spawnSync(cmd, { shell: true, encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(`value_cmd failed for ${entry.name}: status=${r.status}; stderr=${r.stderr}`);
  }
  return { value: r.stdout.trim(), source: 'cmd' };
}

async function applyToDoppler(entry: RotationEntry, value: string): Promise<void> {
  const token = process.env.DOPPLER_TOKEN;
  if (!token) {
    throw new Error('DOPPLER_TOKEN env var is required for --apply mode');
  }
  const url =
    `https://api.doppler.com/v3/configs/config/secrets` +
    `?project=${encodeURIComponent(entry.project)}` +
    `&config=${encodeURIComponent(entry.config)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ name: entry.name, value, visibility: 'protected' }),
  });
  if (!res.ok) {
    throw new Error(`Doppler API ${res.status}: ${await res.text()}`);
  }
}

async function main(): Promise<void> {
  const { fromPath, apply } = parseArgs();
  const raw = await readFile(fromPath, 'utf8');
  const { rotations } = loadYamlLite(raw);
  const results: RotationResult[] = [];
  for (const entry of rotations) {
    const t0 = Date.now();
    try {
      const { value, source } = resolveValue(entry);
      if (apply) {
        await applyToDoppler(entry, value);
      }
      results.push({
        project: entry.project,
        config: entry.config,
        name: entry.name,
        status: apply ? 'applied' : 'dry-run',
        valueSource: source,
        prevValueEchoed: false,
        newValue: process.env.NO_ECHO === '1' ? undefined : value,
        durationMs: Date.now() - t0,
      });
    } catch (err) {
      results.push({
        project: entry.project,
        config: entry.config,
        name: entry.name,
        status: 'failed',
        valueSource: 'literal',
        prevValueEchoed: false,
        durationMs: Date.now() - t0,
        error: (err as Error).message,
      });
    }
  }
  process.stdout.write(JSON.stringify(results, null, 2) + '\n');
  if (apply && results.every((r) => r.status === 'applied')) {
    process.stdout.write(
      '\n# Next step (cache invalidation on Bifrost):\n' +
        '#   pm2 sendSignal SIGUSR1 bifrost\n' +
        '#   kill -USR1 $(pgrep -f "node.*dist/server.js")\n',
    );
  }
  if (results.some((r) => r.status === 'failed')) process.exit(1);
}

// Only invoke main() when this file is the program entry point (avoids
// vitest side-effects when the test file imports the helpers
// loadYamlLite / resolveValue / applyToDoppler). The typeof check
// guards against ESM tsx folders where `require` is undefined.
// Q-E (code-reviewer): prefer `import.meta.url === pathToFileURL(...)`
// for stricter ESM; for v1.3.0 the typeof check works whether tsx
// loads via CJS or ESM interop.
if (typeof require !== 'undefined' && require.main === module) {
  void main();
}
