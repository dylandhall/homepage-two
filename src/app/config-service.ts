// config.service.ts
import {
  inject,
  Injectable
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  filter,
  firstValueFrom,
  lastValueFrom,
  shareReplay,
  take,
  tap
} from 'rxjs';
import { IConfig } from './types';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  private http = inject(HttpClient);
  constructor() {}

  private config!:IConfig;

  public loadConfig(): Promise<any> {
    const configUrl = 'config.json';
    const config$ = this.http.get<IConfig>(configUrl, {headers:{
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0'
      }}).pipe(
      filter(v => v!=null),
      shareReplay({bufferSize:1, refCount:true}),
    );
    config$.subscribe(v => this.config=v);
    return firstValueFrom(config$);
  }

  public getConfig():IConfig{
    return {...this.config};
  }
}
