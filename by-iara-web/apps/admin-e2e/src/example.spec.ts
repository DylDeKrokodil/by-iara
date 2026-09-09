import { test, expect } from '@playwright/test';

test('requires sign in before opening the admin workspace', async ({
  page,
}) => {
  await page.route('**/api/admin/auth/refresh', (route) =>
    route.fulfill({ status: 401, body: '{}' }),
  );
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Welcome back.',
  );
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Enter your email address.')).toBeVisible();
  await expect(page.getByText('Enter your password.')).toBeVisible();
});
