import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
  signal
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import configExample from '../../config-example.json';
import { AuthService } from '../auth-service';
import { ConfigService } from '../config-service';
import { IConfig } from '../types';

@Component({
  selector: 'app-settings',
  imports: [MatButton],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent {
  private configService = inject(ConfigService);

  public readonly closed = output<void>();

  protected readonly isFirstRun = this.configService.isEmpty();
  protected readonly configJson = signal(JSON.stringify(this.isFirstRun ? configExample : this.configService.getConfig(), null, 2));
  protected readonly error = signal<string | null>(null);
  protected readonly redirectUri = inject(AuthService).getRedirectUri();

  protected async save(): Promise<void> {
    let config: IConfig;
    try {
      config = JSON.parse(this.configJson());
    } catch (e) {
      this.error.set(`That isn't valid JSON: ${(e as Error).message}`);
      return;
    }
    await this.configService.saveConfig(config);
    // the services read the config when they're created, so start again with the new one
    location.reload();
  }
}
