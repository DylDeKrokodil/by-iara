import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AvailabilityBlock,
  AvailabilityRule,
  CreateBlockInput,
  CreateRuleInput,
} from './availability.models';

@Injectable({ providedIn: 'root' })
export class AvailabilityApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/admin/availability';

  // --- Rules ---

  listRules(): Observable<AvailabilityRule[]> {
    return this.http.get<AvailabilityRule[]>(`${this.baseUrl}/rules`);
  }

  createRule(input: CreateRuleInput): Observable<AvailabilityRule> {
    return this.http.post<AvailabilityRule>(`${this.baseUrl}/rules`, input);
  }

  deleteRule(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/rules/${id}`);
  }

  // --- Blocks ---

  listBlocks(startAfter?: string): Observable<AvailabilityBlock[]> {
    const options = startAfter ? { params: { startAfter } } : undefined;
    return this.http.get<AvailabilityBlock[]>(`${this.baseUrl}/blocks`, options);
  }

  createBlock(input: CreateBlockInput): Observable<AvailabilityBlock> {
    return this.http.post<AvailabilityBlock>(`${this.baseUrl}/blocks`, input);
  }

  deleteBlock(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/blocks/${id}`);
  }
}
