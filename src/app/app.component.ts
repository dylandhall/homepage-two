import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit
} from '@angular/core';
import { Apollo } from 'apollo-angular';
import {
  filter,
  interval,
  map,
  Observable,
  of,
  shareReplay,
  startWith,
  Subject,
  takeUntil,
  tap
} from 'rxjs';
import {
  GitIssue,
  GitLabel,
  IBookmarksFile,
  ICard,
  IData,
  IGitPr,
  IRepository,
  issuesQuery,
  prsQuery
} from './github-constants';
type KnownIconRecord = Record<string, string>;
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'home-two';
  gql = inject(Apollo);
  http = inject(HttpClient);
  public showIssues$!: Observable<boolean>;
  public showPrs$!: Observable<boolean>;
  public myIssues$!: Observable<GitIssue[]>;
  public prs$!: Observable<IGitPr[]>;
  public cards$!: Observable<ICard[]>;
  public time$!: Observable<string>;
  public date$!: Observable<string>;
  private readonly destroy$: Subject<void> = new Subject<void>();



  private readonly knownIcons: KnownIconRecord = {
    "mail.google.com": "https://img.icons8.com/fluent/32/000000/gmail.png",
    "calendar.google.com": "https://img.icons8.com/color/32/000000/google-calendar.png",
    "keep.google.com": "https://img.icons8.com/color/32/000000/google-keep.png",
    "10.1.1.198": "https://www.home-assistant.io/images/favicon.ico"
  };


  public ngOnInit(): void {

    const issues$ = this.gql
      .watchQuery<IData>({query:issuesQuery, pollInterval: 60000})
      .valueChanges.pipe(
        shareReplay({bufferSize:1 , refCount:true}),
        takeUntil(this.destroy$),
      );
    this.showIssues$ = issues$.pipe(
      map(v => ((v?.data?.repository?.issues?.nodes?.length??0)>0)),
      startWith(false),
      shareReplay({bufferSize:1 , refCount:true}),
      takeUntil(this.destroy$),
    );
    this.myIssues$ = issues$.pipe(
      filter(v => v?.error == null && ((v?.data?.repository?.issues?.nodes?.length??0)>0)),
      map(v => v.data.repository.issues.nodes),
      shareReplay({bufferSize:1 , refCount:true}),
      takeUntil(this.destroy$),
    );

    const prs$ = this.gql.watchQuery<IData>({query: prsQuery, pollInterval: 60000})
      .valueChanges.pipe(
        shareReplay({bufferSize:1 , refCount:true}),
        takeUntil(this.destroy$),
      );

    this.showPrs$ = prs$.pipe(
      map(v => ((v?.data?.repository?.pullRequests?.nodes?.length??0)>0)),
      startWith(false),
      shareReplay({bufferSize:1 , refCount:true}),
      takeUntil(this.destroy$),
    );
    this.prs$ = prs$.pipe(
      filter(v => v?.error == null && ((v?.data?.repository?.pullRequests?.nodes?.length??0)>0)),
      map(v => v.data.repository.pullRequests.nodes),
      shareReplay({bufferSize:1 , refCount:true}),
      takeUntil(this.destroy$),
    );
    this.cards$ = this.http.get('Bookmarks').pipe(
      map((bm:any) => (bm as IBookmarksFile)),
      map(bm => bm.roots.bookmark_bar.children
          .filter(c => c.url)
          .map(c => {
            const card = {...c};
            const hostName = AppComponent.getHostName(card.url);
            if (hostName != null && this.knownIcons[hostName]) {
              card.iconUrl = this.knownIcons[hostName];
            } else {
              card.iconUrl = `https://www.google.com/s2/favicons?sz=64&domain_url=${hostName}`;
            }
            return card;
        })
      ),
      shareReplay({ bufferSize: 1, refCount: true }),
      takeUntil(this.destroy$),
    );
    this.time$ = interval(1000).pipe(
      startWith(0),
      map(() => {
        const now = new Date();
        return `${now.getHours()} : ${now.getMinutes()<10?'0':''}${now.getMinutes()}`;
      }),
      takeUntil(this.destroy$),
    );
    this.date$ = interval(60000).pipe(
      startWith(0),
      map(() => {
        const now = new Date();
        return now.toLocaleDateString();
      }),
      takeUntil(this.destroy$),
    );


    document.body.style.backgroundImage = `url('https://picsum.photos/${document.documentElement.clientWidth}/${document.documentElement.clientHeight}')`;
    document.body.style.backgroundSize = 'cover';
  }
  public goto(url:string): void {
    window.open(url);
  }
  public getColour(label: GitLabel):string{
    return `#${label.color}`;
  }
  public ngOnDestroy(): void {
    this.destroy$.next();
  }

  private static getHostName(url:string): null | string {
    const match = url.match(/:\/\/(www[0-9]?\.)?(.[^/:]+)/i);
    if (match != null && match.length > 2 && typeof match[2] === 'string' && match[2].length > 0) {
      return match[2];
    }
    return null;
  }
}
