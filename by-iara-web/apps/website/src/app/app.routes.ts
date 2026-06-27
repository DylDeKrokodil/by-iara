import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () => import('./home/home').then((m) => m.Home),
  },
  {
    path: 'services',
    loadComponent: () =>
      import('./services/services-catalog').then((m) => m.ServicesCatalog),
  },
  { path: '**', redirectTo: '' },
];
