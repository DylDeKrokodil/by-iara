import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MediaAsset } from './media.models';

@Injectable({ providedIn: 'root' })
export class MediaApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/admin/media';

  list(): Observable<MediaAsset[]> {
    return this.http.get<MediaAsset[]>(this.baseUrl);
  }

  upload(image: File): Observable<MediaAsset> {
    const form = new FormData();
    form.append('image', image, image.name);
    return this.http.post<MediaAsset>(this.baseUrl, form);
  }

  download(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob' });
  }
}
