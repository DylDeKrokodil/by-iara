import { Route } from '@angular/router';
import {
  DEFAULT_LOCALE_PATH,
  SUPPORTED_LOCALES,
} from './i18n/supported-locales';

const localizedRoutes: Route[] = [
  {
    path: '',
    loadComponent: () => import('./home/home').then((m) => m.Home),
  },
  {
    path: 'services',
    loadComponent: () =>
      import('./services/services-catalog').then((m) => m.ServicesCatalog),
  },
  {
    path: 'book',
    loadComponent: () => import('./booking/booking').then((m) => m.Booking),
  },
  {
    path: 'design-system',
    loadComponent: () =>
      import('./design-system/design-system').then((m) => m.DesignSystem),
  },
];

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: DEFAULT_LOCALE_PATH },
  ...SUPPORTED_LOCALES.map(
    (locale): Route => ({
      path: locale.path,
      children: localizedRoutes,
    }),
  ),
  { path: '**', redirectTo: DEFAULT_LOCALE_PATH },
];
