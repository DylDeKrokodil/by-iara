import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { catchError, of } from 'rxjs';
import { getLocaleByPath, LocalePath } from '../i18n/supported-locales';
import { Guide, GuidesApi } from './guides-api';

export const guideResolver: ResolveFn<Guide | null> = (route) => {
  const localePath = route.parent?.data['localePath'] as LocalePath | undefined;
  const locale = getLocaleByPath(localePath);
  const slug = route.paramMap.get('slug');
  if (!locale || !slug) return null;
  return inject(GuidesApi)
    .get(locale.locale, slug)
    .pipe(catchError(() => of(null)));
};
