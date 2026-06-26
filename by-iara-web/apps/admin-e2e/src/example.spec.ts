import { test, expect } from '@playwright/test';

test('shows admin shell', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Reservation operations',
  );
});
