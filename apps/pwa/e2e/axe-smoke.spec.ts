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
   * Wait for the BifrostProvider to mount and the LakishaHUD to
   * register; without this, axe might run before the autoplay-gate
   * has finished hydrating.
   */
  await page.waitForLoadState('networkidle');

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
