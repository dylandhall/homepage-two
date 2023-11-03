import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Apollo } from 'apollo-angular';
import {
  BehaviorSubject,
  catchError,
  debounceTime,
  delay,
  filter,
  from,
  interval,
  map,
  merge,
  mergeMap,
  Observable,
  of,
  scan,
  shareReplay,
  startWith,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import { AuthService } from '../auth-service';
import { ConfigService } from '../config-service';
import {
  getCustomisedQueries
} from '../github-constants';
import {
  GitIssue,
  ICard,
  IData,
  IGitPr,
} from '../github-types';
import {
  GoogleCalendarService,
  IEvent
} from '../google-cal.service';
import {
  ApiResponse,
  CurrentWeather,
  DailyData,
  DailyForecast,
  daysOfWeek,
  IBookmarksFile,
  IConfig,
  Item,
  ItemWithFeed,
  IWallpaper,
  oneHour,
  twelveHours,
  WeatherIconMap,
} from '../types';
import {
  RssService
} from '../rssService.component';
import { WeatherService } from '../weather-service';

function getFilteredCachedShareableFromApi<T1, T2>(cacheKey:string,inPipe: Observable<T1>, project: (result: T1) => T2, destroy$: Observable<void>): Observable<T2> {
  return getCachedShareableFromApi(cacheKey,inPipe, project, destroy$).pipe(
    filter(v => v != null),
    map(v => v!),
    takeUntil(destroy$)
  );
}

function getCachedShareableFromApi<T1, T2>(cacheKey:string, inPipe: Observable<T1>, project: (result: T1) => T2, destroy$: Observable<void>): Observable<T2 | null> {
  const cachedStr = localStorage.getItem(cacheKey);

  const obs$ = getShareableFromApi(inPipe, project, destroy$);

  obs$.subscribe(v => localStorage.setItem(cacheKey, JSON.stringify(v)));

  return obs$.pipe(
    startWith(cachedStr != null ? JSON.parse(cachedStr) as T2 : null),
    takeUntil(destroy$),
  );
}
function getShareableFromApi<T1, T2>(inPipe: Observable<T1>, project: (result: T1) => T2, destroy$: Observable<void>): Observable<T2> {
  return inPipe.pipe(
    map(project),
    shareReplay({ bufferSize: 1, refCount: true }),
    takeUntil(destroy$),
  );
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit, OnDestroy {
  private gql = inject(Apollo);
  private http = inject(HttpClient);
  private rss = inject(RssService);
  private cal = inject(GoogleCalendarService);
  private authService = inject(AuthService);
  private configService = inject(ConfigService);
  private weatherService = inject(WeatherService);

  public showEvents$!: Observable<boolean>;
  public noEvents$!: Observable<boolean>;
  public myIssues$!: Observable<GitIssue[]>;
  public prs$!: Observable<IGitPr[]>;
  public todayEvents$!: Observable<IEvent[]>;
  public tomorrowEvents$!: Observable<IEvent[]>;
  public laterEvents$!: Observable<IEvent[]>;
  public cards$!: Observable<ICard[]>;
  public time$!: Observable<string>;
  public date$!: Observable<string>;
  public weather$!: Observable<CurrentWeather>;
  public weatherForecast$!: Observable<DailyForecast>;
  public weatherChange$!: Observable<string | null>;
  public wallpaperDescription$!: Observable<string>;

  public selectedItemSource$: Subject<ItemWithFeed | null> = new Subject<ItemWithFeed | null>();
  public selectedItem$!: Observable<ItemWithFeed | null>;
  public noItemAfterDelay$!: Observable<boolean>;
  //public showArticle$ = new BehaviorSubject<boolean>(false);
  public showLogin$ = new BehaviorSubject<boolean>(false);
  public news$!: Observable<ItemWithFeed[]>;

  private readonly destroy$: Subject<void> = new Subject<void>();

  public readonly weatherIcons: WeatherIconMap = {
    'clear-day': 'clear_day',
    'clear-night': 'clear_night',
    'rain': 'rainy',
    'snow': 'ac_unit',
    'sleet': 'rainy_snow',
    'wind': 'air',
    'fog': 'fog',
    'cloudy': 'cloud',
    'partly-cloudy-day': 'partly_cloudy_day',
    'partly-cloudy-night': 'partly_cloudy_night'
  };

  private onGqlError = new Subject<void>();

  private readonly numberOfArticles = 30;

  private readonly config = this.configService.getConfig();

  private readonly noCacheOptions = {headers:{
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Expires': '0'
    }};

  public ngOnInit(): void {

    const events$ = interval(240000).pipe(
      startWith(0),
      switchMap(() => getFilteredCachedShareableFromApi('events', this.cal.fetchEvents(() => {
        this.showLogin$.next(true);
        localStorage.removeItem('access_token');
      }), r => r, this.destroy$)),
      map(v => {
        const now = new Date();
        return v?.filter(e => e.start?.dateTime != null && new Date(e.end.dateTime) >= now);
      }),
      shareReplay({ refCount: true, bufferSize: 1 }),
      takeUntil(this.destroy$),
    );

    this.showEvents$ = events$.pipe(
      map(v => v !== null),
      takeUntil(this.destroy$),
    );

    this.noEvents$ = events$.pipe(
      map(v => v !== null && v.length === 0),
      startWith(false),
      takeUntil(this.destroy$),
    );

    this.todayEvents$ = events$.pipe(
      map(v => {
        const now = new Date();
        now.setHours(24,0,0,0);
        return {events:v, time:now};
      }),
      map(v => v?.events?.filter(e => new Date(e.start!.dateTime!) < v.time)),
      filter(v => v?.length > 0),
      takeUntil(this.destroy$),
    );


    this.tomorrowEvents$ = events$.pipe(
      map(v => {
        const fromTime = new Date();
        fromTime.setHours(24,0,0,0);
        const toTime = new Date(fromTime.getTime() + 24 * 60 * 60 * 1000);
        return {events:v, fromTime, toTime};
      }),
      map(v => v?.events?.filter(e => {const d = new Date(e.start!.dateTime!); return d < v.toTime && d >= v.fromTime; })),
      filter(v => v?.length > 0),
      takeUntil(this.destroy$),
    );


    this.laterEvents$ = events$.pipe(
      map(v => {
        let fromTime = new Date();
        fromTime.setHours(24,0,0,0);
        fromTime = new Date(fromTime.getTime() + 24 * 60 * 60 * 1000);
        return {events:v, fromTime};
      }),
      map(v => v?.events?.filter(e => {const d = new Date(e.start!.dateTime!); return d > v.fromTime; })),
      filter(v => v?.length > 0),
      takeUntil(this.destroy$),
    );


    if (this.config.githubQuery?.githubToken != null) {
      this.getGithubInfo(this.config);
      this.onGqlError.pipe(
        debounceTime(5_000)
      ).subscribe(v => {
        this.getGithubInfo(this.config);
      });
    }

    this.cards$ = this.http.get<IBookmarksFile>('Bookmarks', this.noCacheOptions).pipe(
      map(bm => bm.roots.bookmark_bar.children
        .filter(c => c.url)
        .map(c => {
          const card = { ...c };
          const hostName = HomeComponent.getHostName(card.url);
          if (hostName != null && (this.config.knownIcons != null && this.config.knownIcons[hostName])) {//(this.knownIcons[hostName] || config.knownIcons[hostName])) {
            card.iconUrl = this.config.knownIcons[hostName];
          } else {
            card.iconUrl = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${hostName}&size=64`;
            //card.iconUrl = `https://www.google.com/s2/favicons?sz=64&domain_url=${hostName}`;
          }
          return card;
        })
      ),
      shareReplay({ bufferSize: 1, refCount: true }),
      takeUntil(this.destroy$),
    );

    this.selectedItem$ = this.selectedItemSource$.pipe(
      scan((acc: ({ item: ItemWithFeed | null, shouldNull: boolean }), value: ItemWithFeed | null) => {
        if (!(value != null && acc.item != null && value.guid === acc.item.guid))
          return { item: value, shouldNull: false };
        acc.shouldNull = !acc.shouldNull;
        return acc;
      }, ({ item: <ItemWithFeed | null>null, shouldNull: false })),
      map(({ item, shouldNull }) => shouldNull ? null : item),
      shareReplay({ bufferSize: 1, refCount: true }),
      takeUntil(this.destroy$),
    );
    this.noItemAfterDelay$ = merge(
      this.selectedItem$.pipe(
        filter(v => v==null),
        map(() => true),
        startWith(true),
        takeUntil(this.destroy$),
      ),
      this.selectedItem$.pipe(
        filter(v => v!=null),
        delay(1),
        map(() => false),
        takeUntil(this.destroy$),
      )
    );
    //this.selectedItem$.subscribe(() => this.showArticle$.next(false));
    if ((this.config?.rssSources?.length ?? 0) > 0) {
      const news$ =
        interval(600000).pipe(
          startWith(0),
          filter(v => (this.config?.rssSources?.length ?? 0) > 0),
          switchMap(() => {
            const sumOfFeeds = this.config.rssSources!.reduce((sum, source, i, arr) => sum + source.weight, 0);

            const weightValue = sumOfFeeds > this.numberOfArticles
              ? 1
              : this.numberOfArticles / sumOfFeeds;

            return from(this.config.rssSources!).pipe(
              mergeMap(rssSource => {
                let numArticles = Math.round(weightValue * rssSource.weight);

                return this.rss.getFeedContent(rssSource.url, numArticles > 0 ? numArticles : 1).pipe(
                  catchError(() => of({ 'status': 'error', 'items': [] as Item[], 'feed': null } as ApiResponse)),
                  filter(v => v.status === 'ok' && v.items?.length > 0),
                  map(v => v.items.map(i => (<ItemWithFeed>{ ...i, feed: v.feed }))),
                  takeUntil(this.destroy$),
                )
              }),
              scan((acc, result) => ([...acc, ...result]), <ItemWithFeed[]>[]),
              map(arr =>
                arr.reduce((acc, curr) => {
                  if (!acc.some(item => item.link === curr.link)) {
                    acc.push(curr);
                  }
                  return acc;
                }, <ItemWithFeed[]>[])),
              map(v => {
                v.sort((a, b) => b.pubDate.localeCompare(a.pubDate));
                return v;
              })
            );
          }),
          map(v => v.slice(0,22)),
          shareReplay({ bufferSize: 1, refCount: true }),
          takeUntil(this.destroy$),
        );
      this.news$ = getFilteredCachedShareableFromApi('news', news$, r => r, this.destroy$);
    }
    const currentDate$ = interval(1000).pipe(
      startWith(0),
      map(() => new Date()),
      shareReplay({ bufferSize: 1, refCount: true }),
      takeUntil(this.destroy$),
    );
    this.time$ = currentDate$.pipe(
      map(now => `${now.getHours()} : ${now.getMinutes() < 10 ? '0' : ''}${now.getMinutes()}`),
      takeUntil(this.destroy$),
    );
    this.date$ = currentDate$.pipe(
      map(now => now.toLocaleDateString('en-AU')),
      takeUntil(this.destroy$),
    );
    const weather$ = getShareableFromApi(
      interval(360000)
        .pipe(
          startWith(0),
          switchMap(() => this.weatherService.getPirateWeather().pipe(
            catchError(() => of(null)),
            takeUntil(this.destroy$),
          )),
          takeUntil(this.destroy$),
        ), r => r, this.destroy$);

    this.weather$ = getFilteredCachedShareableFromApi('weather', weather$, r => r!.currently!, this.destroy$);
    this.weatherForecast$ = getFilteredCachedShareableFromApi('weatherForecast', weather$, r => r!.daily!, this.destroy$);
    this.weatherChange$ = getCachedShareableFromApi('weatherChange', weather$, v => {
        if (v == null) return null;
        const time = new Date().getTime();
        const timePlus12 = (time + twelveHours) / 1000;
        const timePlus1 = (time + oneHour) / 1000;
        const matching = v?.hourly?.data.filter(h => h.summary != v?.currently?.summary && h.time <= timePlus12 && h.time > timePlus1).sort((a, b) => a?.time - b?.time);
        const m = (matching != null && matching?.length > 0)
          ? matching[0]
          : null;
        if (m == null) return null;
        const date = new Date(m!.time*1000);
        const hours = date.getHours();
        return `${m!.summary} at ${hours > 12 ? hours - 12 : hours} ${hours > 12 ? 'pm' : 'am'}`;
      }, this.destroy$);

    this.wallpaperDescription$ = this.http.get<IWallpaper>('wallpaper.json',this.noCacheOptions).pipe(
      map(v => v?.description??''),
      catchError(() => of('')),
      filter(v => v != null && v != ''),
      takeUntil(this.destroy$),
    );
  }

  public getDateStr(dateTime: string, isDateOnly: boolean): string {
    const date = new Date(dateTime);
    return isDateOnly
      ? date.toLocaleDateString('en-AU', {dateStyle:'long'})
      : (date.toLocaleDateString('en-AU', {dateStyle:'long'}) + ', ' + date.toLocaleTimeString('en-AU', {timeStyle:'short'}));
  }

  public getDayNameFromTimestamp(dateTime: number): string {
    const date = new Date(dateTime * 1000);
    return daysOfWeek[date.getDay()];
  }

  public goto(url: string): void {
    window.location.href = url;
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
  }

  public getWeatherTooltip(day: DailyData): string {
    return `${this.getDayNameFromTimestamp(day.time)}: ${day.summary}, ${Math.round(day.temperatureLow)}°C - ${Math.round(day.temperatureHigh)}°C`
  }

  private static getHostName(url: string): null | string {
    const match = url.match(/:\/\/(www[0-9]?\.)?(.[^/:]+)/i);
    if (match != null && match.length > 2 && typeof match[2] === 'string' && match[2].length > 0) {
      return match[2];
    }
    return null;
  }

  private getGithubInfo(config: IConfig) {
    if (config.githubQuery == null) return;
    const issues$ = this.gql
      .watchQuery<IData>({
        query: getCustomisedQueries(config.githubQuery.owner, config.githubQuery.repo, config.githubQuery.username),
        pollInterval: 60000
      })
      .valueChanges.pipe(
        map(v => v.data),
        shareReplay({ bufferSize: 1, refCount: true }),
        takeUntil(this.destroy$),
      );

    issues$.subscribe({ error: err => this.onGqlError.next() });

    this.myIssues$ = getFilteredCachedShareableFromApi('myIssues', issues$, v => (v?.repository?.assignedTo?.nodes ?? []).concat(v?.repository?.labeledEpic?.nodes ?? []), this.destroy$);
    this.prs$ = getFilteredCachedShareableFromApi('prs', issues$, v => v?.repository?.pullRequests?.nodes ?? [], this.destroy$);
  }

  public currentWeather(weather: CurrentWeather): string {
    let summary = `${weather.summary}, feels like ${Math.round(weather.apparentTemperature)}°C, Dewpoint: ${Math.round(weather.dewPoint)}°C, ${Math.round(weather.humidity * 100)}% humidity`;
    if (weather.uvIndex < 6) return summary;
    if (weather.uvIndex < 8) return summary + ', high UV';
    if (weather.uvIndex < 11) return summary + ', very high UV';
    if (weather.uvIndex < 13) return summary + ', extreme UV';
    return summary + ', insane UV';
  }

  public login() {
    this.authService.authorize();
  }

  protected readonly Math = Math;

  public gotoWeather(weather: CurrentWeather): void {
    window.open(`https://www.windy.com/?${this.config.location?.lat},${this.config.location?.lon}`);
  }
}

