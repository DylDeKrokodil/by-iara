import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CustomerSearchPage } from './customer.models';

@Injectable({ providedIn: 'root' })
export class CustomersApi {
  private readonly http = inject(HttpClient);

  search(email: string, page = 0, size = 20): Observable<CustomerSearchPage> {
    const params = new HttpParams()
      .set('email', email)
      .set('page', page)
      .set('size', size);
    return this.http.get<CustomerSearchPage>('/api/admin/customers', {
      params,
    });
  }

  anonymise(customerId: string): Observable<void> {
    return this.http.delete<void>(
      `/api/admin/customers/${customerId}/personal-data`,
    );
  }
}
