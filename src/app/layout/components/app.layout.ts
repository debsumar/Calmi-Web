import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { LucideDynamicIcon } from '@lucide/angular';
import { AppTopbar } from './app.topbar';
import { ChatWidgetComponent } from '@/features/chat/chat-widget.component';
import { ScrollPositionService } from '@/core/services/scroll-position.service';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, LucideDynamicIcon, AppTopbar, ChatWidgetComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div id="calmi-app-shell" class="min-h-screen flex flex-col bg-canvas">
      @if (showsDownloadBanner()) {
        <a routerLink="/download"
           aria-label="Download App"
           class="flex w-full items-center justify-center gap-2 border-b border-hairline bg-sunken px-4 py-2 text-sm font-semibold text-brand-deep transition-colors hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset">
          <svg [lucideIcon]="'smartphone'" [size]="16" aria-hidden="true"></svg>
          <span>Download App</span>
        </a>
      }
      <app-topbar class="sticky top-0 z-50 w-full" />
      <main class="flex-1">
        <router-outlet />
      </main>
    </div>
    <app-chat-widget />
  `,
})
export class AppLayout {
  private readonly router = inject(Router);
  private readonly _ = inject(ScrollPositionService);
  private readonly routeUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly showsDownloadBanner = computed(() => {
    const path = this.routeUrl().split(/[?#]/)[0];
    return path === '/home' || path === '/about';
  });
}
