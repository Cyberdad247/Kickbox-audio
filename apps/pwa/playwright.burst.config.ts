import { defineConfig, devices } from '@playwright/test';

/**
 * v1.4.1: Playwright config for the rate-limit burst e2e test.
 *
 * Differs from the base `playwright.config.ts`:
 *   - No `webServer` — the burst test hits a remote URL (E2E_BASE_URL),
 *     so spinning up a local `next start` on port 3100 would be wasted.
 *   - No `next build` prerequisite — the remote URL is already built.
 *
 * To run against prod (after E2E secrets are wired in Doppler + GitHub
 * Actions):
 *
 *   E2E_BASE_URL=https://pwa-eight-gamma.vercel.app \
 *   E2E_ADMIN_TOKEN=$(doppler secrets get --project kickbox-audio \
 *     --config prd bifrost/admin-token --plain) \
 *   npx playwright test --config=playwright.burst.config.ts
 *
 * The test file (`e2e/rate-limit-burst.spec.ts`) skips itself if either
 * env var is unset, so a missing-secret run is a no-op rather than a
 * failure.
 */

export default defineConfig({
  testDir: './e2e',
  testMatch: /rate-limit-burst\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    // No baseURL — the test uses E2E_BASE_URL directly via request.newContext().
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
