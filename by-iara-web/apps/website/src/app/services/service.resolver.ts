import { inject } from '@angular/core';
import type { ResolveFn } from '@angular/router';
import { catchError, of } from 'rxjs';
import { getLocaleByPath } from '../i18n/supported-locales';
import type { LocalePath } from '../i18n/supported-locales';
import { Service, ServicesApi } from './services-api';

export const serviceResolver: ResolveFn<Service | null> = (route) => {
  const localePath = route.parent?.data['localePath'] as LocalePath | undefined;
  const locale = getLocaleByPath(localePath);
  const slug = route.paramMap.get('slug');

  if (!locale || !slug) {
    return null;
  }

  return inject(ServicesApi)
    .get(locale.locale, slug)
    .pipe(catchError(() => of(null)));
};
