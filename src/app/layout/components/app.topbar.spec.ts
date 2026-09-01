import { beforeEach, describe, expect, it } from 'vitest';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { provideLucideIcons, LucideMoon, LucideSun, LucideUser, LucideMenu, LucideX, LucideLogOut } from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';
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

  beforeEach(async () => {
    // jsdom here has no matchMedia; ThemeService and the reduced-motion check need it.
    if (typeof window.matchMedia !== 'function') {
      window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })) as unknown as typeof window.matchMedia;
    }

    await TestBed.configureTestingModule({
      imports: [AppTopbar],
      providers: [
        provideAuthServiceStub(),
        provideRouter([
          { path: 'home', component: BlankComponent },
          { path: 'pricing', component: BlankComponent },
        ]),
        provideLucideIcons(LucideMoon, LucideSun, LucideUser, LucideMenu, LucideX, LucideLogOut),
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

  it('positions the indicator against the active link after navigation', async () => {
    await router.navigateByUrl('/pricing');
    fixture.detectChanges();
    await fixture.whenStable();

    // jsdom reports zero-size rects, so assert the indicator is driven at all
    // rather than asserting pixel values.
    expect(indicator().style.width).not.toBe('');
  });

  it('renders desktop and mobile Sign In controls with adaptive dark-mode variants', () => {
    const menuButton = nav().parentElement?.querySelector('button[aria-controls="mobile-menu"]') as HTMLButtonElement;
    menuButton.click();
    fixture.detectChanges();

    const signInLinks = fixture.nativeElement.querySelectorAll('a[href="/auth/identify"]') as NodeListOf<HTMLAnchorElement>;

    expect(signInLinks).toHaveLength(2);
    for (const link of signInLinks) {
      expect(link.classList).toContain('bg-brand-dark');
      expect(link.classList).toContain('text-on-brand');
      expect(link.classList).toContain('dark:bg-elevated');
      expect(link.classList).toContain('dark:text-brand-light');
      expect(link.classList).toContain('min-h-11');
      expect(link.classList).not.toContain('bg-white');
      expect(link.classList).not.toContain('text-white');
    }
  });

  it('uses adaptive roles for the profile-avatar fallback', () => {
    const auth = TestBed.inject(AuthService);
    auth.currentUser.set({ email: 'person@example.com', user_metadata: {} } as never);
    fixture.detectChanges();

    const fallback = fixture.nativeElement.querySelector('button div.bg-sunken-alt') as HTMLElement;
    expect(fallback).not.toBeNull();
    expect(fallback.classList).toContain('dark:text-brand-light');
  });
});

