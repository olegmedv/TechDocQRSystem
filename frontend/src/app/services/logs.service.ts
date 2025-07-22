import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ActivityLogsResponse, ActivityLogFilter } from '../models/document.models';

@Injectable({
  providedIn: 'root'
})
export class LogsService {
  constructor(private http: HttpClient) {}

  getActivityLogs(filter: ActivityLogFilter): Observable<ActivityLogsResponse> {
    let params = new HttpParams()
      .set('page', filter.page.toString())
      .set('pageSize', filter.pageSize.toString());

    if (filter.username) {
      params = params.set('username', filter.username);
    }
    if (filter.actionType) {
      params = params.set('actionType', filter.actionType);
    }
    if (filter.fromDate) {
      params = params.set('fromDate', filter.fromDate);
    }
    if (filter.toDate) {
      params = params.set('toDate', filter.toDate);
    }

    return this.http.get<ActivityLogsResponse>(`${environment.apiUrl}/api/logs`, {
      params,
      withCredentials: true
    });
  }

  getMyStats(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/api/logs/my-stats`, {
      withCredentials: true
    });
  }

  getActionTypes(): Observable<string[]> {
    return this.http.get<string[]>(`${environment.apiUrl}/api/logs/action-types`, {
      withCredentials: true
    });
  }
}