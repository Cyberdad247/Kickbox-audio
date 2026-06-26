import { expect, test } from '@playwright/test';

// Iron Gate — Test C: UI Thread & View Swap.
// The Navigation Spire tabs in Dashboard.tsx are useState-driven, so clicking
// "Properties" must swap the rendered view WITHOUT a full page refresh.
test('Properties tab swaps view without a full page reload', async ({ page }) => {
  await page.goto('/');

  // Stamp a sentinel on window. A full page reload would wipe this flag.
  await page.evaluate(() => {
    (window as unknown as { __noReload?: boolean }).__noReload = true;
  });

  const urlBefore = page.url();

  // Click the "Properties" nav button (role/name selector).
  await page.getByRole('button', { name: 'Properties' }).click();

  // The tenant cards should now render.
  await expect(page.getByText('Obsidian Tower · Unit 12')).toBeVisible();

  // Sentinel must survive — proves no full page refresh occurred.
  const noReload = await page.evaluate(
    () => (window as unknown as { __noReload?: boolean }).__noReload === true,
  );
  expect(noReload).toBe(true);

  // URL must be unchanged (no route navigation).
  expect(page.url()).toBe(urlBefore);
});
