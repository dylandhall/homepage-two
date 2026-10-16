import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal
} from '@angular/core';
import { ConfigService } from './config-service';
import { HomeComponent } from './home/home.component';
import { SettingsComponent } from './settings/settings.component';

@Component({
  selector: 'app-root',
  imports: [HomeComponent, SettingsComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  // nothing saved yet (first run of the extension), so start on the settings page
  protected readonly showSettings = signal(inject(ConfigService).isEmpty());
}
