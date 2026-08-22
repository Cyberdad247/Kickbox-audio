import fs from 'node:fs';
import path from 'node:path';

// BenchmarkReport — all values are MEASURED, not hardcoded.
export interface BenchmarkReport {
  timestamp: string;
  buildStatus: 'PASSED' | 'NO_BUILD_FOUND';
  bundleSizeKB: number; // largest single chunk in .next/static/chunks/
  totalChunksSizeKB: number; // sum of all chunks
  dbPoolLimit: number; // parsed from DATABASE_URL connection_limit param
  estimatedCarbonFactor: 'OPTIMAL_A_GRADE' | 'GOOD_B_GRADE' | 'REVIEW_NEEDED';
}

function measureBundleSize(repoRoot: string): {
  largest: number;
  total: number;
  status: 'PASSED' | 'NO_BUILD_FOUND';
} {
  const chunksDir = path.join(repoRoot, 'apps', 'pwa', '.next', 'static', 'chunks');
  if (!fs.existsSync(chunksDir)) {
    return { largest: 0, total: 0, status: 'NO_BUILD_FOUND' };
  }

  let largest = 0;
  let total = 0;
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.js')) {
        const size = fs.statSync(full).size;
        total += size;
        if (size > largest) largest = size;
      }
    }
  };
  walk(chunksDir);

  return { largest, total, status: 'PASSED' };
}

function parseDbPoolLimit(): number {
  const url = process.env.DATABASE_URL ?? '';
  try {
    const match = url.match(/connection_limit=(\d+)/);
    return match ? Number.parseInt(match[1], 10) : 5; // default Prisma pool
  } catch {
    return 5;
  }
}

function carbonGrade(largestKB: number): BenchmarkReport['estimatedCarbonFactor'] {
  if (largestKB <= 100) return 'OPTIMAL_A_GRADE';
  if (largestKB <= 150) return 'GOOD_B_GRADE';
  return 'REVIEW_NEEDED';
}

export function runBenchmark(repoRoot = process.cwd()): BenchmarkReport {
  console.log('[benchmark] measuring real bundle and environment metrics...');

  const { largest, total, status } = measureBundleSize(repoRoot);
  const largestKB = Math.round(largest / 1024);
  const totalKB = Math.round(total / 1024);
  const dbPoolLimit = parseDbPoolLimit();

  const report: BenchmarkReport = {
    timestamp: new Date().toISOString(),
    buildStatus: status,
    bundleSizeKB: largestKB,
    totalChunksSizeKB: totalKB,
    dbPoolLimit,
    estimatedCarbonFactor: carbonGrade(largestKB),
  };

  const outPath = path.join(repoRoot, 'benchmark-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`[benchmark] report written to ${outPath}`);
  console.log(
    `[benchmark] largest chunk: ${largestKB} KB | total: ${totalKB} KB | pool: ${dbPoolLimit} | carbon: ${report.estimatedCarbonFactor}`,
  );

  return report;
}

// CLI entry-point — only runs when invoked directly (not when imported by tests)
if (process.argv[1] && (process.argv[1].endsWith('run.ts') || process.argv[1].endsWith('run.js'))) {
  runBenchmark();
}
