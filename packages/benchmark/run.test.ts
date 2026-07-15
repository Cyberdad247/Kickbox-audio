import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runBenchmark } from './run';

// Scaffolds a minimal .next/static/chunks/ tree in a temp directory so
// runBenchmark() can measure real file sizes without touching the live build.
function scaffoldBuild(root: string, chunks: Record<string, number>) {
  const chunksDir = path.join(root, 'apps', 'pwa', '.next', 'static', 'chunks');
  fs.mkdirSync(chunksDir, { recursive: true });
  for (const [name, bytes] of Object.entries(chunks)) {
    fs.writeFileSync(path.join(chunksDir, name), Buffer.alloc(bytes));
  }
}

describe('runBenchmark', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kba-bench-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns buildStatus PASSED and measures the largest chunk correctly', () => {
    scaffoldBuild(tmpDir, {
      'main-abc123.js': 60 * 1024, // 60 KB
      'vendor-def456.js': 90 * 1024, // 90 KB  ← largest
      'page-xyz789.js': 40 * 1024, // 40 KB
    });

    const report = runBenchmark(tmpDir);

    expect(report.buildStatus).toBe('PASSED');
    expect(report.bundleSizeKB).toBe(90); // largest chunk
    expect(report.totalChunksSizeKB).toBe(190); // 60 + 90 + 40
    expect(report.estimatedCarbonFactor).toBe('OPTIMAL_A_GRADE'); // 90 KB ≤ 100 KB
  });

  it('returns GOOD_B_GRADE when largest chunk is between 100 KB and 150 KB', () => {
    scaffoldBuild(tmpDir, { 'big-chunk.js': 130 * 1024 });
    const report = runBenchmark(tmpDir);
    expect(report.estimatedCarbonFactor).toBe('GOOD_B_GRADE');
  });

  it('returns REVIEW_NEEDED when largest chunk exceeds 150 KB', () => {
    scaffoldBuild(tmpDir, { 'huge-chunk.js': 200 * 1024 });
    const report = runBenchmark(tmpDir);
    expect(report.estimatedCarbonFactor).toBe('REVIEW_NEEDED');
  });

  it('returns buildStatus NO_BUILD_FOUND when .next directory is absent', () => {
    // No scaffoldBuild call — no .next directory
    const report = runBenchmark(tmpDir);
    expect(report.buildStatus).toBe('NO_BUILD_FOUND');
    expect(report.bundleSizeKB).toBe(0);
    expect(report.totalChunksSizeKB).toBe(0);
  });

  it('writes benchmark-report.json to the repo root', () => {
    scaffoldBuild(tmpDir, { 'chunk.js': 50 * 1024 });
    runBenchmark(tmpDir);
    const outPath = path.join(tmpDir, 'benchmark-report.json');
    expect(fs.existsSync(outPath)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    expect(parsed).toMatchObject({
      buildStatus: 'PASSED',
      bundleSizeKB: 50,
    });
  });

  it('report object has a valid ISO timestamp', () => {
    scaffoldBuild(tmpDir, { 'chunk.js': 1024 });
    const report = runBenchmark(tmpDir);
    expect(() => new Date(report.timestamp)).not.toThrow();
    expect(new Date(report.timestamp).getFullYear()).toBeGreaterThanOrEqual(2024);
  });
});
