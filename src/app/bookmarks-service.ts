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
  noCacheOptions
} from './browser-api';
import { IBookmark } from './types';

// Firefox's guid for the Bookmarks Toolbar folder
const toolbarId = 'toolbar_____';

@Injectable({
  providedIn: 'root'
})
export class BookmarksService {
  private http = inject(HttpClient);
  private browserApi = inject(BROWSER_API);

  // the Firefox Bookmarks Toolbar, or the example src/bookmarks.json under ng serve
  public getToolbarBookmarks(): Observable<IBookmark[]> {
    if (this.browserApi == null) return this.http.get<IBookmark[]>('bookmarks.json', noCacheOptions);

    return from(this.browserApi.bookmarks.getChildren(toolbarId)).pipe(
      map(children => children
        .filter(c => c.url)
        .map(c => ({ name: c.title, url: c.url! }))),
    );
  }
}
