import { InjectionToken } from '@angular/core';

// The parts of Firefox's WebExtension API this page uses. They only exist when it's running as the
// extension's new tab page; under `ng serve` and in tests the services fall back to local files.
export interface IBrowserBookmark {
  id: string;
  title: string;
  url?: string;
}

export interface IBrowserTopSite {
  url: string;
  title?: string;
  // data: URL of the largest icon Firefox has cached for the page
  favicon?: string | null;
}

export interface IBrowserApi {
  storage: {
    local: {
      get(key: string): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    };
  };
  bookmarks: {
    getChildren(id: string): Promise<IBrowserBookmark[]>;
  };
  topSites: {
    get(options: { limit: number, onePerDomain: boolean, includeFavicon: boolean, includeBlocked: boolean }): Promise<IBrowserTopSite[]>;
  };
  identity: {
    getRedirectURL(): string;
    launchWebAuthFlow(details: { url: string, interactive: boolean }): Promise<string>;
  };
}

export const BROWSER_API = new InjectionToken<IBrowserApi | null>('BROWSER_API', {
  providedIn: 'root',
  factory: () => (globalThis as { browser?: IBrowserApi }).browser ?? null,
});

export const noCacheOptions = {headers:{
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Expires': '0'
  }};
