import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Service, ServiceInput, ServiceListParams } from './service.models';

@Injectable({ providedIn: 'root' })
export class ServicesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/admin/services';

  list(filters: ServiceListParams = {}): Observable<Service[]> {
    let params = new HttpParams();

    if (filters.active !== undefined) {
      params = params.set('active', filters.active);
    }
    if (filters.query) {
      params = params.set('q', filters.query);
    }
    if (filters.sort) {
      params = params.set('sort', filters.sort);
    }
    if (filters.direction) {
      params = params.set('direction', filters.direction);
    }

    return this.http.get<Service[]>(this.baseUrl, { params });
  }

  get(id: string): Observable<Service> {
    return this.http.get<Service>(`${this.baseUrl}/${id}`);
  }

  create(input: ServiceInput): Observable<Service> {
    return this.http.post<Service>(this.baseUrl, input);
  }

  update(id: string, input: ServiceInput): Observable<Service> {
    return this.http.put<Service>(`${this.baseUrl}/${id}`, input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
