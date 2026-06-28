import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/.claude/**', '**/e2e/**'],
    // 2026-06-28 production-readiness: vitest coverage configuration.
    // Provider is v8 (matches @vitest/coverage-v8 installed in the v1.1.0
    // cycle). Reports are emitted on every `npm run test` invocation
    // (text summary in stdout + HTML in ./coverage + LCOV for CI
    // ingestion). Thresholds are NOT enforced yet — see v1.1.1 to add
    // them after baseline coverage is measured.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'apps/bifrost/src/**/*.ts',
        'apps/pwa/src/**/*.ts',
        'apps/pwa/src/**/*.tsx',
        'packages/db/src/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types.ts',
        '**/index.ts',
        '**/node_modules/**',
      ],
    },
  },
});
