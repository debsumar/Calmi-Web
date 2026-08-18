import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  effect,
  ElementRef,
  HostListener,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { LucideDynamicIcon } from '@lucide/angular';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';

/** Variant C timings at the chosen 1.5x speed (520ms / 620ms base). */
const INK_DURATION_MS = 350;
const RIPPLE_DURATION_MS = 420;

@Component({
  selector: 'app-topbar',
  imports: [RouterLink, RouterLinkActive, LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <header class="h-16 flex items-center justify-between px-4 md:px-8 bg-glass backdrop-blur-md border-b border-gray-100 dark:border-white/5">
      <a routerLink="/" class="flex items-center">
        <img src="assets/logo.avif" alt="Calmi" class="h-8 md:h-10">
      </a>

      <!-- Desktop nav -->
      <nav #desktopNav class="relative hidden md:flex items-center gap-8">
        @for (link of navLinks(); track link.path) {
          <a [routerLink]="link.path" routerLinkActive="text-brand dark:text-brand-light"
             ariaCurrentWhenActive="page"
             [attr.data-nav-path]="link.path"
             class="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-brand pb-1 transition-colors duration-200">
            {{ link.label }}
          </a>
        }
        <!-- Elastic ink indicator: stretches to bridge both tabs, then contracts. -->
        <span #inkRipple aria-hidden="true"
              class="pointer-events-none absolute bottom-0 h-3 w-3 -ml-1.5 rounded-full bg-brand/30 opacity-0"></span>
        <span #inkIndicator aria-hidden="true"
              class="pointer-events-none absolute bottom-0 left-0 h-0.5 w-0 rounded-full bg-brand"></span>
      </nav>

      <div class="flex items-center gap-3">
        <div class="hidden md:block w-px h-5 bg-gray-200 dark:bg-white/10"></div>
        <button (click)="themeService.toggle()"
                class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
                [title]="'Theme: ' + themeService.mode()">
          @switch (themeService.mode()) {
            @case ('light') { <svg [lucideIcon]="'moon'" [size]="20" class="text-gray-900 dark:text-gray-100"></svg> }
            @case ('dark') { <svg [lucideIcon]="'sun'" [size]="20" class="text-gray-900 dark:text-gray-100"></svg> }
            @case ('auto') { <span aria-hidden="true" class="w-5 h-5 flex items-center justify-center text-base font-bold leading-none text-gray-900 dark:text-gray-100">A</span> }
          }
        </button>

        @if (authService.currentUser(); as user) {
          <div class="relative">
            <!-- Profile Trigger -->
            <button (click)="dropdownOpen.set(!dropdownOpen())" 
                    class="w-9 h-9 flex items-center justify-center rounded-full overflow-hidden border border-gray-200 dark:border-white/10 hover:ring-2 hover:ring-brand/50 transition-all">
              @if (user.user_metadata['avatar_url']) {
                <img [src]="user.user_metadata['avatar_url']" alt="Avatar" class="w-full h-full object-cover">
              } @else {
                <div class="w-full h-full bg-brand/20 text-brand flex items-center justify-center font-bold text-sm">
                  {{ (user.user_metadata['full_name']?.[0] || user.email?.[0] || 'U').toUpperCase() }}
                </div>
              }
            </button>

            <!-- Dropdown Menu -->
            @if (dropdownOpen()) {
              <!-- Click outside overlay to close -->
              <div class="fixed inset-0 z-10" (click)="dropdownOpen.set(false)"></div>
              
              <div class="absolute right-0 mt-2 w-56 rounded-xl bg-elevated border border-gray-100 dark:border-white/5 p-2 shadow-xl z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                <div class="px-3 py-2 border-b border-gray-100 dark:border-white/5 mb-1">
                  <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {{ user.user_metadata['full_name'] || 'User' }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {{ user.email }}
                  </p>
                </div>
                <button (click)="logout()" 
                        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors text-left">
                  <svg [lucideIcon]="'log-out'" [size]="16"></svg>
                  Logout
                </button>
              </div>
            }
          </div>
        } @else {
          <button (click)="authService.openLogin()" class="w-9 h-9 flex items-center justify-center rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:scale-105 transition-all">
            <svg [lucideIcon]="'user'" [size]="16"></svg>
          </button>
        }

        <!-- Mobile hamburger -->
        <button (click)="mobileMenuOpen.set(!mobileMenuOpen())" class="md:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
          <svg [lucideIcon]="mobileMenuOpen() ? 'x' : 'menu'" [size]="22" class="text-gray-900 dark:text-gray-100"></svg>
        </button>
      </div>
    </header>

    <!-- Mobile menu overlay -->
    @if (mobileMenuOpen()) {
      <div class="md:hidden fixed inset-0 top-16 z-40 bg-canvas p-6 flex flex-col gap-4 stagger-enter" style="--index:0">
        @for (link of navLinks(); track link.path; let i = $index) {
          <a [routerLink]="link.path" routerLinkActive="text-brand font-bold"
             (click)="mobileMenuOpen.set(false)"
             class="stagger-enter text-lg font-semibold text-gray-800 dark:text-gray-200 hover:text-brand py-2 border-b border-gray-100 dark:border-white/10"
             [style.--index]="i + 1">
            {{ link.label }}
          </a>
        }
      </div>
    }
  `,
})
export class AppTopbar {
  themeService = inject(ThemeService);
  authService = inject(AuthService);
  mobileMenuOpen = signal(false);
  dropdownOpen = signal(false);

  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly desktopNav = viewChild<ElementRef<HTMLElement>>('desktopNav');
  private readonly inkIndicator = viewChild<ElementRef<HTMLElement>>('inkIndicator');
  private readonly inkRipple = viewChild<ElementRef<HTMLElement>>('inkRipple');

  /** Last resting position, so the next move knows where to stretch from. */
  private previous: { left: number; width: number } | null = null;
  private inkAnimation: Animation | null = null;

  private readonly routeUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  private readonly currentPath = computed(() => this.routeUrl().split(/[?#]/)[0]);

  navLinks = signal([
    { path: '/home', label: 'Home' },
    { path: '/therapy', label: 'Therapy' },
    { path: '/sleep', label: 'Sleep' },
    { path: '/about', label: 'About Us' },
    { path: '/pricing', label: 'Pricing' },
  ]);

  constructor() {
    effect(() => {
      this.currentPath();
      afterNextRender({ write: () => this.moveIndicator() }, { injector: this.injector });
    });

    afterNextRender({
      write: () => {
        this.moveIndicator(true);
        // Font swap changes label metrics, so re-measure once it lands.
        this.document.fonts?.ready.then(() => this.moveIndicator(true));
      },
    });
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.moveIndicator(true);
  }

  logout(): void {
    this.authService.signOut();
    this.dropdownOpen.set(false);
  }

  private prefersReducedMotion(): boolean {
    const view = this.document.defaultView;
    return typeof view?.matchMedia === 'function'
      && view.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Moves the underline to the active link. The leading edge leaves first so the
   * line bridges both tabs mid-travel, then the trailing edge catches up.
   */
  private moveIndicator(instant = false): void {
    const nav = this.desktopNav()?.nativeElement;
    const ink = this.inkIndicator()?.nativeElement;
    if (!nav || !ink) return;

    const target = nav.querySelector<HTMLElement>(`a[data-nav-path="${this.currentPath()}"]`);
    if (!target) {
      ink.style.width = '0px';
      this.previous = null;
      return;
    }

    const navLeft = nav.getBoundingClientRect().left;
    const rect = target.getBoundingClientRect();
    const next = { left: rect.left - navLeft, width: rect.width };
    const from = this.previous;
    this.previous = next;

    this.inkAnimation?.cancel();
    ink.style.left = `${next.left}px`;
    ink.style.width = `${next.width}px`;

    const canAnimate = !instant
      && from !== null
      && from.width > 0
      && Math.round(from.left) !== Math.round(next.left)
      && !this.prefersReducedMotion()
      && typeof ink.animate === 'function';

    if (!canAnimate) return;

    const previous = from as { left: number; width: number };
    const goingRight = next.left > previous.left;
    const bridgeLeft = Math.min(previous.left, next.left);
    const bridgeWidth = Math.abs(next.left - previous.left)
      + (goingRight ? next.width : previous.width);

    this.inkAnimation = ink.animate([
      { left: `${previous.left}px`, width: `${previous.width}px` },
      { left: `${bridgeLeft}px`, width: `${bridgeWidth}px`, offset: 0.45 },
      { left: `${next.left}px`, width: `${next.width}px` },
    ], {
      duration: INK_DURATION_MS,
      easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
    });

    const ripple = this.inkRipple()?.nativeElement;
    if (ripple && typeof ripple.animate === 'function') {
      ripple.style.left = `${next.left + next.width / 2}px`;
      ripple.animate([
        { transform: 'scale(0.4)', opacity: '0.55' },
        { transform: 'scale(2.6)', opacity: '0' },
      ], { duration: RIPPLE_DURATION_MS, easing: 'ease-out' });
    }
  }
}
