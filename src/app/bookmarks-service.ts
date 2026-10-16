import { HttpClient } from '@angular/common/http';
import {
  inject,
  Injectable
} from '@angular/core';
import {
  from,
  map,
  Observable
} from 'rxjs';
import {
  BROWSER_API,
  IBrowserTopSite,
  noCacheOptions
} from './browser-api';
import { IBookmark } from './types';

// Firefox's guid for the Bookmarks Toolbar folder
const toolbarId = 'toolbar_____';

// scheme, host and port, ignoring a leading www., so pages on the same site match
// (but localhost:9004 and localhost:5070 don't)
export function siteOf(url: string): string | null {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host.replace(/^www[0-9]?\./i, '')}`;
  } catch {
    return null;
  }
}

@Injectable({
  providedIn: 'root'
})
export class BookmarksService {
  private http = inject(HttpClient);
  private browserApi = inject(BROWSER_API);

  // the Firefox Bookmarks Toolbar, or the example src/bookmarks.json under ng serve
  public getToolbarBookmarks(): Observable<IBookmark[]> {
    const browserApi = this.browserApi;
    if (browserApi == null) return this.http.get<IBookmark[]>('bookmarks.json', noCacheOptions);

    return from(Promise.all([
      browserApi.bookmarks.getChildren(toolbarId),
      // Firefox's most visited pages come with the icons it has cached for them; without the
      // topSites permission (or if it fails) the icons just come from the other sources
      browserApi.topSites.get({ limit: 100, onePerDomain: false, includeFavicon: true, includeBlocked: true })
        .catch(() => <IBrowserTopSite[]>[]),
    ])).pipe(
      map(([children, topSites]) => children
        .filter(c => c.url)
        .map(c => {
          const bookmark: IBookmark = { name: c.title, url: c.url! };
          const favicon = BookmarksService.findFavicon(c.url!, topSites);
          if (favicon) bookmark.favicon = favicon;
          return bookmark;
        })),
    );
  }

  // the icon for the same page if it's a top site, otherwise for the most visited page on the same site
  private static findFavicon(url: string, topSites: IBrowserTopSite[]): string | null {
    const withIcons = topSites.filter(t => t.favicon);
    const site = siteOf(url);
    return (withIcons.find(t => t.url === url) ?? withIcons.find(t => site != null && siteOf(t.url) === site))?.favicon ?? null;
  }
}
