import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { BookmarksService } from './bookmarks-service';
import {
  BROWSER_API,
  IBrowserApi
} from './browser-api';
import { ConfigService } from './config-service';
import { WallpaperService } from './wallpaper-service';

// The services when running as the Firefox extension, with a fake `browser` API
describe('running as the Firefox extension', () => {
  let stored: Record<string, unknown>;
  let browserApi: IBrowserApi;

  beforeEach(() => {
    stored = {};
    browserApi = {
      storage: {
        local: {
          get: async key => key in stored ? { [key]: stored[key] } : {},
          set: async items => { Object.assign(stored, items); },
        },
      },
      bookmarks: {
        getChildren: async id => id === 'toolbar_____'
          ? [
            { id: '1', title: 'Mail', url: 'https://mail.google.com/' },
            { id: '2', title: 'A folder' },
            { id: '3', title: 'Calendar', url: 'https://calendar.google.com/' },
          ]
          : [],
      },
      identity: {
        getRedirectURL: () => 'https://abc123.extensions.allizom.org/',
        launchWebAuthFlow: async () => 'https://abc123.extensions.allizom.org/?code=xyz',
      },
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BROWSER_API, useValue: browserApi },
      ],
    });
  });

  it('reads the Bookmarks Toolbar, skipping folders', async () => {
    const bookmarks = await firstValueFrom(TestBed.inject(BookmarksService).getToolbarBookmarks());
    expect(bookmarks).toEqual([
      { name: 'Mail', url: 'https://mail.google.com/' },
      { name: 'Calendar', url: 'https://calendar.google.com/' },
    ]);
  });

  it('uses the Bing image of the day straight from bing.com', async () => {
    const wallpaper = firstValueFrom(TestBed.inject(WallpaperService).getWallpaper());
    TestBed.inject(HttpTestingController)
      .expectOne(req => req.url.startsWith('https://www.bing.com/HPImageArchive.aspx'))
      .flush({ images: [{ urlbase: '/th?id=OHR.Somewhere_EN-US123', copyright: 'Somewhere (© Someone)' }] });

    expect(await wallpaper).toEqual({
      url: 'https://www.bing.com/th?id=OHR.Somewhere_EN-US123_UHD.jpg',
      description: 'Somewhere (© Someone)',
    });
  });

  it('keeps the config in extension storage rather than loading config.json', async () => {
    const configService = TestBed.inject(ConfigService);
    await configService.saveConfig({ weatherApiKey: 'key' });
    expect(stored['config']).toEqual({ weatherApiKey: 'key' });

    const reloaded = TestBed.runInInjectionContext(() => new ConfigService());
    await reloaded.loadConfig();
    expect(reloaded.getConfig()).toEqual({ weatherApiKey: 'key' });
    TestBed.inject(HttpTestingController).expectNone('config.json');
  });
});
