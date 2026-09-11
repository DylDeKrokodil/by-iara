import { expect, test } from '@playwright/test';
const content = {
  name: 'Autumn welcome',
  titlePt: 'Um momento só para si',
  titleEn: 'A moment just for you',
  bodyPt: 'Descubra as nossas massagens.',
  bodyEn: 'Discover our massages.',
  action: 'book',
};

test('create, preview, edit, replace and disable popups', async ({ page }) => {
  let items = [{ id: 'first', content, active: true }];
  await page.route('**/api/admin/auth/refresh', (route) =>
    route.fulfill({
      json: {
        accessToken: 'test-token',
        tokenType: 'Bearer',
        expiresInSeconds: 3600,
        admin: { email: 'preview@example.com', role: 'ADMIN' },
      },
    }),
  );
  await page.route('**/api/admin/popups**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === 'POST') {
      const item = {
        id: 'second',
        content: request.postDataJSON(),
        active: false,
      };
      items.push(item);
      await route.fulfill({ status: 201, json: item });
    } else if (request.method() === 'PUT') {
      const id = path.split('/')[4];
      if (path.endsWith('/active')) {
        const active = request.postDataJSON().active;
        items = items.map((item) => ({
          ...item,
          active: active
            ? item.id === id
            : item.id === id
              ? false
              : item.active,
        }));
        await route.fulfill({ status: 204 });
      } else {
        items = items.map((item) =>
          item.id === id ? { ...item, content: request.postDataJSON() } : item,
        );
        await route.fulfill({ json: items.find((item) => item.id === id) });
      }
    } else await route.fulfill({ json: items });
  });
  await page.goto('/popups');
  await expect(
    page.getByRole('heading', { name: 'Website popups' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Create popup', exact: true }).click();
  await page.getByRole('button', { name: 'Save popup', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: /^Internal name/ }),
  ).toBeFocused();
  await page
    .getByRole('textbox', { name: /^Internal name/ })
    .fill('New treatment');
  await page
    .getByRole('textbox', { name: /^Título/ })
    .fill('Conheça a nossa nova massagem');
  await page
    .getByRole('textbox', { name: /^Mensagem/ })
    .fill('Um novo cuidado pensado para si.');
  await page
    .getByRole('textbox', { name: /^Title/ })
    .fill('Meet your new favourite massage');
  await page
    .getByRole('textbox', { name: /^Message/ })
    .fill('A little care, created just for you.');
  await page.getByRole('button', { name: 'View English' }).click();
  await expect(page.locator('.preview .announcement')).toContainText(
    'Meet your new favourite massage',
  );
  await page.screenshot({
    path: 'dist/.playwright/popup-admin-editor.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Save popup', exact: true }).click();
  await expect(page.getByRole('status')).toContainText(
    'Enable it when you are ready',
  );
  await page
    .getByRole('button', { name: 'Enable New treatment', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Enable this popup?' });
  await expect(dialog).toContainText(
    'replaces whichever popup is currently active',
  );
  await dialog
    .getByRole('button', { name: 'Enable popup', exact: true })
    .click();
  await expect(
    page.locator('.popup-row').filter({ hasText: 'New treatment' }),
  ).toContainText('Active');
  await expect(
    page.locator('.popup-row').filter({ hasText: 'Autumn welcome' }),
  ).toContainText('Disabled');
  await page
    .getByRole('button', { name: 'Edit New treatment', exact: true })
    .click();
  await page.getByRole('textbox', { name: /^Title/ }).fill('Updated message');
  await page.getByRole('button', { name: 'Save popup', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('This popup is live');
  await page
    .getByRole('button', { name: 'Disable New treatment', exact: true })
    .click();
  await expect(page.locator('.publication-summary')).toContainText(
    'No popup is currently active',
  );
});
