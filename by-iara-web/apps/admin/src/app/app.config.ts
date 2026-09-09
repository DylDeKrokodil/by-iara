import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { appRoutes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { configureAdminRouteTransition } from './core/admin-motion';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      appRoutes,
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: configureAdminRouteTransition,
      }),
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
