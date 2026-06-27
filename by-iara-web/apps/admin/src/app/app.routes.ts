import { Route } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () => import('./login/login').then((m) => m.Login),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/admin-layout').then((m) => m.AdminLayout),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'services',
        loadComponent: () =>
          import('./services/services-list/services-list').then(
            (m) => m.ServicesList,
          ),
      },
      {
        path: 'services/new',
        loadComponent: () =>
          import('./services/service-form/service-form').then(
            (m) => m.ServiceForm,
          ),
      },
      {
        path: 'services/:id',
        loadComponent: () =>
          import('./services/service-form/service-form').then(
            (m) => m.ServiceForm,
          ),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];
