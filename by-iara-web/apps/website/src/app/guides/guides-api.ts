import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ORIGIN, apiUrl } from '../api-origin';
import { LocaleCode } from '../i18n/supported-locales';
import type { GuideRecord } from '@by-iara/guide-models';

export type {
  GuideBlock,
  GuideBlockType,
  GuideFaq,
  GuideImage,
  GuideImageType,
  GuideLocale,
  GuideTranslation,
} from '@by-iara/guide-models';

export interface Guide extends GuideRecord {
  status: 'PUBLISHED';
  publishedAt: string;
}

@Injectable({ providedIn: 'root' })
export class GuidesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = apiUrl(inject(API_ORIGIN), '/api/guides');

  hasPublished(): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/availability`);
  }

  list(locale: LocaleCode): Observable<Guide[]> {
    return this.http.get<Guide[]>(
      `${this.baseUrl}/${encodeURIComponent(locale)}`,
    );
  }

  get(locale: LocaleCode, slug: string): Observable<Guide> {
    return this.http.get<Guide>(
      `${this.baseUrl}/${encodeURIComponent(locale)}/${encodeURIComponent(slug)}`,
    );
  }
}
