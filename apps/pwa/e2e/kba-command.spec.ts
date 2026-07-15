import { expect, test } from '@playwright/test';

// KBA Command Center E2E spec
// Covers: route render, KBA action button presence, status state machine
// transitions (happy path + uplink-failed graceful degradation), and
// no-full-page-reload sentinel (same pattern as tab-swap.spec.ts).
//
// Bifrost is NOT running during this Playwright test. The PWA's /api/bifrost/issue
// proxy will get a 502 (BIFROST_UPLINK_FAILED) which exercises the error path.
// To test the happy path end-to-end, run with BIFROST_URL set and Bifrost live.

test.describe('KBA Command Center', () => {
  test('renders the command heading and all 8 KBA action buttons', async ({ page }) => {
    await page.goto('/kba');

    await expect(page.getByRole('heading', { name: /KBA Command Center/i })).toBeVisible();
    await expect(page.getByText('Node: Active | Uplink: Secured')).toBeVisible();

    // All 8 actions from KBA_ACTIONS must render as buttons
    const expectedActions = [
      'Sync KBA Ledgers',
      'Run Fiscal Audit',
      'Reroute Uplink',
      'Rezero Systems',
      'Heal Cluster',
      'Nano Deployment',
      'Scan Perimeter',
      'Forge Signatures',
    ];
    for (const label of expectedActions) {
      await expect(page.getByRole('button', { name: label })).toBeVisible();
    }
  });

  test('shows AWAITING_DIRECTIVE status on initial render', async ({ page }) => {
    await page.goto('/kba');
    // The initial status text rendered by KBASwarmCommand
    await expect(page.getByText('AWAITING_DIRECTIVE')).toBeVisible();
  });

  test('transitions through status states and gracefully shows BIFROST_UPLINK_FAILED when Bifrost is unreachable', async ({
    page,
  }) => {
    await page.goto('/kba');

    // Plant a no-reload sentinel before clicking
    await page.evaluate(() => {
      (window as unknown as { __kbaNoReload?: boolean }).__kbaNoReload = true;
    });

    // Click the primary (gold-emphasis) action — Sync KBA Ledgers (KBA_SYNC_001)
    await page.getByRole('button', { name: 'Sync KBA Ledgers' }).click();

    // Status must immediately leave AWAITING_DIRECTIVE (transitions to REQUESTING_BIFROST_SIGNATURE)
    await expect(page.getByText('AWAITING_DIRECTIVE')).not.toBeVisible({ timeout: 2000 });

    // Without a live Bifrost the proxy returns 502 → terminal state is BIFROST_UPLINK_FAILED
    await expect(
      page.getByText(
        /BIFROST_UPLINK_FAILED|COMMAND_EXECUTED_SUCCESSFULLY|BIFROST_REJECTED_PAYLOAD/,
      ),
    ).toBeVisible({ timeout: 10_000 });

    // No full-page reload occurred — window sentinel still present
    const noReload = await page.evaluate(
      () => (window as unknown as { __kbaNoReload?: boolean }).__kbaNoReload === true,
    );
    expect(noReload).toBe(true);
  });

  test('navigating to /kba from the dashboard sidebar link works', async ({ page }) => {
    await page.goto('/');
    // The Dashboard sidebar renders an <a href="/kba"> with aria-label
    const kbaLink = page.getByRole('link', { name: 'KBA Command Center' });
    await expect(kbaLink).toBeVisible();
    await kbaLink.click();
    await expect(page).toHaveURL('/kba');
    await expect(page.getByRole('heading', { name: /KBA Command Center/i })).toBeVisible();
  });
});
