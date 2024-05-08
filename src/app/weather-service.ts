import { Injectable } from '@angular/core';
import {
  HttpClient,
} from '@angular/common/http';
import {
  Observable,
  of
} from 'rxjs';
import { ConfigService } from './config-service';
import {
  IConfig,
  WeatherApiResponse
} from './types';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {

  private readonly baseUrl = 'https://api.pirateweather.net/forecast';
  private readonly config: IConfig;

  constructor(private http: HttpClient, private configService: ConfigService) {
    this.config = this.configService.getConfig();
  }
  public getPirateWeather(): Observable<WeatherApiResponse | null> {
    if (this.config.weatherApiKey == null || this.config.location == null) return of(null);
    return this.http.get<WeatherApiResponse>(`${this.baseUrl}/${this.config.weatherApiKey}/${this.config.location.lat},${this.config.location.lon}?units=si`);
  }
}
