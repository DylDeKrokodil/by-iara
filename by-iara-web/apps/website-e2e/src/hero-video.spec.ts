import { expect, test } from '@playwright/test';

test('shows the playing hero video after a refresh', async ({ page }) => {
  await page.goto('/pt');

  const heroVideo = page.locator('.home-media-video');
  await expect(heroVideo).toHaveCSS('opacity', '1');

  await page.reload();

  await expect(heroVideo).toHaveCSS('opacity', '1');
  await expect
    .poll(() => heroVideo.evaluate((video: HTMLVideoElement) => video.paused))
    .toBe(false);
});
