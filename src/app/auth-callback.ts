import {
  Component,
  inject,
  OnDestroy,
  OnInit
} from '@angular/core';
import {
  ActivatedRoute,
  Router
} from '@angular/router';
import {
  filter,
  map,
  Subject,
  switchMap,
  takeUntil
} from 'rxjs';
import { AuthService } from './auth-service';

@Component({
  template: '<p>Authenticating...</p>',
})
export class AuthCallbackComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private router = inject(Router);

  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.route.queryParams.pipe(
      filter( params => params != null && params['code'] == null),
      takeUntil(this.destroy$),
    ).subscribe(() => this.router.navigate(['/']));

    this.route.queryParams
      .pipe(
        filter(params => params != null && params['code'] != null),
        map(params => params['code']),
        switchMap(code => this.authService.getToken(code)),
        takeUntil(this.destroy$),
      ).subscribe({
        next: result => {
          this.router.navigate(['/']).then(() => {});
        },
        error: err => {
          this.authService.authorize();
        }
      });
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
  }
}
