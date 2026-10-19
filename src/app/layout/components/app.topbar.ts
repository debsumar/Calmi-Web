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
  untracked,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { LucideDynamicIcon } from '@lucide/angular';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { resolveHttpsAvatarUrl } from '../../core/identity/avatar-url';

/** Variant C timings at the chosen 1.5x speed (520ms / 620ms base). */
const INK_DURATION_MS = 350;
const RIPPLE_DURATION_MS = 420;

/** Tailwind `md` (see tailwind.css --breakpoint-md). */
const MD_BREAKPOINT_PX = 768;

const THEME_LABELS = { light: 'Light', dark: 'Dark', auto: 'Auto' } as const;

@Component({
  selector: 'app-topbar',
  imports: [RouterLink, RouterLinkActive, LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: 'block' },
  template: `
    <header class="h-16 flex items-center justify-between px-4 md:px-8 bg-glass backdrop-blur-md border-b border-hairline">
      <a routerLink="/" class="flex items-center">
        <img src="assets/logos/logo.avif" alt="Calmi" class="h-8 md:h-10">
      </a>

      <!-- Desktop nav -->
      <nav #desktopNav class="relative hidden md:flex items-center gap-8">
        @for (link of navLinks(); track link.path) {
          <a [routerLink]="link.path" routerLinkActive="text-ink font-bold"
             ariaCurrentWhenActive="page"
             [attr.data-nav-path]="link.path"
             class="text-sm font-semibold text-ink-soft hover:text-ink pb-1 transition-colors duration-200">
            {{ link.label }}
          </a>
        }
        <!-- Elastic ink indicator: stretches to bridge both tabs, then contracts. -->
        <span #inkRipple aria-hidden="true"
              class="pointer-events-none absolute bottom-0 h-3 w-3 -ml-1.5 rounded-full bg-brand opacity-0"></span>
        <span #inkIndicator aria-hidden="true"
              class="pointer-events-none absolute bottom-0 left-0 h-0.5 w-0 rounded-full bg-brand"></span>
      </nav>

      <div class="flex items-center gap-3">
        <div class="hidden h-5 border-l border-hairline md:block"></div>
        <button type="button" (click)="themeService.toggle()"
                class="h-9 min-w-9 px-2 flex items-center justify-center rounded-full text-ink hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                [attr.aria-label]="themeLabel()"
                [title]="themeLabel()">
          @switch (themeService.mode()) {
            @case ('light') { <svg [lucideIcon]="'moon'" [size]="20" class="text-ink"></svg> }
            @case ('dark') { <svg [lucideIcon]="'sun'" [size]="20" class="text-ink"></svg> }
            @case ('auto') { <span aria-hidden="true" class="text-xs font-semibold leading-none text-ink">Auto</span> }
          }
        </button>

        @if (authService.currentUser(); as user) {
          <div #profileMenuWrap class="relative">
            <!-- Profile Trigger -->
            <button #profileTrigger type="button" (click)="toggleDropdown()"
                    aria-label="Open profile menu" aria-haspopup="menu" [attr.aria-expanded]="dropdownOpen()"
                    [attr.aria-controls]="dropdownOpen() ? 'profile-menu' : null"
                    class="w-9 h-9 flex items-center justify-center rounded-full overflow-hidden border border-hairline hover:ring-2 hover:ring-brand transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              @if (avatarUrl(); as avatar) {
                <img [src]="avatar" alt="" aria-hidden="true" referrerpolicy="no-referrer" decoding="async"
                     width="36" height="36" class="w-full h-full object-cover" (error)="onAvatarError()">
              } @else {
                <div aria-hidden="true" class="w-full h-full bg-sunken-alt text-ink flex items-center justify-center font-bold text-sm">
                  {{ (user.user_metadata['full_name']?.[0] || user.email?.[0] || 'U').toUpperCase() }}
                </div>
              }
            </button>

            <!-- Dropdown Menu -->
            @if (dropdownOpen()) {
              <!-- Outside clicks are handled by the document listener (onDocumentClick):
                   a fixed overlay inside the backdrop-blur header would only cover the header strip. -->
              <div #profileMenu id="profile-menu" role="menu" aria-label="Profile menu"
                   (keydown)="onProfileMenuKeydown($event)"
                   class="absolute right-0 mt-2 w-56 rounded-xl bg-elevated border border-hairline p-2 shadow-card z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                <div role="presentation" class="px-3 py-2 border-b border-hairline mb-1">
                  <p class="text-sm font-semibold text-ink truncate">
                    {{ user.user_metadata['full_name'] || 'User' }}
                  </p>
                  <p class="text-xs text-ink-muted truncate">
                    {{ user.email }}
                  </p>
                </div>
                <button type="button" role="menuitem" (click)="viewProfile()" aria-label="View Profile"
                        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-sunken rounded-lg transition-colors text-left">
                  <svg [lucideIcon]="'circle-user'" [size]="16" aria-hidden="true"></svg>
                  View Profile
                </button>
                @if (authService.selectedRole() !== 'specialist') {
                  <button type="button" role="menuitem" (click)="viewJournal()" aria-label="My Journals"
                          class="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-sunken rounded-lg transition-colors text-left">
                    <svg [lucideIcon]="'notebook-pen'" [size]="16" aria-hidden="true"></svg>
                    My Journals
                  </button>
                }
                <button type="button" role="menuitem" (click)="requestLogout($event)"
                        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-sunken rounded-lg transition-colors text-left">
                  <svg [lucideIcon]="'log-out'" [size]="16" aria-hidden="true"></svg>
                  Logout
                </button>
              </div>
            }
          </div>
        } @else {
          <a routerLink="/auth/identify"
             class="inline-flex min-h-11 items-center gap-2 rounded-full border border-transparent bg-brand-deep px-4 py-2 text-sm font-semibold text-on-brand-deep transition-all hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
            <svg [lucideIcon]="'user'" [size]="16" aria-hidden="true"></svg>
            Sign In
          </a>
        }

        <!-- Mobile hamburger -->
        <button #mobileMenuToggle id="mobile-menu-toggle" type="button" (click)="toggleMobileMenu()"
                [attr.aria-label]="mobileMenuOpen() ? 'Close navigation menu' : 'Open navigation menu'"
                [attr.aria-expanded]="mobileMenuOpen()"
                [attr.aria-controls]="mobileMenuOpen() ? 'mobile-menu' : null"
                class="md:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          <svg [lucideIcon]="mobileMenuOpen() ? 'x' : 'menu'" [size]="22" class="text-ink"></svg>
        </button>
      </div>
    </header>

    <!-- Mobile menu overlay -->
    @if (mobileMenuOpen()) {
      <!-- Anchored to the sticky host (not the viewport) so it always starts at the header's
           bottom edge, even when the Download banner pushes the topbar down. -->
      <div #mobileMenu id="mobile-menu" class="md:hidden absolute inset-x-0 top-full z-40 h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain bg-canvas p-6 flex flex-col gap-4 stagger-enter" style="--index:0">
        @for (link of navLinks(); track link.path; let i = $index) {
          <a [routerLink]="link.path" routerLinkActive="text-brand font-bold"
             (click)="closeMobileMenu()"
             class="stagger-enter text-lg font-semibold text-ink hover:text-brand py-2 border-b border-hairline"
             [style.--index]="i + 1">
            {{ link.label }}
          </a>
        }
        @if (authService.currentUser()) {
          <button type="button" (click)="requestLogout($event)"
                  class="stagger-enter mt-2 inline-flex items-center justify-center gap-2 rounded-full border border-hairline px-4 py-3 text-base font-semibold text-danger hover:bg-sunken"
                  [style.--index]="navLinks().length + 1">
            <svg [lucideIcon]="'log-out'" [size]="18" aria-hidden="true"></svg>
            Logout
          </button>
        } @else {
          <a routerLink="/auth/identify" (click)="closeMobileMenu()"
             class="stagger-enter mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-transparent bg-brand-deep px-4 py-3 text-base font-semibold text-on-brand-deep hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
             [style.--index]="navLinks().length + 1">
            <svg [lucideIcon]="'user'" [size]="18" aria-hidden="true"></svg>
            Sign In
          </a>
        }
      </div>
    }

    @if (logoutConfirmOpen()) {
      <div class="fixed inset-0 z-50 grid place-items-center bg-scrim p-4" (click)="cancelLogout()">
        <div role="dialog" aria-modal="true" aria-labelledby="logout-confirm-title"
             tabindex="-1" (click)="$event.stopPropagation()" (keydown.tab)="trapDialogTab($event)" (keydown.shift.tab)="trapDialogTab($event)"
             class="w-full max-w-sm overflow-hidden rounded-2xl border border-hairline bg-elevated p-8 shadow-card">
          <h3 id="logout-confirm-title" class="dialog-stagger-item text-center font-sans text-lg font-bold text-ink" style="--index: 0">
            Log out?
          </h3>
          <p class="dialog-stagger-item mt-2 text-center text-base text-ink-soft" style="--index: 1">
            You will need to sign in again to continue where you left off.
          </p>
          <div class="dialog-stagger-item mt-6 flex gap-3" style="--index: 2">
            <button #logoutConfirmCancelButton type="button" (click)="cancelLogout()"
                    class="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-hairline bg-sunken px-4 py-3 text-base font-semibold text-ink transition-colors hover:bg-sunken-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              Cancel
            </button>
            <button #logoutConfirmButton type="button" (click)="confirmLogout()"
                    class="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-brand-deep px-4 py-3 text-base font-semibold text-on-brand-deep transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              Yes, log out
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class AppTopbar {
  themeService = inject(ThemeService);
  authService = inject(AuthService);
  mobileMenuOpen = signal(false);
  dropdownOpen = signal(false);
  logoutConfirmOpen = signal(false);

  /**
   * Google serves `lh3.googleusercontent.com` photos only to requests that send no
   * referrer, so the img below needs `referrerpolicy="no-referrer"`. If the fetch
   * still fails we fall back to initials rather than leaving a broken image icon.
   */
  private readonly avatarFailed = signal(false);

  /** Only https URLs reach the img src; `javascript:`/`data:`/http: are rejected. */
  readonly avatarUrl = computed(() => {
    if (this.avatarFailed()) return null;
    const metadata = this.authService.currentUser()?.user_metadata as Record<string, unknown> | undefined;
    return resolveHttpsAvatarUrl(metadata);
  });

  onAvatarError(): void {
    this.avatarFailed.set(true);
  }

  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly desktopNav = viewChild<ElementRef<HTMLElement>>('desktopNav');
  private readonly inkIndicator = viewChild<ElementRef<HTMLElement>>('inkIndicator');
  private readonly inkRipple = viewChild<ElementRef<HTMLElement>>('inkRipple');
  private readonly profileTrigger = viewChild<ElementRef<HTMLButtonElement>>('profileTrigger');
  private readonly mobileMenuToggle = viewChild<ElementRef<HTMLButtonElement>>('mobileMenuToggle');
  private readonly logoutConfirmCancelButton = viewChild<ElementRef<HTMLButtonElement>>('logoutConfirmCancelButton');
  private readonly logoutConfirmButton = viewChild<ElementRef<HTMLButtonElement>>('logoutConfirmButton');
  private readonly profileMenuWrap = viewChild<ElementRef<HTMLElement>>('profileMenuWrap');
  private readonly profileMenu = viewChild<ElementRef<HTMLElement>>('profileMenu');
  private readonly mobileMenu = viewChild<ElementRef<HTMLElement>>('mobileMenu');
  private logoutTrigger: HTMLElement | null = null;
  private logoutFallback: HTMLElement | null = null;

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
    { path: '/rumi-ai', label: 'Rumi AI' },
    { path: '/experts', label: 'Experts' },
    { path: '/sleep', label: 'Sleep' },
    { path: '/about', label: 'About Us' },
    { path: '/pricing', label: 'Pricing' },
  ]);

  /** Accessible name states the current mode and the action, not just the mode. */
  readonly themeLabel = computed(() => {
    const mode = this.themeService.mode();
    const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'auto' : 'light';
    return `Theme: ${THEME_LABELS[mode]}. Switch to ${THEME_LABELS[next]}`;
  });

  constructor() {
    effect(() => {
      this.currentPath();
      afterNextRender({ write: () => this.moveIndicator() }, { injector: this.injector });
    });

    // Navigating anywhere dismisses transient UI; the menu must not outlive the page it linked to.
    effect(() => {
      this.currentPath();
      untracked(() => {
        this.dropdownOpen.set(false);
        this.mobileMenuOpen.set(false);
      });
    });

    // Lock page scroll behind the open mobile menu; always restore, including on destroy.
    effect((onCleanup) => {
      if (!this.mobileMenuOpen()) return;
      const body = this.document.body;
      const previous = body.style.overflow;
      body.style.overflow = 'hidden';
      onCleanup(() => { body.style.overflow = previous; });
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
    // The hamburger is hidden from md up, so an open menu would be orphaned.
    const width = this.document.defaultView?.innerWidth ?? 0;
    if (width >= MD_BREAKPOINT_PX && this.mobileMenuOpen()) this.mobileMenuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.dropdownOpen()) return;
    const wrap = this.profileMenuWrap()?.nativeElement;
    if (wrap && event.target instanceof Node && wrap.contains(event.target)) return;
    this.dropdownOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.logoutConfirmOpen()) {
      this.cancelLogout();
    } else if (this.dropdownOpen()) {
      this.closeDropdown(true);
    } else if (this.mobileMenuOpen()) {
      this.closeMobileMenu(true);
    }
  }

  toggleDropdown(): void {
    if (this.dropdownOpen()) {
      this.closeDropdown();
      return;
    }
    this.dropdownOpen.set(true);
    this.focusAfterRender(() => this.profileMenu()?.nativeElement.querySelector<HTMLElement>('[role="menuitem"]'));
  }

  closeDropdown(returnFocus = false): void {
    this.dropdownOpen.set(false);
    if (returnFocus) this.focusAfterRender(() => this.profileTrigger()?.nativeElement);
  }

  toggleMobileMenu(): void {
    if (this.mobileMenuOpen()) {
      this.closeMobileMenu();
      return;
    }
    this.mobileMenuOpen.set(true);
    this.focusAfterRender(() => this.mobileMenu()?.nativeElement.querySelector<HTMLElement>('a, button'));
  }

  closeMobileMenu(returnFocus = false): void {
    this.mobileMenuOpen.set(false);
    if (returnFocus) this.focusAfterRender(() => this.mobileMenuToggle()?.nativeElement);
  }

  onProfileMenuKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const items = Array.from(this.profileMenu()?.nativeElement.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    if (items.length === 0) return;
    event.preventDefault();
    const current = items.indexOf(this.document.activeElement as HTMLElement);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    items[(current + step + items.length) % items.length].focus();
  }

  /** Keeps Tab / Shift+Tab inside the modal logout dialog. */
  trapDialogTab(event: Event): void {
    const first = this.logoutConfirmCancelButton()?.nativeElement;
    const last = this.logoutConfirmButton()?.nativeElement;
    if (!first || !last) return;
    const shift = (event as KeyboardEvent).shiftKey;
    const active = this.document.activeElement;
    if (shift && (active === first || !first.parentElement?.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!shift && (active === last || !first.parentElement?.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusAfterRender(resolve: () => HTMLElement | null | undefined): void {
    afterNextRender({ write: () => resolve()?.focus() }, { injector: this.injector });
  }

  viewProfile(): void {
    this.dropdownOpen.set(false);
    void this.router.navigate(['/profile']);
  }

  viewJournal(): void {
    this.dropdownOpen.set(false);
    void this.router.navigate(['/journal']);
  }

  requestLogout(event: Event): void {
    const trigger = event.currentTarget;
    this.logoutTrigger = trigger instanceof HTMLElement
      ? trigger
      : this.document.activeElement instanceof HTMLElement
        ? this.document.activeElement
        : null;
    this.logoutFallback = trigger instanceof HTMLElement && trigger.closest('#mobile-menu') !== null
      ? this.mobileMenuToggle()?.nativeElement ?? null
      : this.profileTrigger()?.nativeElement ?? null;

    this.dropdownOpen.set(false);
    this.mobileMenuOpen.set(false);
    this.logoutConfirmOpen.set(true);
    afterNextRender({
      write: () => this.logoutConfirmCancelButton()?.nativeElement.focus(),
    }, { injector: this.injector });
  }

  cancelLogout(): void {
    this.logoutConfirmOpen.set(false);
    this.restoreLogoutFocus();
  }

  async confirmLogout(): Promise<void> {
    this.logoutConfirmOpen.set(false);
    this.dropdownOpen.set(false);
    this.restoreLogoutFocus();

    // `logout()` clears the local session in a `finally`, so the user is signed out
    // even when the network call fails. Either way we must leave the protected route:
    // staying put would keep a guarded page on screen until the next navigation.
    await this.authService.logout().catch(() => undefined);
    await this.router.navigate(['/home']).catch(() => undefined);
  }

  private restoreLogoutFocus(): void {
    const trigger = this.logoutTrigger;
    const fallback = this.logoutFallback;
    this.logoutTrigger = null;
    this.logoutFallback = null;

    if (trigger?.isConnected) {
      trigger.focus();
    } else {
      fallback?.focus();
    }
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
