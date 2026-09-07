import { beforeEach, describe, expect, it } from 'vitest';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { provideLucideIcons, LucideMoon, LucideSun, LucideUser, LucideCircleUser, LucideMenu, LucideX, LucideLogOut } from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { provideAuthServiceStub } from '../../core/services/testing/auth.service.stub';
import { AppTopbar } from './app.topbar';

@Component({ template: '' })
class BlankComponent {}

describe('AppTopbar', () => {
  let fixture: ComponentFixture<AppTopbar>;
  let router: Router;

  const nav = () => fixture.nativeElement.querySelector('nav') as HTMLElement;
  const links = () => Array.from(nav().querySelectorAll('a[data-nav-path]')) as HTMLElement[];
  const indicator = () => nav().querySelector('span.bg-brand') as HTMLElement;
  const dialog = () => fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement | null;
  const authenticate = (): AuthService => {
    const auth = TestBed.inject(AuthService);
    auth.currentUser.set({ email: 'person@example.com', user_metadata: { full_name: 'Person' } } as never);
    fixture.detectChanges();
    return auth;
  };
  const logoutButton = (root: ParentNode): HTMLButtonElement =>
    Array.from(root.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Logout') as HTMLButtonElement;
  const openDesktopLogout = (): AuthService => {
    const auth = authenticate();
    (fixture.nativeElement.querySelector('button.overflow-hidden') as HTMLButtonElement).click();
    fixture.detectChanges();
    logoutButton(fixture.nativeElement).click();
    fixture.detectChanges();
    return auth;
  };
  const openMobileLogout = (): AuthService => {
    const auth = authenticate();
    (fixture.nativeElement.querySelector('button[aria-controls="mobile-menu"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    logoutButton(fixture.nativeElement.querySelector('#mobile-menu')).click();
    fixture.detectChanges();
    return auth;
  };

  beforeEach(async () => {
    // jsdom here has no matchMedia; ThemeService and the reduced-motion check need it.
    if (typeof window.matchMedia !== 'function') {
      window.matchMedia = ((query: string): MediaQueryList => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }));
    }

    await TestBed.configureTestingModule({
      imports: [AppTopbar],
      providers: [
        provideAuthServiceStub(),
        provideRouter([
          { path: 'home', component: BlankComponent },
          { path: 'pricing', component: BlankComponent },
        ]),
        provideLucideIcons(LucideMoon, LucideSun, LucideUser, LucideCircleUser, LucideMenu, LucideX, LucideLogOut),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(AppTopbar);
    fixture.detectChanges();
  });

  it('renders one nav link per configured route plus the ink indicator', () => {
    expect(links().length).toBe(6);
    expect(links().map((a) => a.getAttribute('data-nav-path'))).toEqual([
      '/home', '/rumi-ai', '/therapy', '/sleep', '/about', '/pricing',
    ]);
    expect(indicator()).not.toBeNull();
  });

  it('marks the active link with aria-current instead of a static border', () => {
    const classes = links()[0].getAttribute('class') ?? '';

    // The old implementation hard-coded border-b-2 on the active link.
    expect(classes).not.toContain('border-b-2');
    expect(nav().querySelectorAll('[aria-current="page"]').length).toBeLessThanOrEqual(1);
  });

  it('keeps the indicator registered after navigation', async () => {
    await router.navigateByUrl('/pricing');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(router.url).toBe('/pricing');
    expect(indicator()).not.toBeNull();
  });

  it('renders desktop and mobile Sign In controls with adaptive dark-mode variants', () => {
    const menuButton = nav().parentElement?.querySelector('button[aria-controls="mobile-menu"]') as HTMLButtonElement;
    menuButton.click();
    fixture.detectChanges();

    const signInLinks = fixture.nativeElement.querySelectorAll('a[href="/auth/identify"]') as NodeListOf<HTMLAnchorElement>;

    expect(signInLinks).toHaveLength(2);
    for (const link of signInLinks) {

      // Near-black on brand-dark measured ~2.9:1, so the filled pill carries a
      // white foreground per SKILL.md:266. The guard below keeps it from
      // regressing back into a white *button*.

      expect(link.classList).toContain('text-on-brand-deep');
      expect(link.classList).toContain('bg-brand-deep');
      expect(link.classList).toContain('hover:bg-brand-dark');
      expect(link.classList).not.toContain('bg-white');
    }
  });

  it('uses adaptive roles for the profile-avatar fallback', () => {
    const auth = TestBed.inject(AuthService);
    auth.currentUser.set({ email: 'person@example.com', user_metadata: {} } as never);
    fixture.detectChanges();

    const fallback = fixture.nativeElement.querySelector('button div.bg-sunken-alt') as HTMLElement;
    expect(fallback).not.toBeNull();
    expect(fallback.classList).toContain('text-ink');
  });

  it('renders an https avatar with no referrer so Google serves the photo', () => {
    const auth = TestBed.inject(AuthService);
    auth.currentUser.set({
      email: 'person@example.com',
      user_metadata: { full_name: 'Person', avatar_url: 'https://lh3.googleusercontent.com/a/photo.jpg' },
    } as never);
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('button img') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe('https://lh3.googleusercontent.com/a/photo.jpg');
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
  });

  it('falls back to initials when the avatar fails to load instead of a broken image', () => {
    const auth = TestBed.inject(AuthService);
    auth.currentUser.set({
      email: 'person@example.com',
      user_metadata: { full_name: 'Person', avatar_url: 'https://lh3.googleusercontent.com/a/photo.jpg' },
    } as never);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('button img') as HTMLImageElement).dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button img')).toBeNull();
    const fallback = fixture.nativeElement.querySelector('button div.bg-sunken-alt') as HTMLElement;
    expect(fallback.textContent?.trim()).toBe('P');
  });

  it('rejects a non-https avatar url and renders initials instead', () => {
    const auth = TestBed.inject(AuthService);
    auth.currentUser.set({
      email: 'person@example.com',
      user_metadata: { full_name: 'Person', avatar_url: 'javascript:alert(1)' },
    } as never);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button img')).toBeNull();
    expect(fixture.nativeElement.querySelector('button div.bg-sunken-alt')).not.toBeNull();
  });

  it('names the profile trigger even though the avatar image is decorative', () => {
    const auth = TestBed.inject(AuthService);
    auth.currentUser.set({
      email: 'person@example.com',
      user_metadata: { full_name: 'Person', avatar_url: 'https://lh3.googleusercontent.com/a/photo.jpg' },
    } as never);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('button.overflow-hidden') as HTMLButtonElement;
    expect(trigger.getAttribute('aria-label')).toBe('Open profile menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect((fixture.nativeElement.querySelector('button img') as HTMLImageElement).getAttribute('alt')).toBe('');
  });

  it('opens the desktop logout confirmation without signing out', () => {
    const auth = openDesktopLogout();

    expect(dialog()).not.toBeNull();
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('closes the desktop dropdown so the dialog is not layered beneath it', () => {
    openDesktopLogout();

    // The dropdown hosts the Logout trigger; leaving it open would stack over the dialog.
    expect(fixture.nativeElement.textContent).not.toContain('View Profile');
  });

  it('exposes the confirmation as a labelled modal dialog', () => {
    openDesktopLogout();
    const panel = dialog() as HTMLElement;

    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(panel.getAttribute('tabindex')).toBe('-1');

    // A dangling aria-labelledby announces nothing, so the target must exist.
    const labelId = panel.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(panel.querySelector(`#${labelId}`)).not.toBeNull();
  });

  it('focuses Cancel rather than the destructive action when opened', async () => {
    openDesktopLogout();
    await fixture.whenStable();

    const buttons = Array.from(dialog()?.querySelectorAll('button') ?? []) as HTMLButtonElement[];
    expect(document.activeElement).toBe(buttons[0]);
    expect(buttons[0].textContent?.trim()).toBe('Cancel');
  });

  it('does not close when the panel itself is clicked', () => {
    const auth = openDesktopLogout();

    (dialog() as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(dialog()).not.toBeNull();
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('cancels logout without signing out', () => {
    const auth = openDesktopLogout();

    (dialog()?.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(dialog()).toBeNull();
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('labels the auto theme state with readable text rather than a bare letter', () => {
    const theme = TestBed.inject(ThemeService);
    const toggle = fixture.nativeElement.querySelector('button[title^="Theme:"]') as HTMLButtonElement;

    // toggle() cycles light -> dark -> auto, so advance until auto is showing.
    for (let i = 0; i < 3 && theme.mode() !== 'auto'; i++) {
      toggle.click();
      fixture.detectChanges();
    }

    expect(theme.mode()).toBe('auto');
    expect(toggle.textContent?.trim()).toBe('Auto');
    expect(toggle.getAttribute('title')).toBe('Theme: auto');
  });

  it('confirms logout exactly once and closes the dialog', () => {
    const auth = openDesktopLogout();

    const buttons = Array.from(dialog()?.querySelectorAll('button') ?? []) as HTMLButtonElement[];
    buttons[1].click();
    fixture.detectChanges();

    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(dialog()).toBeNull();
  });

  it('sends the user to home after a successful logout', async () => {
    const auth = openDesktopLogout();

    const buttons = Array.from(dialog()?.querySelectorAll('button') ?? []) as HTMLButtonElement[];
    buttons[1].click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(router.url).toBe('/home');
  });

  it('still sends the user to home when signing out fails', async () => {
    const auth = openDesktopLogout();
    (auth.logout as unknown as { mockRejectedValueOnce: (e: unknown) => void })
      .mockRejectedValueOnce(new Error('network down'));

    const buttons = Array.from(dialog()?.querySelectorAll('button') ?? []) as HTMLButtonElement[];
    buttons[1].click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/home');
  });

  it('cancels logout on Escape', () => {
    const auth = openDesktopLogout();

    dialog()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(dialog()).toBeNull();
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('cancels logout when the backdrop is clicked', () => {
    const auth = openDesktopLogout();

    (fixture.nativeElement.querySelector('div.fixed.inset-0.z-50') as HTMLElement)
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(dialog()).toBeNull();
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('opens mobile logout confirmation and closes the mobile menu', () => {
    const auth = openMobileLogout();

    expect(dialog()).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#mobile-menu')).toBeNull();
    expect(auth.logout).not.toHaveBeenCalled();
  });
});

