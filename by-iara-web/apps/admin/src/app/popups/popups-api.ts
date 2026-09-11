import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface PopupContent {
  name: string;
  titlePt: string;
  titleEn: string;
  bodyPt: string;
  bodyEn: string;
  action: 'book' | 'services' | 'packs';
}
export interface Popup {
  id: string;
  content: PopupContent;
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class PopupsApi {
  private readonly http = inject(HttpClient);
  list() {
    return this.http.get<Popup[]>('/api/admin/popups');
  }
  save(id: string | null, content: PopupContent) {
    return id
      ? this.http.put<Popup>(`/api/admin/popups/${id}`, content)
      : this.http.post<Popup>('/api/admin/popups', content);
  }
  setActive(id: string, active: boolean) {
    return this.http.put<void>(`/api/admin/popups/${id}/active`, { active });
  }
}
