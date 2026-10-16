import {
  HttpClient,
  HttpErrorResponse
} from '@angular/common/http';
import {
  inject,
  Injectable
} from '@angular/core';
import {
  catchError,
  filter,
  from,
  map,
  Observable,
  of,
  switchMap,
  tap,
  throwError
} from 'rxjs';
import { BROWSER_API } from './browser-api';
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

// There's no usable refresh token (never logged in, or Google rejected it), so the user has to log in again.
// Other errors (offline, Google having a moment) are worth retrying later with the same tokens.
export class LoginRequiredError extends Error {}

// refresh a little before the access token actually expires
const expiryMarginMs = 60_000;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly authEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly tokenEndpoint = 'https://oauth2.googleapis.com/token';
  private http = inject(HttpClient);
  private browserApi = inject(BROWSER_API);
  private readonly config:IConfig;
  constructor(private configService:ConfigService) {
    this.config = configService.getConfig();
  }

  // Firefox's per-extension redirect URL (https://<hash>.extensions.allizom.org/), which must be
  // registered as an authorised redirect URI on the Google OAuth client
  public getRedirectUri(): string | null {
    return this.browserApi?.identity.getRedirectURL() ?? null;
  }

  // Logs in through a Firefox popup, then reloads so the calendar picks up the new tokens
  authorize() {
    const redirectUri = this.getRedirectUri();
    if (this.browserApi == null || redirectUri == null) {
      console.warn('Google login only works when running as the Firefox extension');
      return;
    }

    const url = `${this.authEndpoint}?client_id=${this.config.googleApi?.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/calendar.readonly&access_type=offline&prompt=consent`;
    from(this.browserApi.identity.launchWebAuthFlow({ url, interactive: true })).pipe(
      map(responseUrl => new URL(responseUrl).searchParams.get('code')),
      filter((code): code is string => code != null),
      switchMap(code => this.getToken(code, redirectUri)),
    ).subscribe({
      next: () => location.reload(),
      error: err => console.error('Google login failed', err),
    });
  }

  // A current access token, using the refresh token to get a new one when it's missing, (nearly) expired,
  // or forceRefresh is set because Google turned it down. Errors with LoginRequiredError if that's not possible.
  public getAccessToken(forceRefresh = false): Observable<string> {
    const token = localStorage.getItem('access_token');
    const expiry = localStorage.getItem('token_expiry');

    if (!forceRefresh && token && expiry && Date.now() < new Date(expiry).getTime() - expiryMarginMs) {
      return of(token);
    }

    return this.refreshToken().pipe(
      map(res => res.access_token)
    );
  }

  public refreshToken(): Observable<IToken> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return throwError(() => new LoginRequiredError('No refresh token found'));
    if (this.config.googleApi?.clientId == null || this.config.googleApi?.clientSecret == null) return throwError(() => new LoginRequiredError('No google client details available'));

    const body: IRefreshTokenRequestBody = {
      refresh_token: refreshToken,
      client_id: this.config.googleApi?.clientId??'',
      client_secret: this.config.googleApi?.clientSecret??'',
      grant_type: 'refresh_token'
    };

    return this.getToken$(body).pipe(
      catchError(err => {
        // 400 invalid_grant: the refresh token expired or was revoked; 401: the client id/secret is wrong
        if (err instanceof HttpErrorResponse && (err.status === 400 || err.status === 401)) {
          this.clearTokens();
          return throwError(() => new LoginRequiredError(`Google refused the refresh token: ${err.error?.error ?? err.status}`));
        }
        return throwError(() => err);
      }),
    );
  }

  public clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_expiry');
  }

  public getToken(code: string, redirectUri: string): Observable<IToken> {
    if (this.config.googleApi?.clientId == null || this.config.googleApi?.clientSecret == null) return throwError(() => new Error('No google client details available'));

    const body: IGetTokenRequestBody = {
      code: code,
      client_id: this.config.googleApi?.clientId??'',
      client_secret: this.config.googleApi?.clientSecret??'',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    };
    return this.getToken$(body);
  }

  private getToken$(body: IRefreshTokenRequestBody | IGetTokenRequestBody): Observable<IToken> {
    return this.http.post<IToken>(this.tokenEndpoint, body).pipe(
      tap(res => {
        localStorage.setItem('access_token', res.access_token);
        // Google only sends a refresh token on login; refreshing keeps using the same one
        if (res.refresh_token) localStorage.setItem('refresh_token', res.refresh_token);

        // Calculate the expiry time and store it
        const expiryDate = new Date();
        expiryDate.setSeconds(expiryDate.getSeconds() + res.expires_in);
        localStorage.setItem('token_expiry', expiryDate.toISOString());
      }),
    );
  }
}
interface IToken{
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
}
