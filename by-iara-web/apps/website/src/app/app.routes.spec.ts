import type { Route } from '@angular/router';
import { appRoutes } from './app.routes';

function localizedRoutes(locale: 'pt' | 'en'): readonly Route[] {
  return appRoutes.find((route) => route.path === locale)?.children ?? [];
}

describe('public massage routes', () => {
  it('uses localized massage paths as the canonical routes', () => {
    expect(localizedRoutes('pt')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'massagens',
          loadComponent: expect.any(Function),
        }),
        expect.objectContaining({
          path: 'massagens/:slug',
          loadComponent: expect.any(Function),
        }),
      ]),
    );
    expect(localizedRoutes('en')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'massages',
          loadComponent: expect.any(Function),
        }),
        expect.objectContaining({
          path: 'massages/:slug',
          loadComponent: expect.any(Function),
        }),
      ]),
    );
  });

  it('redirects legacy catalog and detail routes', () => {
    expect(localizedRoutes('pt')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'servicos',
          redirectTo: 'massagens',
        }),
        expect.objectContaining({
          path: 'servicos/:slug',
          redirectTo: 'massagens/:slug',
        }),
      ]),
    );
    expect(localizedRoutes('en')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'services',
          redirectTo: 'massages',
        }),
        expect.objectContaining({
          path: 'services/:slug',
          redirectTo: 'massages/:slug',
        }),
      ]),
    );
  });
});
