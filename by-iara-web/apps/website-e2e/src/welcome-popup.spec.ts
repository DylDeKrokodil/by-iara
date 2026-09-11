import { expect, test } from '@playwright/test';

const popup = {
  id: 'popup-one',
  titlePt: 'Um momento só para si',
  titleEn: 'A moment just for you',
  bodyPt: 'Descubra as nossas massagens e encontre tempo para cuidar de si.',
  bodyEn: 'Discover our massages and make a little time for yourself.',
  action: 'book',
};

test.beforeEach(async ({ page }) => {
  await page.route('**/api/popups/active', (route) =>
    route.fulfill({ json: popup }),
  );
});

test('non-modal welcome leaves content and focus available, then returns after reload', async ({
  page,
}) => {
  await page.goto('/en');
  const card = page.locator('byiara-welcome-popup .announcement');
  await expect(card).toBeVisible();
  await expect(card.getByRole('heading')).toHaveText(popup.titleEn);
  await expect(page.locator('main')).toBeVisible();
  expect(
    await card.evaluate((element) => element.contains(document.activeElement)),
  ).toBe(false);
  await expect(
    card.getByRole('link', { name: 'Book a session' }),
  ).toHaveAttribute('href', '/en/book');
  await card
    .getByRole('button', { name: 'Close announcement', exact: true })
    .focus();
  await page.keyboard.press('Escape');
  await expect(card).toHaveCount(0);
  await expect(page.locator('#main-content')).toBeFocused();
  await Promise.all([
    page.waitForResponse('**/api/popups/active'),
    page.reload(),
  ]);
  await expect(card).toBeVisible();
});

test('compact mobile popup expands, fits the viewport and respects reduced motion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/pt');
  const card = page.locator('byiara-welcome-popup .announcement');
  await expect(card).toBeVisible();
  await expect(card.locator('.announcement-message')).toBeHidden();
  const bounds = await card.boundingBox();
  expect(bounds!.height).toBeLessThan(844 * 0.3);
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(
    await page
      .locator('.popup-position')
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe('none');
  await card.getByRole('button', { name: 'Saber mais' }).click();
  await expect(
    card.getByRole('button', { name: 'Mostrar menos' }),
  ).toHaveAttribute('aria-expanded', 'true');
  await expect(card.locator('.announcement-message')).toBeVisible();
  await expect(card.getByRole('link')).toHaveAttribute('href', '/pt/marcar');
  await page.screenshot({ path: 'dist/.playwright/popup-mobile.png' });
});

test('booking and legal pages never request a popup', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/popups/active', (route) => {
    requests++;
    return route.fulfill({ json: popup });
  });
  for (const path of ['/en/book', '/pt/privacidade']) {
    await page.goto(path);
    await expect(page.locator('byiara-root main')).toBeVisible();
    await expect(page.locator('.popup-position')).toHaveCount(0);
  }
  expect(requests).toBe(0);
});

test('unavailable optional content leaves the page usable', async ({
  page,
}) => {
  await page.route('**/api/popups/active', (route) =>
    route.fulfill({ status: 503 }),
  );
  await page.goto('/en');
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('.popup-position')).toHaveCount(0);
});
