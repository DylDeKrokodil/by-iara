import { expect, test, type Page } from '@playwright/test';

/** Browser-only fixtures: never seed or mutate the connected admin API. */
async function mockAdmin(page: Page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const items = <T>(values: T[]) => ({
      items: values,
      page: 0,
      size: 100,
      total: values.length,
    });
    const service = {
      id: 'service-1',
      slug: 'relaxing-massage',
      name: 'Relaxing massage',
      description: 'A personalised treatment.',
      active: true,
      featured: true,
      sortOrder: 0,
      image: null,
      packOffers: [],
      variants: [
        {
          id: 'variant-1',
          durationMinutes: 60,
          price: { amountCents: 6000, currency: 'EUR' },
          active: true,
          sortOrder: 0,
        },
      ],
    };
    const reservation = {
      id: 'reservation-1',
      serviceId: service.id,
      serviceVariantId: 'variant-1',
      serviceName: service.name,
      durationMinutes: 60,
      status: url.searchParams.getAll('status').includes('PENDING')
        ? 'PENDING'
        : 'CONFIRMED',
      price: { amountCents: 6000, currency: 'EUR' },
      startsAt: new Date(Date.now() + 3600000).toISOString(),
      endsAt: new Date(Date.now() + 7200000).toISOString(),
      customer: { name: 'Ana Silva', email: 'ana@example.com', phone: null },
      notes: null,
    };
    const discount = {
      id: 'discount-1',
      name: 'Welcome offer',
      audience: 'PUBLIC',
      scope: 'ALL_SERVICES',
      valueType: 'PERCENTAGE',
      valueAmount: 1000,
      currency: null,
      startsAt: '2026-09-01T00:00:00Z',
      endsAt: '2026-09-30T23:59:59Z',
      maxUniqueClients: null,
      maxUsesPerCustomer: 1,
      firstTimeCustomersOnly: false,
      codeHint: 'WEL••••',
      customerEmail: null,
      status: 'ACTIVE',
      serviceIds: [],
      reservedUses: 0,
      consumedUses: 0,
      uniqueClients: 0,
      publicCode: 'WELCOME10',
      featured: false,
    };
    let data: unknown = [];
    if (path.includes('/auth/')) {
      data = {
        accessToken: 'browser-fixture',
        tokenType: 'Bearer',
        expiresInSeconds: 3600,
        admin: { email: 'iara@example.com', role: 'ADMIN' },
      };
    } else if (path.endsWith('/reservations/attention')) {
      data = items([
        {
          reservation: { ...reservation, status: 'PENDING' },
          reason: 'APPROVAL_REQUIRED',
          paymentSummary: {
            totalPaidCents: 0,
            balanceDueCents: 6000,
            currency: 'EUR',
            state: 'UNPAID',
          },
        },
      ]);
    } else if (path.endsWith('/reservations')) {
      data = items([reservation]);
    } else if (path.endsWith('/payments') && path.includes('/reservations/')) {
      data = {
        items: [],
        summary: {
          totalPaidCents: 0,
          balanceDueCents: 6000,
          currency: 'EUR',
          state: 'UNPAID',
        },
      };
    } else if (path.includes('/reservations/')) {
      data = reservation;
    } else if (path.endsWith('/services')) {
      data = [service];
    } else if (path.includes('/services/')) {
      data = service;
    } else if (path.endsWith('/discounts')) {
      data = [discount];
    } else if (path.endsWith('/discounts/discount-1/usage')) {
      data = [];
    } else if (path.endsWith('/availability/rules')) {
      data = [
        {
          id: 'rule-1',
          dayOfWeek: 'MONDAY',
          startTime: '09:00',
          endTime: '17:00',
        },
      ];
    } else if (path.includes('/settings')) {
      data = { appointmentBufferMinutes: 15, maxDailyBookings: 6 };
    } else if (path.endsWith('/finance/report')) {
      data = {
        from: '2026-09-01',
        to: '2026-09-30',
        currency: 'EUR',
        revenueCents: 126000,
        expenseCents: 32000,
        operatingProfitCents: 94000,
        outstandingBalanceCents: 0,
        completedAppointments: 21,
        noShows: 0,
        averageCompletedValueCents: 6000,
        granularity: 'DAILY',
        revenueByPaymentMethod: [],
        trend: [],
      };
    } else if (
      path.includes('/finance/') ||
      path.includes('/customers') ||
      path.includes('/packs')
    ) {
      data = items([]);
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data),
    });
  });
}

test.beforeEach(async ({ page }) => mockAdmin(page));

test('finds a page, navigates, and clears the navigation filter', async ({
  page,
}) => {
  await page.goto('/dashboard');
  const search = page.getByRole('searchbox', { name: 'Find an admin page' });
  await search.fill('sett');
  const nav = page.getByRole('navigation', { name: 'Primary', exact: true });
  await expect(nav.getByRole('link')).toHaveCount(1);
  await nav.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Settings', exact: true }),
  ).toBeVisible();
  await expect(search).toHaveValue('');
  await search.fill('no-such-page');
  await expect(nav.getByText('No matching pages.')).toBeVisible();
});

test('keeps mobile navigation focus inside the drawer and restores it on Escape', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');
  const toggle = page.getByRole('button', { name: 'Toggle navigation' });
  await toggle.click();
  await expect(
    page.getByRole('button', { name: 'Close navigation' }),
  ).toBeFocused();
  const brand = page.getByRole('link', {
    name: 'Iara Gouveia dashboard',
    exact: true,
  });
  await brand.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(
    page.getByRole('button', { name: 'Sign out', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(brand).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#admin-sidebar')).toHaveAttribute('inert', '');
});

test('opens service editing from its name and supports keyboard view switching', async ({
  page,
}) => {
  await page.goto('/services');
  await page
    .getByRole('link', { name: 'Relaxing massage', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Edit service' }),
  ).toBeVisible();
  await page.goto('/availability');
  const weekly = page.getByRole('tab', { name: 'Weekly Hours' });
  await weekly.focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('tab', { name: 'Blocked Times' }),
  ).toHaveAttribute('aria-selected', 'true');
});

test('shows calendar capacity in a time-based week overview', async ({
  page,
}) => {
  await page.goto('/reservations');
  await page.getByRole('tab', { name: 'Calendar' }).click();

  await expect(
    page.getByRole('heading', { name: 'Calendar agenda' }),
  ).toBeVisible();
  await expect(page.locator('.week-schedule-grid')).toBeVisible();
  await expect(page.locator('.schedule-reservation')).toHaveCount(1);
  await expect(
    page.getByText('Availability and workload by day, week, or month.'),
  ).toBeVisible();
  await expect(page.getByText(/h booked|h available/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Month', exact: true }).click();
  await expect(page.locator('.month-grid')).toBeVisible();
  await expect(page.locator('.month-cell')).toHaveCount(42);
  await page.getByRole('button', { name: 'Day', exact: true }).click();
  await expect(page.locator('.agenda-day')).toBeVisible();
});

test('opens and dismisses the discount details drawer', async ({ page }) => {
  await page.goto('/discounts');
  await page
    .getByRole('button', { name: 'Open Welcome offer details' })
    .click();

  const dialog = page.getByRole('dialog', { name: 'Welcome offer' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toBeHidden();
});

test('removes overlay movement when reduced motion is requested', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/discounts');
  await page
    .getByRole('button', { name: 'Open Welcome offer details' })
    .click();

  const dialog = page.getByRole('dialog', { name: 'Welcome offer' });
  await expect(dialog).toBeVisible();
  await expect
    .poll(() =>
      dialog.evaluate((element) => getComputedStyle(element).transform),
    )
    .toBe('none');
  await expect
    .poll(() =>
      dialog.evaluate(
        (element) => getComputedStyle(element).transitionProperty,
      ),
    )
    .toBe('none');
});

for (const width of [390, 834, 1440]) {
  test(`admin routes remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const route of [
      'dashboard',
      'reservations',
      'services',
      'services/new',
      'customers',
      'availability',
      'packs',
      'discounts',
      'guides',
      'guides/new',
      'images',
      'reports',
      'settings',
    ]) {
      await page.goto(`/${route}`);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
      await expect(page.locator('vite-error-overlay')).toHaveCount(0);
      await expect
        .poll(
          () =>
            page.evaluate(
              () => document.documentElement.scrollHeight <= window.innerHeight,
            ),
          {
            message: `${route} must scroll inside the workspace without a blank document scrollbar`,
          },
        )
        .toBe(true);
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true);
      await expect
        .poll(() =>
          page
            .locator('.workspace')
            .evaluate((element) => element.scrollWidth <= element.clientWidth),
        )
        .toBe(true);
    }
    expect(errors).toEqual([]);
  });
}
