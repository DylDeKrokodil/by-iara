import { Route } from '@angular/router';
import {
  DEFAULT_LOCALE_PATH,
  getLocalizedPagePath,
  SUPPORTED_LOCALES,
} from './i18n/supported-locales';
import type { LocalePath } from './i18n/supported-locales';
import { serviceResolver } from './services/service.resolver';

function localizedRoutes(locale: LocalePath): Route[] {
  const routes: Route[] = [
    {
      path: getLocalizedPagePath(locale, 'home'),
      pathMatch: 'full',
      loadComponent: () => import('./home/home').then((m) => m.Home),
    },
    {
      path: getLocalizedPagePath(locale, 'services'),
      pathMatch: 'full',
      loadComponent: () =>
        import('./services/services-catalog').then((m) => m.ServicesCatalog),
    },
    {
      path: `${getLocalizedPagePath(locale, 'services')}/:slug`,
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
      path: 'design-system',
      loadComponent: () =>
        import('./design-system/design-system').then((m) => m.DesignSystem),
    },
  ];

  if (locale === 'pt') {
    routes.push(
      { path: 'services', pathMatch: 'full', redirectTo: 'servicos' },
      { path: 'book', pathMatch: 'full', redirectTo: 'marcar' },
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
