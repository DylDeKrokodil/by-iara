import { expect, test } from '@playwright/test';

test('shows the playing hero video after a refresh', async ({ page }) => {
  await page.goto('/pt');

  const heroVideo = page.locator('.home-media-video');
  const siteHeader = page.locator('.site-header');
  await expect(heroVideo).toHaveCSS('opacity', '1');
  await expect(siteHeader).toHaveClass(/is-over-moving-media/);
  await expect(siteHeader).toHaveCSS('backdrop-filter', 'none');
  await expect
    .poll(() => heroVideo.evaluate((video: HTMLVideoElement) => video.currentSrc))
    .toContain('.webm');

  await page.reload();

  await expect(heroVideo).toHaveCSS('opacity', '1');
  await expect
    .poll(() => heroVideo.evaluate((video: HTMLVideoElement) => video.paused))
    .toBe(false);

  await page.locator('.home-closing').scrollIntoViewIfNeeded();
  await expect(siteHeader).not.toHaveClass(/is-over-moving-media/);
});
