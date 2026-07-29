import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ORIGIN, apiUrl } from '../api-origin';
import { LocaleCode } from '../i18n/supported-locales';

export type GuideBlockType =
  | 'PARAGRAPH'
  | 'HEADING'
  | 'IMAGE'
  | 'LIST'
  | 'QUOTE'
  | 'CALL_TO_ACTION';

export interface GuideBlock {
  type: GuideBlockType;
  text?: string;
  headingLevel?: number;
  items?: string[];
  imageUrl?: string;
  imageAlt?: string;
  actionLabel?: string;
  actionUrl?: string;
}

export interface GuideFaq {
  question: string;
  answer: string;
}

export interface GuideTranslation {
  slug: string;
  title: string;
  excerpt: string;
  seoTitle: string;
  metaDescription: string;
  blocks: GuideBlock[];
  faqs: GuideFaq[];
}

export interface GuideImage {
  url: string;
  width: number;
  height: number;
  byteSize: number;
}

export interface Guide {
  id: string;
  status: 'PUBLISHED';
  author: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  translations: Record<string, GuideTranslation>;
  categories: string[];
  tags: string[];
  relatedServiceIds: string[];
  images: Partial<Record<'COVER' | 'SOCIAL', GuideImage>>;
}

@Injectable({ providedIn: 'root' })
export class GuidesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = apiUrl(inject(API_ORIGIN), '/api/guides');

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
