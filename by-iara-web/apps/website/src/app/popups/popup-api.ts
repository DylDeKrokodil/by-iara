import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_ORIGIN, apiUrl } from '../api-origin';

export interface PublicPopup {
  id: string;
  titlePt: string;
  titleEn: string;
  bodyPt: string;
  bodyEn: string;
  action: 'book' | 'services' | 'packs';
}

@Injectable({ providedIn: 'root' })
export class PopupApi {
  private readonly http = inject(HttpClient);
  private readonly origin = inject(API_ORIGIN);
  active() {
    return this.http.get<PublicPopup | null>(
      apiUrl(this.origin, '/api/popups/active'),
    );
  }
}
