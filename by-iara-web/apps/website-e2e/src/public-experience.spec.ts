import { expect, test } from '@playwright/test';

test('mobile navigation supports Escape, active links and route focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pt');
  const toggle = page.getByRole('button', { name: 'Abrir menu', exact: true });
  await toggle.click();
  const navigation = page.locator('.mobile-menu-nav');
  await expect(
    navigation.getByRole('link', { name: 'Início', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await navigation.getByRole('link').first().focus();
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await expect(page.locator('#mobile-menu')).toHaveAttribute('inert');
  await toggle.click();
  await navigation
    .getByRole('link', { name: 'Massagens', exact: true })
    .click();
  await expect(page).toHaveURL(/\/pt\/massagens$/);
  await expect(page.locator('#main-content')).toBeFocused();
  await expect(page.locator('#mobile-menu')).toHaveAttribute('inert');
});

test('keyboard visitors can skip navigation', async ({ page }) => {
  await page.goto('/pt');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Saltar para o conteúdo' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main-content$/);
  await expect(page.locator('#main-content')).toBeVisible();
});

test('mobile booking retains its summary and comfortable controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/services', (route) =>
    route.fulfill({
      json: [
        {
          id: 'service-1',
          slug: 'relaxamento',
          name: 'Massagem de relaxamento',
          description: 'Uma sessão para descansar.',
          active: true,
          sortOrder: 1,
          featured: true,
          image: null,
          translations: {
            'pt-PT': {
              slug: 'relaxamento',
              name: 'Massagem de relaxamento',
              description: 'Uma sessão para descansar.',
              treatmentDescription: null,
              suitableFor: null,
              sessionDescription: null,
              faqs: [],
            },
          },
          packOffers: [],
          variants: [
            {
              id: 'variant-1',
              durationMinutes: 60,
              price: { amountCents: 5000, currency: 'EUR' },
              active: true,
              sortOrder: 1,
            },
          ],
        },
      ],
    }),
  );
  await page.route('**/api/discounts/automatic', (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route('**/api/reservations/availability?**', (route) =>
    route.fulfill({ json: [] }),
  );
  // Client navigation ensures this fixture doesn't depend on SSR's API access.
  await page.goto('/pt/missing');
  await page.locator('.header-actions a').last().click();
  const summary = page.locator('aside.booking-summary');
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('Massagem de relaxamento');
  await expect(summary).toContainText('50,00');
  const sizes = await page
    .locator('.header-actions .btn, .select-trigger, .mobile-primary-action')
    .evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().height),
    );
  expect(sizes.length).toBeGreaterThan(1);
  expect(sizes.every((height) => height >= 44)).toBe(true);
  await page.locator('.mobile-primary-action').click();
  await expect(page.locator('.calendar-empty')).toBeVisible();
  await expect(summary).toBeVisible();
});
