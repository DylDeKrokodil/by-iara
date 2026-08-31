import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Guide,
  GuideContentImage,
  GuideImageType,
  GuideInput,
  GuideListParams,
  GuideStatus,
} from './guide.models';

@Injectable({ providedIn: 'root' })
export class GuidesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/admin/guides';

  list(filters: GuideListParams = {}): Observable<Guide[]> {
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.query) params = params.set('q', filters.query);
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.direction) params = params.set('direction', filters.direction);
    return this.http.get<Guide[]>(this.baseUrl, { params });
  }

  get(id: string): Observable<Guide> {
    return this.http.get<Guide>(`${this.baseUrl}/${id}`);
  }

  create(input: GuideInput): Observable<Guide> {
    return this.http.post<Guide>(this.baseUrl, input);
  }

  update(id: string, input: GuideInput): Observable<Guide> {
    return this.http.put<Guide>(`${this.baseUrl}/${id}`, input);
  }

  updateStatus(ids: string[], status: GuideStatus): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/status`, { ids, status });
  }

  uploadImage(
    id: string,
    type: GuideImageType,
    image: File,
  ): Observable<Guide> {
    const form = new FormData();
    form.append('image', image, image.name);
    return this.http.put<Guide>(`${this.baseUrl}/${id}/images/${type}`, form);
  }

  useMediaImage(
    id: string,
    type: GuideImageType,
    mediaAssetId: string,
  ): Observable<Guide> {
    return this.http.put<Guide>(
      `${this.baseUrl}/${id}/images/${type}/media/${mediaAssetId}`,
      null,
    );
  }

  removeImage(id: string, type: GuideImageType): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/images/${type}`);
  }

  uploadContentImage(id: string, image: File): Observable<GuideContentImage> {
    const form = new FormData();
    form.append('image', image, image.name);
    return this.http.post<GuideContentImage>(
      `${this.baseUrl}/${id}/content-images`,
      form,
    );
  }

  useMediaContentImage(
    id: string,
    mediaAssetId: string,
  ): Observable<GuideContentImage> {
    return this.http.post<GuideContentImage>(
      `${this.baseUrl}/${id}/content-images/media/${mediaAssetId}`,
      null,
    );
  }

}
