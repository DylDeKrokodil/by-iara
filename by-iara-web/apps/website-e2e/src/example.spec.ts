import { test, expect } from '@playwright/test';

test('shows public shell', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Massage bookings',
  );
});
