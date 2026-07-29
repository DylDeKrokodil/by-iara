import { Route } from '@angular/router';
import {
  DEFAULT_LOCALE_PATH,
  getLocalizedPagePath,
  SUPPORTED_LOCALES,
} from './i18n/supported-locales';
import type { LocalePath } from './i18n/supported-locales';
import { serviceResolver } from './services/service.resolver';
import { guideResolver } from './guides/guide.resolver';

function localizedRoutes(locale: LocalePath): Route[] {
  const massagesPath = getLocalizedPagePath(locale, 'services');
  const guidesPath = getLocalizedPagePath(locale, 'guides');
  const routes: Route[] = [
    {
      path: getLocalizedPagePath(locale, 'home'),
      pathMatch: 'full',
      loadComponent: () => import('./home/home').then((m) => m.Home),
    },
    {
      path: massagesPath,
      pathMatch: 'full',
      loadComponent: () =>
        import('./services/services-catalog').then((m) => m.ServicesCatalog),
    },
    {
      path: getLocalizedPagePath(locale, 'packs'),
      pathMatch: 'full',
      loadComponent: () => import('./packs/packs').then((m) => m.Packs),
    },
    {
      path: guidesPath,
      pathMatch: 'full',
      loadComponent: () =>
        import('./guides/guides-index/guides-index').then((m) => m.GuidesIndex),
    },
    {
      path: `${guidesPath}/:slug`,
      resolve: { guide: guideResolver },
      loadComponent: () =>
        import('./guides/guide-detail/guide-detail').then((m) => m.GuideDetail),
    },
    {
      path: `${massagesPath}/:slug`,
      resolve: { service: serviceResolver },
      loadComponent: () =>
        import('./services/service-detail/service-detail').then(
          (m) => m.ServiceDetail,
        ),
    },
    {
      path: getLocalizedPagePath(locale, 'book'),
      loadComponent: () => import('./booking/booking').then((m) => m.Booking),
    },
    {
      path: getLocalizedPagePath(locale, 'privacy'),
      data: { legalDocument: 'privacy' },
      loadComponent: () =>
        import('./legal/legal-page').then((m) => m.LegalPage),
    },
    {
      path: getLocalizedPagePath(locale, 'bookingTerms'),
      data: { legalDocument: 'bookingTerms' },
      loadComponent: () =>
        import('./legal/legal-page').then((m) => m.LegalPage),
    },
    {
      path: getLocalizedPagePath(locale, 'legalNotice'),
      data: { legalDocument: 'legalNotice' },
      loadComponent: () =>
        import('./legal/legal-page').then((m) => m.LegalPage),
    },
    {
      path: 'design-system',
      loadComponent: () =>
        import('./design-system/design-system').then((m) => m.DesignSystem),
    },
  ];

  const legacyMassagePaths =
    locale === 'pt' ? ['servicos', 'services'] : ['services'];
  for (const legacyPath of legacyMassagePaths) {
    routes.push(
      { path: legacyPath, pathMatch: 'full', redirectTo: massagesPath },
      {
        path: `${legacyPath}/:slug`,
        redirectTo: `${massagesPath}/:slug`,
      },
    );
  }

  if (locale === 'pt') {
    routes.push(
      { path: 'book', pathMatch: 'full', redirectTo: 'marcar' },
      { path: 'privacy', pathMatch: 'full', redirectTo: 'privacidade' },
      {
        path: 'booking-terms',
        pathMatch: 'full',
        redirectTo: 'termos-de-marcacao',
      },
      {
        path: 'legal-information',
        pathMatch: 'full',
        redirectTo: 'informacao-legal',
      },
    );
  }

  routes.push({
    path: '**',
    loadComponent: () =>
      import('./not-found/not-found').then((m) => m.NotFound),
  });

  return routes;
}

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: DEFAULT_LOCALE_PATH },
  ...SUPPORTED_LOCALES.map(
    (locale): Route => ({
      path: locale.path,
      data: { localePath: locale.path },
      children: localizedRoutes(locale.path),
    }),
  ),
  {
    path: '**',
    loadComponent: () =>
      import('./not-found/not-found').then((m) => m.NotFound),
  },
];
