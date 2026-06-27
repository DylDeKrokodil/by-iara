import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Service, ServiceInput } from './service.models';

@Injectable({ providedIn: 'root' })
export class ServicesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/admin/services';

  list(): Observable<Service[]> {
    return this.http.get<Service[]>(this.baseUrl);
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
