import { Component, provideZonelessChangeDetection } from '@angular/core';
import { RouterLink, Router, RouterOutlet, Routes, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TestBed } from '@angular/core/testing';
import { LucideDynamicIcon, LucideSmartphone, provideLucideIcons } from '@lucide/angular';
import { beforeEach, describe, expect, it } from 'vitest';
import { ScrollPositionService } from '@/core/services/scroll-position.service';
import { AppLayout } from './app.layout';

@Component({
  selector: 'app-topbar',
  template: '<header>Test topbar</header>',
})
class TestTopbar {}

@Component({
  selector: 'app-chat-widget',
  template: '',
})
class TestChatWidget {}

@Component({
  selector: 'app-test-page',
  template: '<p>Test page</p>',
})
class TestPage {}

const routes: Routes = [
  {
    path: '',
    component: AppLayout,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: TestPage },
      { path: 'about', component: TestPage },
      { path: 'pricing', component: TestPage },
      { path: 'download', component: TestPage },
      { path: 'therapy', component: TestPage },
      { path: 'notfound', component: TestPage },
    ],
  },
  { path: '**', redirectTo: '/notfound' },
];

describe('AppLayout Download App banner', () => {
  let harness: RouterTestingHarness;
  let router: Router;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(routes),
        provideLucideIcons(LucideSmartphone),
        { provide: ScrollPositionService, useValue: {} },
      ],
    });

    TestBed.overrideComponent(AppLayout, {
      set: {
        imports: [RouterOutlet, RouterLink, LucideDynamicIcon, TestTopbar, TestChatWidget],
      },
    });

    await TestBed.compileComponents();
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  function root(): HTMLElement {
    return harness.fixture.nativeElement as HTMLElement;
  }

  function banners(): NodeListOf<HTMLAnchorElement> {
    return root().querySelectorAll('a[aria-label="Download App"]');
  }

  it('renders exactly once before topbar after root redirect to Home', async () => {
    await harness.navigateByUrl('/');
    await harness.fixture.whenStable();

    expect(router.url).toBe('/home');
    expect(banners()).toHaveLength(1);

    const shell = root().querySelector('#calmi-app-shell') as HTMLElement;
    const banner = banners()[0];
    const topbar = shell.querySelector('app-topbar') as HTMLElement;

    expect(banner.getAttribute('href')).toBe('/download');
    expect(banner.classList).toContain('bg-sunken');
    expect(banner.classList).toContain('focus-visible:ring-2');
    expect(banner.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(Array.from(shell.children).indexOf(banner)).toBeLessThan(Array.from(shell.children).indexOf(topbar));
  });

  it('keeps banner visible for Home/About query and fragment URLs', async () => {
    await harness.navigateByUrl('/home?source=test#featured');
    await harness.fixture.whenStable();
    expect(router.url).toBe('/home?source=test#featured');
    expect(banners()).toHaveLength(1);

    await harness.navigateByUrl('/about?source=test#team');
    await harness.fixture.whenStable();
    expect(router.url).toBe('/about?source=test#team');
    expect(banners()).toHaveLength(1);
  });

  it('hides banner on every non-Home/About route while layout persists', async () => {
    for (const url of ['/pricing', '/download', '/therapy']) {
      await harness.navigateByUrl(url);
      await harness.fixture.whenStable();
      expect(banners(), url).toHaveLength(0);
    }
  });

  it('hides banner for strict trailing-slash URLs redirected to NotFound', async () => {
    await harness.navigateByUrl('/home/');
    await harness.fixture.whenStable();
    expect(router.url).toBe('/notfound');
    expect(banners()).toHaveLength(0);

    await harness.navigateByUrl('/about/');
    await harness.fixture.whenStable();
    expect(router.url).toBe('/notfound');
    expect(banners()).toHaveLength(0);
  });
});
