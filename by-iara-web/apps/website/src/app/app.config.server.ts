import {
  inject,
  mergeApplicationConfig,
  ApplicationConfig,
  REQUEST,
} from '@angular/core';
import { HTTP_TRANSFER_CACHE_ORIGIN_MAP } from '@angular/common/http';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { API_ORIGIN } from './api-origin';
import { SITE_ORIGIN } from './seo/site-origin';

const apiOrigin = process.env['API_PROXY_TARGET'] || 'http://localhost:8080';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: API_ORIGIN, useValue: apiOrigin },
    {
      provide: SITE_ORIGIN,
      useFactory: () => {
        const request = inject(REQUEST);
        return (
          process.env['PUBLIC_SITE_URL'] ||
          (request ? new URL(request.url).origin : 'https://by-iara.com')
        );
      },
    },
    {
      provide: HTTP_TRANSFER_CACHE_ORIGIN_MAP,
      useFactory: () => {
        const request = inject(REQUEST);
        const publicOrigin = request
          ? new URL(request.url).origin
          : 'http://localhost';
        return { [apiOrigin]: publicOrigin };
      },
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
