import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams
} from '@angular/common/http';
import {
  Observable
} from 'rxjs';
import { ConfigService } from './config-service';
import { ApiResponse } from './types';

@Injectable({
  providedIn: 'root'
})
export class RssService {
  private readonly rssToJsonServiceBaseUrl: string = 'https://api.rss2json.com/v1/api.json';
  private readonly apiKey:string;
  constructor(private http: HttpClient, private config: ConfigService) {
    this.apiKey = config.getConfig().rssApiKey ?? '';
  }

  public getFeedContent(url: string, count: number = 10): Observable<ApiResponse> {
    const params = new HttpParams()
      .set('rss_url', url)
      .set('api_key', this.apiKey)
      .set('count', count);

    return this.http.get<ApiResponse>(this.rssToJsonServiceBaseUrl, { params });
  }
}
