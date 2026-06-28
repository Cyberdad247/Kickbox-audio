import { expect, test } from '@playwright/test';

test('KOA tabs swap without reload and keep Lakeisha video mounted', async ({ page }) => {
  await page.goto('/');

  const assertSpatialCanvas = async () => {
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    const viewport = page.viewportSize() ?? { height: 720, width: 1280 };
    await expect
      .poll(async () => {
        const box = await canvas.boundingBox();
        return {
          height: Math.round(box?.height ?? 0),
          width: Math.round(box?.width ?? 0),
        };
      })
      .toEqual({ height: viewport.height, width: viewport.width });

    const box = await canvas.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(300);
    expect(box?.height).toBeGreaterThanOrEqual(300);

    await expect
      .poll(async () => {
        const pixel = await canvas.evaluate((node) => {
          const canvasEl = node as HTMLCanvasElement;
          const gl = canvasEl.getContext('webgl2') ?? canvasEl.getContext('webgl');
          if (!gl) return null;
          const rgba = new Uint8Array(4);
          gl.readPixels(
            Math.floor(canvasEl.width / 2),
            Math.floor(canvasEl.height / 2),
            1,
            1,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            rgba,
          );
          return Array.from(rgba);
        });

        return (pixel ?? []).slice(0, 3).some((channel) => channel > 0);
      })
      .toBe(true);
  };

  await assertSpatialCanvas();

  await page.evaluate(() => {
    (window as unknown as { __koaNoReload?: boolean }).__koaNoReload = true;
    const video = document.querySelector('video[src="/assets/lakisha_avatar.mp4"]');
    if (video) video.setAttribute('data-continuity-probe', 'lakeisha-root-anchor');
  });

  const urlBefore = page.url();

  await page.getByRole('button', { name: 'Streaming' }).click();
  await expect(page.getByText('Edge - NA-East')).toBeVisible();

  await page.getByRole('button', { name: 'Coffee' }).click();
  await expect(page.getByText('Cleveland Roast Reserve')).toBeVisible();

  const noReload = await page.evaluate(
    () => (window as unknown as { __koaNoReload?: boolean }).__koaNoReload === true,
  );
  expect(noReload).toBe(true);
  expect(page.url()).toBe(urlBefore);

  await expect(page.locator('video[data-continuity-probe="lakeisha-root-anchor"]')).toHaveCount(1);

  await page.setViewportSize({ width: 390, height: 844 });
  await assertSpatialCanvas();
});
