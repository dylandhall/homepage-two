import { HttpClient } from '@angular/common/http';
import {
  inject,
  Injectable
} from '@angular/core';
import {
  map,
  Observable,
  of
} from 'rxjs';
import { BROWSER_API } from './browser-api';

export interface IWallpaper {
  url: string;
  description: string | null;
}

interface IBingArchive {
  images: { urlbase: string, copyright: string }[];
}

@Injectable({
  providedIn: 'root'
})
export class WallpaperService {
  private readonly bingArchiveUrl = 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=en-US';
  private http = inject(HttpClient);
  private browserApi = inject(BROWSER_API);

  // Bing's image of the day, loaded straight from bing.com (the browser caches it for a week).
  // Bing's JSON has no CORS headers, so only the extension can read it; under ng serve use the local wallpaper.jpg
  public getWallpaper(): Observable<IWallpaper> {
    if (this.browserApi == null) return of({ url: 'wallpaper.jpg', description: null });

    return this.http.get<IBingArchive>(this.bingArchiveUrl).pipe(
      map(res => res.images[0]),
      map(image => ({ url: `https://www.bing.com${image.urlbase}_UHD.jpg`, description: image.copyright })),
    );
  }
}
