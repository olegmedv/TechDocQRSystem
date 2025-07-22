import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SearchRequest, SearchResponse } from '../models/document.models';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  constructor(private http: HttpClient) {}

  searchDocuments(request: SearchRequest): Observable<SearchResponse> {
    return this.http.post<SearchResponse>(`${environment.apiUrl}/api/search`, request, {
      withCredentials: true
    });
  }

  searchDocumentsGet(query: string, page: number = 1, pageSize: number = 10): Observable<SearchResponse> {
    const params = new HttpParams()
      .set('query', query)
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<SearchResponse>(`${environment.apiUrl}/api/search`, {
      params,
      withCredentials: true
    });
  }
}