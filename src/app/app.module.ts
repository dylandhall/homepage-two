import {
  NgModule
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MatIconModule,
  MatIconRegistry
} from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  BrowserModule,
} from '@angular/platform-browser';
import { JwtModule } from '@auth0/angular-jwt';
import { ApolloModule } from 'apollo-angular';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthCallbackComponent } from './auth-callback';
import { ConfigModule } from './config.module';
import { GoogleCalendarService } from './google-cal.service';
import { GraphQLModule } from './graphql.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RssService } from './rssService.component';
import { HomeComponent } from './home/home.component';
import { WeatherService } from './weather-service';

@NgModule({
  declarations: [
    AppComponent,
    AuthCallbackComponent,
    HomeComponent
  ],
  imports: [
    BrowserModule,
    GraphQLModule,
    BrowserAnimationsModule,
    MatTooltipModule,
    MatButtonModule,
    MatIconModule,
    ConfigModule,
    ApolloModule,
    JwtModule.forRoot({
      config: {
        tokenGetter: () => {
          return localStorage.getItem('access_token');
        },
        allowedDomains: ['localhost:4200', 'localhost:9839'], // Adjust this to your domain
        disallowedRoutes: []
      }
    }),
    AppRoutingModule,
  ],
  providers: [
    RssService,
    GoogleCalendarService,
    WeatherService
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(
    private matIconRegistry: MatIconRegistry
  ) {
    this.matIconRegistry.setDefaultFontSetClass('material-symbols-outlined');
  }
}
