import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  OperationalSettings,
  UpdateOperationalSettingsInput,
} from './settings.models';

@Injectable({ providedIn: 'root' })
export class SettingsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/admin/settings';

  get(): Observable<OperationalSettings> {
    return this.http.get<OperationalSettings>(this.baseUrl);
  }

  update(
    input: UpdateOperationalSettingsInput,
  ): Observable<OperationalSettings> {
    return this.http.put<OperationalSettings>(this.baseUrl, input);
  }
}
