import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Expense, ExpenseInput, ExpensePage, FinancialReport, IncomePaymentPage } from './finance.models';

@Injectable({ providedIn: 'root' })
export class FinanceApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/admin/finance';

  report(from: string, to: string, currency = 'EUR'): Observable<FinancialReport> {
    const params = new HttpParams().set('from', from).set('to', to).set('currency', currency);
    return this.http.get<FinancialReport>(`${this.baseUrl}/report`, { params });
  }

  expenses(from: string, to: string, page = 0, size = 20): Observable<ExpensePage> {
    const params = new HttpParams()
      .set('from', from)
      .set('to', to)
      .set('page', page)
      .set('size', size);
    return this.http.get<ExpensePage>(`${this.baseUrl}/expenses`, { params });
  }

  payments(from: string, to: string, currency = 'EUR', page = 0, size = 20): Observable<IncomePaymentPage> {
    const params = new HttpParams()
      .set('from', from)
      .set('to', to)
      .set('currency', currency)
      .set('page', page)
      .set('size', size);
    return this.http.get<IncomePaymentPage>(`${this.baseUrl}/payments`, { params });
  }

  createExpense(input: ExpenseInput): Observable<Expense> {
    return this.http.post<Expense>(`${this.baseUrl}/expenses`, input);
  }

  voidExpense(id: string): Observable<Expense> {
    return this.http.patch<Expense>(`${this.baseUrl}/expenses/${id}/void`, {});
  }
}
