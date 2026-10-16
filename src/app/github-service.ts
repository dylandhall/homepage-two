import { HttpClient } from '@angular/common/http';
import {
  inject,
  Injectable
} from '@angular/core';
import {
  EMPTY,
  map,
  Observable
} from 'rxjs';
import { ConfigService } from './config-service';
import { getCustomisedQueries } from './github-constants';
import { IData } from './github-types';

interface IGraphQlResponse<T> {
  data: T;
  errors?: { message: string }[];
}

@Injectable({
  providedIn: 'root'
})
export class GithubService {
  private readonly graphQlUrl = 'https://api.github.com/graphql';
  private http = inject(HttpClient);
  private readonly config = inject(ConfigService).getConfig();

  public getRepositoryInfo(): Observable<IData> {
    const githubQuery = this.config.githubQuery;
    if (githubQuery?.githubToken == null) return EMPTY;

    const query = getCustomisedQueries(githubQuery.owner, githubQuery.repo, githubQuery.username);
    return this.http.post<IGraphQlResponse<IData>>(this.graphQlUrl, { query }, {
      headers: { 'Authorization': `Bearer ${githubQuery.githubToken}` }
    }).pipe(
      map(res => {
        if (res.errors?.length) throw new Error(res.errors[0].message);
        return res.data;
      }),
    );
  }
}
