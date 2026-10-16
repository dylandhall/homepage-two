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
  IBrowserApi,
  IBrowserTopSite
} from './browser-api';
import { ConfigService } from './config-service';
import { WallpaperService } from './wallpaper-service';

// The services when running as the Firefox extension, with a fake `browser` API
describe('running as the Firefox extension', () => {
  let stored: Record<string, unknown>;
  let topSites: IBrowserTopSite[] | Error;
  let browserApi: IBrowserApi;

  beforeEach(() => {
    stored = {};
    topSites = [];
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
      topSites: {
        get: async () => {
          if (topSites instanceof Error) throw topSites;
          return topSites;
        },
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

  describe("with Firefox's cached icons from top sites", () => {
    const toolbar = (...urls: string[]) => {
      browserApi.bookmarks.getChildren = async () => urls.map((url, i) => ({ id: `${i}`, title: `B${i}`, url }));
    };
    const favicons = async () => (await firstValueFrom(TestBed.inject(BookmarksService).getToolbarBookmarks())).map(b => b.favicon);

    it('uses the icon for the same page', async () => {
      toolbar('https://mail.google.com/mail/u/0/#inbox');
      topSites = [
        { url: 'https://mail.google.com/', favicon: 'data:root' },
        { url: 'https://mail.google.com/mail/u/0/#inbox', favicon: 'data:inbox' },
      ];
      expect(await favicons()).toEqual(['data:inbox']);
    });

    it('otherwise uses the most visited page on the same site, ignoring www.', async () => {
      toolbar('https://www.github.com/org/repo/projects/1');
      topSites = [
        { url: 'https://gitlab.com/', favicon: 'data:gitlab' },
        { url: 'https://github.com/org/repo/pulls', favicon: 'data:github' },
        { url: 'https://github.com/', favicon: 'data:github-root' },
      ];
      expect(await favicons()).toEqual(['data:github']);
    });

    it('keeps sites on different ports apart, and skips top sites without an icon', async () => {
      toolbar('http://localhost:9004/', 'http://127.0.0.1:5070/');
      topSites = [
        { url: 'http://localhost:5070/', favicon: 'data:other-port' },
        { url: 'http://127.0.0.1:5070/chat', favicon: null },
        { url: 'http://127.0.0.1:5070/', favicon: 'data:llama' },
      ];
      expect(await favicons()).toEqual([undefined, 'data:llama']);
    });

    it('still returns the bookmarks when top sites are unavailable', async () => {
      toolbar('https://mail.google.com/');
      topSites = new Error('Missing permission topSites');
      expect(await favicons()).toEqual([undefined]);
    });
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
