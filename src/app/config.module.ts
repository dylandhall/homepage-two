// config.module.ts

import { NgModule, APP_INITIALIZER } from '@angular/core';
import { HttpClientModule } from '@angular/common/http'; // If you haven't imported it elsewhere
import { ConfigService } from './config-service';

export function initializeConfig(configService: ConfigService) {
  return (): Promise<any> => {
    return configService.loadConfig();
  };
}

@NgModule({
  imports: [HttpClientModule], // Include HttpClientModule if it's not already imported in your AppModule
  providers: [
    ConfigService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeConfig,
      deps: [ConfigService],
      multi: true
    }
  ]
})
export class ConfigModule { }
