import { HttpClient } from '@angular/common/http';
import {
  inject,
  Injectable
} from '@angular/core';
import {
  map,
  Observable,
  of,
  shareReplay,
  take,
  tap
} from 'rxjs';
import { ConfigService } from './config-service';
import { IConfig } from './types';

interface IRefreshTokenRequestBody {
  refresh_token: string;
  client_id: string;
  client_secret: string;
  grant_type: string;
}

interface IGetTokenRequestBody {
  code: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  grant_type: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly redirectUri = 'http://localhost:9839/auth/callback';
  //private redirectUri = 'http://localhost:4200/auth/callback';
  private readonly authEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly tokenEndpoint = 'https://www.googleapis.com/oauth2/v4/token';
  private http = inject(HttpClient);
  private readonly config:IConfig;
  constructor(private configService:ConfigService) {
    this.config = configService.getConfig();
  }

  authorize() {
    window.location.href = `${this.authEndpoint}?client_id=${this.config.googleApi?.clientId}&redirect_uri=${this.redirectUri}&response_type=code&scope=https://www.googleapis.com/auth/calendar.readonly&access_type=offline&approval_prompt=force`;
  }

  public checkTokenExpiryAndRefresh(): Observable<string> {
    const token = localStorage.getItem('access_token');
    const expiry = localStorage.getItem('token_expiry');

    if (token && expiry) {
      const now = new Date();
      const expiryDate = new Date(expiry);

      // If the token is still valid, return it
      if (now < expiryDate) {
        return of(token);
      }
    }

    // If there's no token or it has expired, refresh it
    return this.refreshToken().pipe(
      map(res => res.access_token)
    );
  }

  public refreshToken(): Observable<IToken> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      localStorage.removeItem('access_token');
      throw new Error('No refresh token found');
    }
    if (this.config.googleApi?.clientId == null || this.config.googleApi?.clientSecret == null) throw new Error('No google client details available');


    const body: IRefreshTokenRequestBody = {
      refresh_token: refreshToken,
      client_id: this.config.googleApi?.clientId??'',
      client_secret: this.config.googleApi?.clientSecret??'',
      grant_type: 'refresh_token'
    };

    return this.getToken$(body);
  }

  public getToken(code: string): Observable<IToken> {
    if (this.config.googleApi?.clientId == null || this.config.googleApi?.clientSecret == null) throw new Error('No google client details available');

    const body: IGetTokenRequestBody = {
      code: code,
      client_id: this.config.googleApi?.clientId??'',
      client_secret: this.config.googleApi?.clientSecret??'',
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code'
    };
    return this.getToken$(body);
  }

  private getToken$(body: IRefreshTokenRequestBody | IGetTokenRequestBody) {
    const observable$ = this.http.post<IToken>(this.tokenEndpoint, body).pipe(
      shareReplay({ refCount: true, bufferSize: 1 }),
      take(1),
    );

    observable$.subscribe(res => {
      localStorage.setItem('access_token', res.access_token);
      if (res.refresh_token) localStorage.setItem('refresh_token', res.refresh_token);

      // Calculate the expiry time and store it
      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + res.expires_in);
      localStorage.setItem('token_expiry', expiryDate.toISOString());
    });
    return observable$;
  }
}
interface IToken{
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
}
