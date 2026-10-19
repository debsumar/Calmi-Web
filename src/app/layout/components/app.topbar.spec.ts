import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { provideLucideIcons, LucideMoon, LucideSun, LucideUser, LucideCircleUser, LucideMenu, LucideX, LucideLogOut, LucideNotebookPen } from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { provideAuthServiceStub } from '../../core/services/testing/auth.service.stub';
import { AppTopbar } from './app.topbar';

@Component({ template: '' })
class BlankComponent {}

describe('AppTopbar', () => {
  let fixture: ComponentFixture<AppTopbar>;
  let router: Router;
  let originalMatchMedia: typeof window.matchMedia | undefined;

  const nav = () => fixture.nativeElement.querySelector('nav') as HTMLElement;
  const links = () => Array.from(nav().querySelectorAll('a[data-nav-path]')) as HTMLElement[];
  const indicator = () => nav().querySelector('span[aria-hidden="true"]:last-of-type') as HTMLElement;
  const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
  const profileTrigger = () => fixture.nativeElement.querySelector('button[aria-label="Open profile menu"]') as HTMLButtonElement;
  const mobileToggle = () => fixture.nativeElement.querySelector('#mobile-menu-toggle') as HTMLButtonElement;
  const mobileMenu = () => fixture.nativeElement.querySelector('#mobile-menu') as HTMLElement | null;
  const pressEscape = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
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
    (fixture.nativeElement.querySelector('button[aria-label="Open profile menu"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    logoutButton(fixture.nativeElement).click();
    fixture.detectChanges();
    return auth;
  };
  const openMobileLogout = (): AuthService => {
    const auth = authenticate();
    (fixture.nativeElement.querySelector('#mobile-menu-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    logoutButton(fixture.nativeElement.querySelector('#mobile-menu')).click();
    fixture.detectChanges();
    return auth;
  };

  beforeEach(async () => {
    localStorage.removeItem('calmi-theme');
    originalMatchMedia = window.matchMedia;
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
          { path: 'journal', component: BlankComponent },
        ]),
        provideLucideIcons(LucideMoon, LucideSun, LucideUser, LucideCircleUser, LucideMenu, LucideX, LucideLogOut, LucideNotebookPen),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(AppTopbar);
    fixture.detectChanges();
  });

  afterEach(() => {
    if (originalMatchMedia) window.matchMedia = originalMatchMedia;
    else delete (window as { matchMedia?: unknown }).matchMedia;
    localStorage.removeItem('calmi-theme');
    document.documentElement.classList.remove('app-dark');
    document.body.style.overflow = '';
  });

  it('renders one nav link per configured route plus the ink indicator', () => {
    expect(links().length).toBe(6);
    expect(links().map((a) => a.getAttribute('data-nav-path'))).toEqual([
      '/home', '/rumi-ai', '/experts', '/sleep', '/about', '/pricing',
    ]);
    expect(indicator()).not.toBeNull();
  });

  it('marks exactly the active link with aria-current instead of a static border', async () => {
    await router.navigateByUrl('/home');
    await settle();

    const current = nav().querySelectorAll('[aria-current="page"]');
    expect(current.length).toBe(1);
    expect(current[0].getAttribute('data-nav-path')).toBe('/home');
  });

  it('moves the indicator to the newly active link', async () => {
    const rects: Record<string, [number, number]> = {};
    links().forEach((link, i) => { rects[link.getAttribute('data-nav-path')!] = [100 + i * 100, 80]; });
    const original = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      const path = this.getAttribute('data-nav-path');
      const [left, width] = path ? rects[path] : [0, 0];
      return { left, width, right: left + width, top: 0, bottom: 0, height: 0, x: left, y: 0, toJSON: () => ({}) } as DOMRect;
    };
    try {
      await router.navigateByUrl('/home');
      await settle();
      const before = indicator().style.left;
      expect(before).toBe('100px');

      await router.navigateByUrl('/pricing');
      await settle();

      expect(router.url).toBe('/pricing');
      expect(indicator().style.left).toBe('600px');
      expect(indicator().style.left).not.toBe(before);
      expect(indicator().style.width).toBe('80px');
    } finally {
      HTMLElement.prototype.getBoundingClientRect = original;
    }
  });

  it('renders desktop and mobile Sign In controls pointing at the identify flow', () => {
    mobileToggle().click();
    fixture.detectChanges();

    const signInLinks = Array.from(fixture.nativeElement.querySelectorAll('a[href="/auth/identify"]')) as HTMLAnchorElement[];

    expect(signInLinks).toHaveLength(2);
    for (const link of signInLinks) {
      expect(link.textContent?.trim()).toBe('Sign In');
    }
  });

  it('shows the user initial as the profile-avatar fallback', () => {
    const auth = TestBed.inject(AuthService);
    auth.currentUser.set({ email: 'person@example.com', user_metadata: {} } as never);
    fixture.detectChanges();

    const fallback = profileTrigger().querySelector('div[aria-hidden="true"]') as HTMLElement;
    expect(fallback).not.toBeNull();
    expect(fallback.textContent?.trim()).toBe('P');
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
    const fallback = fixture.nativeElement.querySelector('button[aria-label="Open profile menu"] div[aria-hidden="true"]') as HTMLElement;
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
    expect(fixture.nativeElement.querySelector('button[aria-label="Open profile menu"] div[aria-hidden="true"]')).not.toBeNull();
  });

  it('names the profile trigger even though the avatar image is decorative', () => {
    const auth = TestBed.inject(AuthService);
    auth.currentUser.set({
      email: 'person@example.com',
      user_metadata: { full_name: 'Person', avatar_url: 'https://lh3.googleusercontent.com/a/photo.jpg' },
    } as never);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('button[aria-label="Open profile menu"]') as HTMLButtonElement;
    expect(trigger.getAttribute('aria-label')).toBe('Open profile menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect((fixture.nativeElement.querySelector('button img') as HTMLImageElement).getAttribute('alt')).toBe('');
  });

  it('offers My Journals in the profile menu and navigates to the journal page', async () => {
    authenticate();
    (fixture.nativeElement.querySelector('button[aria-label="Open profile menu"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    const journalItem = Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find((button) => (button as HTMLButtonElement).textContent?.trim() === 'My Journals') as HTMLButtonElement;
    expect(journalItem).toBeDefined();
    expect(journalItem.getAttribute('aria-label')).toBe('My Journals');

    journalItem.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/journal');
    // Menu closes on navigation, like View Profile does.
    expect(fixture.nativeElement.textContent).not.toContain('My Journals');
  });

  it('hides My Journals in the profile menu for specialists', () => {
    authenticate().selectedRole.set('specialist');
    (fixture.nativeElement.querySelector('button[aria-label="Open profile menu"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('View Profile');
    expect(fixture.nativeElement.textContent).not.toContain('My Journals');
  });

  it('opens the desktop logout confirmation without signing out', () => {    const auth = openDesktopLogout();

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

  it('labels each theme mode with state and action while keeping the Auto text', () => {
    const theme = TestBed.inject(ThemeService);
    const toggle = () => fixture.nativeElement.querySelector('button[aria-label^="Theme:"]') as HTMLButtonElement;

    expect(theme.mode()).toBe('auto');
    expect(toggle().getAttribute('type')).toBe('button');
    expect(toggle().getAttribute('aria-label')).toBe('Theme: Auto. Switch to Light');
    expect(toggle().textContent?.trim()).toBe('Auto');

    toggle().click();
    fixture.detectChanges();
    expect(theme.mode()).toBe('light');
    expect(toggle().getAttribute('aria-label')).toBe('Theme: Light. Switch to Dark');

    toggle().click();
    fixture.detectChanges();
    expect(theme.mode()).toBe('dark');
    expect(toggle().getAttribute('aria-label')).toBe('Theme: Dark. Switch to Auto');

    toggle().click();
    fixture.detectChanges();
    expect(theme.mode()).toBe('auto');
    expect(toggle().getAttribute('aria-label')).toBe('Theme: Auto. Switch to Light');
    expect(toggle().textContent?.trim()).toBe('Auto');
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

    (dialog()!.parentElement as HTMLElement)
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

  describe('profile dropdown', () => {
    const openMenu = () => { authenticate(); profileTrigger().click(); fixture.detectChanges(); };

    it('is a menu of menuitems and only references aria-controls while open', () => {
      authenticate();
      expect(profileTrigger().getAttribute('aria-controls')).toBeNull();
      profileTrigger().click();
      fixture.detectChanges();

      const menu = fixture.nativeElement.querySelector('[role="menu"]') as HTMLElement;
      expect(menu).not.toBeNull();
      expect(profileTrigger().getAttribute('aria-controls')).toBe(menu.id);
      expect(menu.querySelectorAll('[role="menuitem"]').length).toBeGreaterThanOrEqual(3);
    });

    it('moves focus into the menu on open', async () => {
      openMenu();
      await settle();
      const first = fixture.nativeElement.querySelector('[role="menuitem"]') as HTMLElement;
      expect(document.activeElement).toBe(first);
    });

    it('closes on Escape and returns focus to the trigger', async () => {
      openMenu();
      await settle();
      pressEscape();
      await settle();

      expect(fixture.nativeElement.querySelector('[role="menu"]')).toBeNull();
      expect(document.activeElement).toBe(profileTrigger());
    });

    it('closes on a click anywhere outside, but not on a click inside the menu', () => {
      openMenu();
      (fixture.nativeElement.querySelector('[role="menu"]') as HTMLElement)
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="menu"]')).not.toBeNull();

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="menu"]')).toBeNull();
      expect(profileTrigger().getAttribute('aria-expanded')).toBe('false');
    });

    it('closes when the route changes', async () => {
      openMenu();
      await router.navigateByUrl('/pricing');
      await settle();
      expect(fixture.nativeElement.querySelector('[role="menu"]')).toBeNull();
    });

    it('moves between items with the arrow keys', async () => {
      openMenu();
      await settle();
      const items = Array.from(fixture.nativeElement.querySelectorAll('[role="menuitem"]')) as HTMLElement[];
      (fixture.nativeElement.querySelector('[role="menu"]') as HTMLElement)
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(document.activeElement).toBe(items[1]);
      (fixture.nativeElement.querySelector('[role="menu"]') as HTMLElement)
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      expect(document.activeElement).toBe(items[0]);
    });
  });

  describe('mobile menu', () => {
    it('only references aria-controls while the menu exists', () => {
      expect(mobileToggle().getAttribute('aria-controls')).toBeNull();
      mobileToggle().click();
      fixture.detectChanges();
      expect(mobileToggle().getAttribute('aria-controls')).toBe('mobile-menu');
      expect(mobileMenu()).not.toBeNull();
    });

    it('does not overlay the header: it is anchored below it inside the topbar host', () => {
      mobileToggle().click();
      fixture.detectChanges();
      const header = fixture.nativeElement.querySelector('header') as HTMLElement;
      expect(header.contains(mobileMenu())).toBe(false);
      expect(mobileMenu()!.parentElement).toBe(fixture.nativeElement);
      expect(mobileMenu()!.style.position).not.toBe('fixed');
    });

    it('moves focus in on open and returns it to the toggle on Escape', async () => {
      mobileToggle().click();
      await settle();
      expect(mobileMenu()!.contains(document.activeElement)).toBe(true);

      pressEscape();
      await settle();
      expect(mobileMenu()).toBeNull();
      expect(document.activeElement).toBe(mobileToggle());
    });

    it('locks body scroll while open and restores it on close', () => {
      document.body.style.overflow = 'auto';
      mobileToggle().click();
      fixture.detectChanges();
      TestBed.tick();
      expect(document.body.style.overflow).toBe('hidden');

      mobileToggle().click();
      fixture.detectChanges();
      TestBed.tick();
      expect(document.body.style.overflow).toBe('auto');
    });

    it('restores body scroll when destroyed while open', () => {
      mobileToggle().click();
      fixture.detectChanges();
      TestBed.tick();
      expect(document.body.style.overflow).toBe('hidden');

      fixture.destroy();
      expect(document.body.style.overflow).toBe('');
    });

    it('closes on route change', async () => {
      mobileToggle().click();
      fixture.detectChanges();
      await router.navigateByUrl('/pricing');
      await settle();
      expect(mobileMenu()).toBeNull();
    });

    it('closes when the viewport grows to md or wider, and stays open below it', () => {
      const descriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth');
      try {
        mobileToggle().click();
        fixture.detectChanges();

        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500 });
        window.dispatchEvent(new Event('resize'));
        fixture.detectChanges();
        expect(mobileMenu()).not.toBeNull();

        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
        window.dispatchEvent(new Event('resize'));
        fixture.detectChanges();
        expect(mobileMenu()).toBeNull();
      } finally {
        if (descriptor) Object.defineProperty(window, 'innerWidth', descriptor);
      }
    });
  });

  describe('logout dialog focus management', () => {
    it('returns focus to the profile trigger after Escape', async () => {
      openDesktopLogout();
      await settle();
      pressEscape();
      await settle();

      expect(dialog()).toBeNull();
      expect(document.activeElement).toBe(profileTrigger());
    });

    it('traps Tab and Shift+Tab inside the dialog', async () => {
      openDesktopLogout();
      await settle();
      const [cancel, confirm] = Array.from(dialog()!.querySelectorAll('button')) as HTMLButtonElement[];

      confirm.focus();
      const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      confirm.dispatchEvent(tab);
      expect(tab.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(cancel);

      const shiftTab = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
      cancel.dispatchEvent(shiftTab);
      expect(shiftTab.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(confirm);
    });

    it('returns focus to the hamburger after cancelling a mobile-menu logout', async () => {
      openMobileLogout();
      await settle();
      (dialog()!.querySelector('button') as HTMLButtonElement).click();
      await settle();

      expect(document.activeElement).toBe(mobileToggle());
    });
  });
});
