import { expect, test } from '@playwright/test';

test('shows the playing hero video after a refresh', async ({ page }) => {
  await page.goto('/pt');

  const heroVideo = page.locator('.home-media-video');
  const siteHeader = page.locator('.site-header');
  await expect(heroVideo).toHaveCSS('opacity', '1');
  await expect(siteHeader).toBeVisible();
  await expect
    .poll(() =>
      heroVideo.evaluate((video: HTMLVideoElement) => video.currentSrc),
    )
    .toContain('.webm');

  await page.reload();

  await expect(heroVideo).toHaveCSS('opacity', '1');
  await expect
    .poll(() => heroVideo.evaluate((video: HTMLVideoElement) => video.paused))
    .toBe(false);

  await page.locator('.home-closing').scrollIntoViewIfNeeded();
  await expect(siteHeader).toBeVisible();
});

test('a paused hero stays paused after scrolling away and back', async ({
  page,
}) => {
  await page.goto('/pt');
  const video = page.locator('.home-media-video');
  await page.getByRole('button', { name: 'Pausar vídeo', exact: true }).click();
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.paused))
    .toBe(true);
  await page.locator('.home-closing').scrollIntoViewIfNeeded();
  await page.locator('.home-hero').scrollIntoViewIfNeeded();
  await expect(
    page.getByRole('button', { name: 'Reproduzir vídeo', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.paused))
    .toBe(true);
  await page
    .getByRole('button', { name: 'Reproduzir vídeo', exact: true })
    .click();
  await expect(video).toHaveCSS('opacity', '1');
});

test('reduced motion prevents autoplay and responds to preference changes', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/pt');
  const video = page.locator('.home-media-video');
  await expect(
    page.getByRole('button', { name: 'Reproduzir vídeo', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.paused))
    .toBe(true);
  // An explicit playback request remains available with Reduce Motion enabled.
  await page
    .getByRole('button', { name: 'Reproduzir vídeo', exact: true })
    .click();
  await expect(video).toHaveCSS('opacity', '1');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  await expect(video).toHaveCSS('opacity', '1');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.paused))
    .toBe(true);
});
