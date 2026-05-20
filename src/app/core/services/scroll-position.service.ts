import { DestroyRef, inject, Injectable } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class ScrollPositionService {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly positions = new Map<string, number>();
  private currentPath = '';

  constructor() {
    this.currentPath = this.router.url;

    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationStart || e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((e) => {
        if (e instanceof NavigationStart) {
          this.positions.set(this.currentPath, window.scrollY);
        } else if (e instanceof NavigationEnd) {
          this.currentPath = e.urlAfterRedirects;
          const saved = this.positions.get(this.currentPath) ?? 0;
          setTimeout(() => window.scrollTo(0, saved), 0);
        }
      });
  }
}
