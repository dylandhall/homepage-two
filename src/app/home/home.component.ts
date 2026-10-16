import {
  AsyncPipe,
  NgTemplateOutlet
} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  inject,
  OnDestroy,
  OnInit,
  output,
} from '@angular/core';
import { MatFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import {
  BehaviorSubject,
  catchError,
  delay,
  EMPTY,
  filter,
  from,
  interval,
  map,
  merge,
  mergeMap,
  Observable,
  of,
  retry,
  scan,
  shareReplay,
  startWith,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import { AuthService } from '../auth-service';
import {
  BookmarksService,
  siteOf
} from '../bookmarks-service';
import { ConfigService } from '../config-service';
import {
  GitIssue,
  ICard,
  IGitPr,
} from '../github-types';
import { GithubService } from '../github-service';
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
  IBookmark,
  IConfig,
  Item,
  ItemWithFeed,
  oneHour,
  twelveHours,
  WeatherIconMap,
} from '../types';
import {
  RssService
} from '../rssService.component';
import { WallpaperService } from '../wallpaper-service';
import { WeatherService } from '../weather-service';

const googleFaviconService = 'https://t1.gstatic.com/faviconV2';

function getFilteredCachedShareableFromApi$<T1, T2>(cacheKey:string,inPipe: Observable<T1>, project: (result: T1) => T2, destroy$: Observable<void>): Observable<T2> {
  return getCachedShareableFromApi$(cacheKey,inPipe, project, destroy$).pipe(
    filter(v => v != null),
    map(v => v!),
    takeUntil(destroy$)
  );
}

function getCachedShareableFromApi$<T1, T2>(cacheKey:string, inPipe: Observable<T1>, project: (result: T1) => T2, destroy$: Observable<void>): Observable<T2 | null> {
  const cachedStr = localStorage.getItem(cacheKey);

  const obs$ = getShareableFromApi$(inPipe, project, destroy$);

  obs$.subscribe(v => localStorage.setItem(cacheKey, JSON.stringify(v)));

  return obs$.pipe(
    startWith(cachedStr != null ? JSON.parse(cachedStr) as T2 : null),
    takeUntil(destroy$),
  );
}
function getShareableFromApi$<T1, T2>(inPipe: Observable<T1>, project: (result: T1) => T2, destroy$: Observable<void>): Observable<T2> {
  return inPipe.pipe(
    map(project),
    shareReplay({ bufferSize: 1, refCount: true }),
    takeUntil(destroy$),
  );
}

@Component({
  selector: 'app-home',
  imports: [AsyncPipe, NgTemplateOutlet, MatFabButton, MatIcon, MatTooltip],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit, OnDestroy {
  private github = inject(GithubService);
  private bookmarks = inject(BookmarksService);
  private rss = inject(RssService);
  private cal = inject(GoogleCalendarService);
  private authService = inject(AuthService);
  private configService = inject(ConfigService);
  private weatherService = inject(WeatherService);
  private wallpaperService = inject(WallpaperService);
  private document = inject(DOCUMENT);

  public readonly openSettings = output<void>();

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
  public timesInOtherZones$!: Observable<string[]>;

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

  private readonly numberOfArticles = 30;

  private readonly config = this.configService.getConfig();

  public ngOnInit(): void {

    const events$ = interval(240000).pipe(
      startWith(0),
      switchMap(() => getFilteredCachedShareableFromApi$('events', this.cal.fetchEvents(
        () => this.showLogin$.next(true),
      ), r => r, this.destroy$)),
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
    }

    // shown straight away from the last new tab (Firefox's icons included), then refreshed
    const bookmarks$ = getFilteredCachedShareableFromApi$('bookmarks', this.bookmarks.getToolbarBookmarks().pipe(
      catchError(() => EMPTY),
    ), r => r, this.destroy$);

    this.cards$ = bookmarks$.pipe(
      map(bm => bm
        .filter(c => c.url)
        .map(c => this.toCard(c))
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
                  if (acc.some(item => item.link.localeCompare(curr.link, 'en-AU', {sensitivity: 'base'}) === 0)) return acc;
                  acc.push(curr);
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
      this.news$ = getFilteredCachedShareableFromApi$('news', news$, r => r, this.destroy$);
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

    if ((this.config?.additionalTimezones?.length ?? 0) > 0) {
      this.timesInOtherZones$ = currentDate$.pipe(
        map(now => this.config.additionalTimezones!.map(tz =>
          `${tz.name}: ${now.toLocaleDateString('en-AU', {timeZone: tz.timezone, day: '2-digit', month: '2-digit'})} ${now.toLocaleTimeString('en-AU',  {
            timeZone: tz.timezone,
            hour: 'numeric',
            minute: '2-digit',
            hour12: false,
          })}`)),
        takeUntil(this.destroy$),
      );
    }
    const weather$ = getShareableFromApi$(
      interval(360000)
        .pipe(
          startWith(0),
          switchMap(() => this.weatherService.getPirateWeather().pipe(
            catchError(() => of(null)),
            takeUntil(this.destroy$),
          )),
          // skip failed/unconfigured fetches so the cached weather stays on screen
          filter(v => v != null),
          takeUntil(this.destroy$),
        ), r => r, this.destroy$);

    this.weather$ = getFilteredCachedShareableFromApi$('weather', weather$, r => r!.currently!, this.destroy$);
    this.weatherForecast$ = getFilteredCachedShareableFromApi$('weatherForecast', weather$, r => r!.daily!, this.destroy$);
    this.weatherChange$ = getCachedShareableFromApi$('weatherChange', weather$, v => {
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
        return `${m!.summary} at ${hours % 12 || 12} ${hours >= 12 ? 'pm' : 'am'}`;
      }, this.destroy$);

    // the cached wallpaper shows straight away, then today's replaces it once Bing responds
    const wallpaper$ = getFilteredCachedShareableFromApi$('wallpaper', this.wallpaperService.getWallpaper().pipe(
      catchError(() => EMPTY),
    ), r => r, this.destroy$);

    wallpaper$.subscribe(w => this.document.body.style.backgroundImage = `url("${w.url}")`);

    this.wallpaperDescription$ = wallpaper$.pipe(
      map(w => w.description ?? ''),
      filter(v => v != ''),
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

  // Icon sources, best first: your knownIcons override, Firefox's own cached icon, Google's favicon service,
  // then the site's /favicon.ico. The template moves along the list as they fail and ends on a letter.
  private toCard(bookmark: IBookmark): ICard {
    const hostName = HomeComponent.getHostName(bookmark.url);
    const site = siteOf(bookmark.url);
    const icons = [
      hostName != null ? this.config.knownIcons?.[hostName] : null,
      bookmark.favicon,
      hostName != null ? `${googleFaviconService}?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${hostName}&size=64` : null,
      site != null ? `${new URL(bookmark.url).origin}/favicon.ico` : null,
    ].filter((icon): icon is string => !!icon);
    return { name: bookmark.name, url: bookmark.url, icons, iconIndex: 0 };
  }

  public nextIcon(card: ICard): void {
    card.iconIndex++;
  }

  // Google's service answers sites it doesn't know with a 16px globe (a 404 that still displays),
  // so anything that small from it counts as not found
  public onIconLoad(card: ICard, event: Event): void {
    const isGoogle = card.icons[card.iconIndex]?.startsWith(googleFaviconService);
    if (isGoogle && (event.target as HTMLImageElement).naturalWidth <= 16) this.nextIcon(card);
  }

  // a steady colour per bookmark name for its letter icon
  public letterColour(name: string): string {
    let hash = 0;
    for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
    return `hsl(${Math.abs(hash) % 360}, 45%, 40%)`;
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
    const issues$ = interval(60000).pipe(
      startWith(0),
      switchMap(() => this.github.getRepositoryInfo().pipe(
        retry({ count: 3, delay: 5_000 }),
        catchError(() => EMPTY),
      )),
      shareReplay({ bufferSize: 1, refCount: true }),
      takeUntil(this.destroy$),
    );

    this.myIssues$ = getFilteredCachedShareableFromApi$('myIssues', issues$, v => (v?.repository?.assignedTo?.nodes ?? []).concat(v?.repository?.labeledEpic?.nodes ?? []), this.destroy$);
    this.prs$ = getFilteredCachedShareableFromApi$('prs', issues$, v => v?.repository?.pullRequests?.nodes ?? [], this.destroy$);
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

