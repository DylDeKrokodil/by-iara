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
        path: 'guides',
        loadComponent: () =>
          import('./guides/guides-list/guides-list').then((m) => m.GuidesList),
      },
      {
        path: 'guides/new',
        loadComponent: () =>
          import('./guides/guide-form/guide-form').then((m) => m.GuideForm),
      },
      {
        path: 'images',
        loadComponent: () =>
          import('./media/media-library/media-library').then(
            (m) => m.MediaLibrary,
          ),
      },
      { path: 'guides/images', redirectTo: 'images', pathMatch: 'full' },
      {
        path: 'guides/:id/preview',
        loadComponent: () =>
          import('./guides/guide-preview/guide-preview').then(
            (m) => m.GuidePreview,
          ),
      },
      {
        path: 'guides/:id',
        loadComponent: () =>
          import('./guides/guide-form/guide-form').then((m) => m.GuideForm),
      },
      {
        path: 'reservations/:id',
        loadComponent: () =>
          import('./reservations/reservation-detail/reservation-detail').then(
            (m) => m.ReservationDetail,
          ),
      },
      {
        path: 'reservations',
        loadComponent: () =>
          import('./reservations/reservations').then((m) => m.Reservations),
      },
      {
        path: 'customers',
        loadComponent: () =>
          import('./customers/customers').then((m) => m.Customers),
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
      {
        path: 'availability',
        loadComponent: () =>
          import('./availability/availability').then((m) => m.Availability),
      },
      {
        path: 'packs',
        loadComponent: () => import('./packs/packs').then((m) => m.Packs),
      },
      {
        path: 'discounts',
        loadComponent: () =>
          import('./discounts/discounts').then((m) => m.Discounts),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./finance/reports/reports').then((m) => m.Reports),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./settings/settings').then((m) => m.Settings),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];
