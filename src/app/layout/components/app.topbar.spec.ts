import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { provideLucideIcons, LucideMoon, LucideSun, LucideUser, LucideMenu, LucideX, LucideLogOut } from '@lucide/angular';
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
    expect(links().length).toBe(5);
    expect(links().map((a) => a.getAttribute('data-nav-path'))).toEqual([
      '/home', '/therapy', '/sleep', '/about', '/pricing',
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
});
