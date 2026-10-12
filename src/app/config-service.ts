// config.service.ts
import {
  inject,
  Injectable
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  catchError,
  firstValueFrom,
  of
} from 'rxjs';
import {
  BROWSER_API,
  noCacheOptions
} from './browser-api';
import { IConfig } from './types';

const storageKey = 'config';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  private http = inject(HttpClient);
  private browserApi = inject(BROWSER_API);

  private config: IConfig = {};

  public async loadConfig(): Promise<void> {
    this.config = await this.loadSavedConfig() ?? await this.loadConfigFile() ?? {};
  }

  public async saveConfig(config: IConfig): Promise<void> {
    if (this.browserApi != null) await this.browserApi.storage.local.set({ [storageKey]: config });
    else localStorage.setItem(storageKey, JSON.stringify(config));
    this.config = config;
  }

  public getConfig():IConfig{
    return {...this.config};
  }

  public isEmpty(): boolean {
    return Object.keys(this.config).length === 0;
  }

  // settings saved from the settings page: extension storage, or localStorage under ng serve
  private async loadSavedConfig(): Promise<IConfig | null> {
    if (this.browserApi == null) {
      const saved = localStorage.getItem(storageKey);
      return saved != null ? JSON.parse(saved) : null;
    }
    return ((await this.browserApi.storage.local.get(storageKey))[storageKey] as IConfig | undefined) ?? null;
  }

  // src/config.json is only included in development builds, it's never packaged in the extension
  private loadConfigFile(): Promise<IConfig | null> {
    return firstValueFrom(this.http.get<IConfig>('config.json', noCacheOptions).pipe(
      catchError(() => of(null)),
    ));
  }
}
