import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import {
  AuthService,
  LoginRequiredError
} from './auth-service';
import { ConfigService } from './config-service';
import {
  GoogleCalendarService,
  IEvent
} from './google-cal.service';

const tokenUrl = 'https://oauth2.googleapis.com/token';
const isCalendarList = (req: { url: string }) => req.url.startsWith('https://www.googleapis.com/calendar/v3/users/me/calendarList');
const isEvents = (id: string) => (req: { url: string }) => req.url.startsWith(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(id)}/events`);

describe('Google Calendar tokens', () => {
  let http: HttpTestingController;

  function storeTokens(access: string | null, expiresInMs: number, refresh: string | null) {
    if (access != null) localStorage.setItem('access_token', access);
    localStorage.setItem('token_expiry', new Date(Date.now() + expiresInMs).toISOString());
    if (refresh != null) localStorage.setItem('refresh_token', refresh);
  }

  function respondToRefresh(accessToken: string) {
    const req = http.expectOne(tokenUrl);
    expect(req.request.body).toMatchObject({ grant_type: 'refresh_token', refresh_token: 'refresh', client_id: 'id', client_secret: 'secret' });
    req.flush({ access_token: accessToken, expires_in: 3599, scope: '', token_type: 'Bearer' });
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfigService, useValue: { getConfig: () => ({ googleApi: { clientId: 'id', clientSecret: 'secret' } }) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('AuthService.getAccessToken', () => {
    it('uses the stored access token while it is valid', async () => {
      storeTokens('access', 30 * 60_000, 'refresh');
      expect(await firstValueFrom(TestBed.inject(AuthService).getAccessToken())).toBe('access');
    });

    it('refreshes an expired access token and keeps the refresh token', async () => {
      storeTokens('old', -1000, 'refresh');
      const token = firstValueFrom(TestBed.inject(AuthService).getAccessToken());
      respondToRefresh('new');

      expect(await token).toBe('new');
      expect(localStorage.getItem('access_token')).toBe('new');
      expect(localStorage.getItem('refresh_token')).toBe('refresh');
      expect(new Date(localStorage.getItem('token_expiry')!).getTime()).toBeGreaterThan(Date.now() + 55 * 60_000);
    });

    it('refreshes when the access token is missing but the refresh token is not', async () => {
      storeTokens(null, 0, 'refresh');
      const token = firstValueFrom(TestBed.inject(AuthService).getAccessToken());
      respondToRefresh('new');
      expect(await token).toBe('new');
    });

    it('needs a login, and forgets the tokens, when Google rejects the refresh token', async () => {
      storeTokens('old', -1000, 'refresh');
      const token = firstValueFrom(TestBed.inject(AuthService).getAccessToken());
      http.expectOne(tokenUrl).flush({ error: 'invalid_grant' }, { status: 400, statusText: 'Bad Request' });

      await expect(token).rejects.toBeInstanceOf(LoginRequiredError);
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });

    it('keeps the refresh token when the refresh fails for another reason', async () => {
      storeTokens('old', -1000, 'refresh');
      const token = firstValueFrom(TestBed.inject(AuthService).getAccessToken());
      http.expectOne(tokenUrl).error(new ProgressEvent('error'));

      const err = await token.catch(e => e);
      expect(err).not.toBeInstanceOf(LoginRequiredError);
      expect(localStorage.getItem('refresh_token')).toBe('refresh');
    });
  });

  describe('GoogleCalendarService.fetchEvents', () => {
    const event = (id: string, dateTime: string) => ({ id, summary: id, start: { dateTime }, end: { dateTime } }) as unknown as IEvent;
    const calendars = { items: [
      { id: 'me@example.com', summary: 'me@example.com', accessRole: 'owner' },
      { id: 'team#shared@group.calendar.google.com', summary: 'Team', accessRole: 'writer' },
    ] };

    function fetch() {
      const emitted: IEvent[][] = [];
      const onLoginRequired = vi.fn();
      TestBed.inject(GoogleCalendarService).fetchEvents(onLoginRequired).subscribe(v => emitted.push([...v]));
      return { emitted, onLoginRequired };
    }

    it('gets a new access token and tries again when Google answers 401', () => {
      storeTokens('revoked', 30 * 60_000, 'refresh');
      const { emitted, onLoginRequired } = fetch();

      http.expectOne(isCalendarList).flush({}, { status: 401, statusText: 'Unauthorized' });
      respondToRefresh('new');
      const list = http.expectOne(isCalendarList);
      expect(list.request.headers.get('Authorization')).toBe('Bearer new');
      list.flush({ items: [calendars.items[0]] });
      http.expectOne(isEvents('me@example.com')).flush({ items: [event('standup', '2026-10-14T09:00:00Z')] });

      expect(emitted.at(-1)?.map(e => e.id)).toEqual(['standup']);
      expect(onLoginRequired).not.toHaveBeenCalled();
    });

    it('skips a calendar that fails without logging out', () => {
      storeTokens('access', 30 * 60_000, 'refresh');
      const { emitted, onLoginRequired } = fetch();

      http.expectOne(isCalendarList).flush(calendars);
      http.expectOne(isEvents('team#shared@group.calendar.google.com')).flush({}, { status: 404, statusText: 'Not Found' });
      http.expectOne(isEvents('me@example.com')).flush({ items: [event('lunch', '2026-10-14T12:00:00Z')] });

      expect(emitted.at(-1)?.map(e => e.id)).toEqual(['lunch']);
      expect(onLoginRequired).not.toHaveBeenCalled();
      expect(localStorage.getItem('access_token')).toBe('access');
    });

    it('keeps the tokens and asks for no login when Google is unreachable', () => {
      storeTokens('access', 30 * 60_000, 'refresh');
      const { emitted, onLoginRequired } = fetch();

      http.expectOne(isCalendarList).error(new ProgressEvent('error'));

      expect(emitted).toEqual([]);
      expect(onLoginRequired).not.toHaveBeenCalled();
      expect(localStorage.getItem('access_token')).toBe('access');
      expect(localStorage.getItem('refresh_token')).toBe('refresh');
    });

    it('asks for a login when there are no tokens at all', () => {
      const { onLoginRequired } = fetch();
      expect(onLoginRequired).toHaveBeenCalledOnce();
    });
  });
});
