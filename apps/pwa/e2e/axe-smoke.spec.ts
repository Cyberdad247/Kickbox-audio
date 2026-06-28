import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility smoke test using axe-core + Playwright.
 *
 * This is a baseline check — it catches the most common a11y
 * violations (missing alt text, low contrast, missing labels,
 * improper ARIA). Add more targeted tests as the PWA surface
 * grows.
 *
 * To run: `npm run test:e2e --workspace=@sovereign/pwa`
 */
test('home page has no critical axe violations', async ({ page }) => {
  await page.goto('/');
  /**
   * v1.1.1 hardening: replaced `waitForLoadState('networkidle')` with
   * `waitForSelector('[data-testid="app-ready"]')` because the Bifrost
   * WebSocket connection stays open indefinitely, so `networkidle` may
   * never fire. The `data-testid="app-ready"` attribute is on the
   * `<body>` element in `layout.tsx` and is present as soon as the
   * React tree has mounted.
   */
  await page.waitForSelector('[data-testid="app-ready"]', { timeout: 10_000 });

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
