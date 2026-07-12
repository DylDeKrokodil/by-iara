import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CalendarFeedLinks, CalendarFeedStatus } from './calendar-feed.models';

@Injectable({ providedIn: 'root' })
export class CalendarFeedApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/admin/calendar-feed';

  status(): Observable<CalendarFeedStatus> {
    return this.http.get<CalendarFeedStatus>(this.baseUrl);
  }

  regenerate(): Observable<CalendarFeedLinks> {
    return this.http.post<CalendarFeedLinks>(this.baseUrl, {});
  }

  revoke(): Observable<void> {
    return this.http.delete<void>(this.baseUrl);
  }
}
