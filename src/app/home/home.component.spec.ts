import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ConfigService } from '../config-service';
import { IConfig } from '../types';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  async function setup(config: IConfig) {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfigService, useValue: { getConfig: () => config } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    return { fixture, http: TestBed.inject(HttpTestingController) };
  }

  it('renders bookmark cards from bookmarks.json', async () => {
    const { fixture, http } = await setup({});

    http.expectOne('bookmarks.json').flush([
      { name: 'Mail', url: 'https://mail.google.com/' },
      { name: 'Folder without url', url: '' },
    ]);
    await fixture.whenStable();

    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.card:not(.settings-button)');
    expect(cards.length).toBe(1);
    expect(cards[0].querySelector('img')?.getAttribute('alt')).toBe('Mail');
  });

  it('shows the clock', async () => {
    const { fixture } = await setup({});
    await fixture.whenStable();

    const time = (fixture.nativeElement as HTMLElement).querySelector('.time')?.textContent ?? '';
    expect(time).toMatch(/\d{1,2} : \d{2}/);
  });

  it('renders GitHub issues and PRs from the GraphQL API', async () => {
    const { fixture, http } = await setup({
      githubQuery: { githubToken: 'token', owner: 'org', repo: 'repo', username: 'me' },
    });

    const req = http.expectOne('https://api.github.com/graphql');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token');
    expect(req.request.body.query).toContain('repository(name: "repo", owner: "org")');
    req.flush({
      data: {
        repository: {
          assignedTo: { nodes: [{ id: '1', number: 42, title: 'Fix the thing', url: 'https://github.com/org/repo/issues/42', labels: { nodes: [{ name: 'bug', color: 'ff0000' }] } }] },
          labeledEpic: { nodes: [] },
          pullRequests: { nodes: [{ title: 'Add a feature', url: 'https://github.com/org/repo/pull/7', author: { login: 'someone' }, files: { totalCount: 3 } }] },
        },
      },
    });
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Fix the thing');
    expect(text).toContain('#42');
    expect(text).toContain('Add a feature');
    expect(text).toContain('someone - 3 files');
  });
});
