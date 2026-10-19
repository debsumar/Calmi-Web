import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  LucideArrowRight,
  LucideBrain,
  LucideCircleCheck,
  LucideCloud,
  LucideFaceSlightlyFrowning,
  LucideHeadphones,
  LucideHeart,
  LucideLock,
  LucideMessageCircleHeart,
  LucideMoon,
  LucideMoonStar,
  LucideNotebookPen,
  LucidePlay,
  LucideStethoscope,
  LucideZap,
  provideLucideIcons,
} from '@lucide/angular';
import { HomeComponent } from './home.component';
import { provideAuthServiceStub } from '@/core/services/testing/auth.service.stub';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let getContext: typeof HTMLCanvasElement.prototype.getContext;

  beforeEach(async () => {
    // jsdom has no canvas; the reset player probes getContext. Stub locally and restore in afterEach.
    getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof getContext;

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideAuthServiceStub(),
        provideRouter([]),
        provideLucideIcons(
          LucideArrowRight,
          LucideBrain,
          LucideCircleCheck,
          LucideCloud,
          LucideFaceSlightlyFrowning,
          LucideHeadphones,
          LucideHeart,
          LucideLock,
          LucideMessageCircleHeart,
          LucideMoon,
          LucideMoonStar,
          LucideNotebookPen,
          LucidePlay,
          LucideStethoscope,
          LucideZap,
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    await fixture.whenStable();
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = getContext;
  });

  it('renders the four "What do you need right now?" options', () => {
    const root = fixture.nativeElement as HTMLElement;
    const section = Array.from(root.querySelectorAll('section')).find((s) => s.querySelector('h2')?.textContent?.includes('What do you need'));

    expect(section).toBeDefined();
    expect(Array.from(section!.querySelectorAll('h3')).map((h) => h.textContent?.trim())).toEqual([
      'Write it out',
      'Talk it through',
      'Sleep better',
      'Get support',
    ]);
    expect(section?.textContent).toContain('Journal your thoughts.');
    expect(section?.textContent).toContain('Talk with Rumi AI.');
    expect(section?.textContent).toContain('Relax and fall asleep faster.');
    expect(section?.textContent).toContain('Connect with an expert.');
  });

  it('links every shipped option to its route, journaling included', () => {
    const root = fixture.nativeElement as HTMLElement;
    const section = Array.from(root.querySelectorAll('section')).find((s) => s.querySelector('h2')?.textContent?.includes('What do you need'));
    const hrefs = Array.from(section!.querySelectorAll('a')).map((a) => a.getAttribute('href'));

    expect(hrefs).toEqual(['/journal', '/rumi-ai', '/sleep', '/experts/wellness-quiz']);
    expect(section?.textContent).not.toContain('Coming soon');
  });

  it('renders the footer with real routes as links and unshipped pages as non-link "Coming soon"', () => {
    const footer = (fixture.nativeElement as HTMLElement).querySelector('footer')!;

    const hrefs = Array.from(footer.querySelectorAll('a[href]')).map((a) => a.getAttribute('href'));
    for (const route of ['/experts', '/sleep', '/pricing', '/about', '/privacy', '/terms']) {
      expect(hrefs).toContain(route);
    }
    for (const missing of ['/features', '/contact', '/blog', '/faq']) {
      expect(hrefs).not.toContain(missing);
    }
    const soon = Array.from(footer.querySelectorAll('[aria-disabled="true"]')).map((el) => el.textContent?.replace(/\s+/g, ' ').trim());
    expect(soon).toEqual([
      'Features (Coming soon)',
      'Follow Us (Coming soon)',
      'Blog (Coming soon)',
      'FAQ (Coming soon)',
    ]);
    expect(footer.textContent).toContain('© 2026 Calmi');
  });

  it('greets by first name and tolerates non-string full_name metadata', () => {
    const home = fixture.componentInstance;
    const auth = home.authService as unknown as { currentUser: { set(v: unknown): void } };

    auth.currentUser.set({ email: 'jo.doe@example.com', user_metadata: { full_name: 'Jo Marie Doe' } });
    expect(home.getUserFirstName()).toBe('Jo');
    auth.currentUser.set({ email: 'jo.doe@example.com', user_metadata: { full_name: 42 } });
    expect(home.getUserFirstName()).toBe('jo.doe');
    auth.currentUser.set({ email: 'jo.doe@example.com', user_metadata: { full_name: { first: 'Jo' } } });
    expect(home.getUserFirstName()).toBe('jo.doe');
    auth.currentUser.set({ email: 'jo.doe@example.com', user_metadata: {} });
    expect(home.getUserFirstName()).toBe('jo.doe');
    auth.currentUser.set(null);
    expect(home.getUserFirstName()).toBe('');
  });

  it('keeps the original One-Minute Reset section content', () => {
    const root = fixture.nativeElement as HTMLElement;
    const resetSection = Array.from(root.querySelectorAll('section')).find((section) => section.textContent?.includes("Don't fix everything."));

    expect(resetSection).toBeDefined();
    expect(resetSection?.querySelector('h2')?.textContent).toContain("Don't fix everything.");
    expect(resetSection?.querySelector('h2')?.textContent).toContain('Take a moment.');
    expect(resetSection?.querySelector('h3')?.textContent).toContain('One-Minute Reset');
    expect(resetSection?.textContent).toContain('Listen. Breathe. Reset.');
    expect(resetSection?.textContent).toContain('Guided Audios');
    expect(resetSection?.textContent).toContain('Soothing Sounds');
    expect(resetSection?.textContent).toContain('Feel Better');
    expect(resetSection?.textContent).toContain('Instant Relief');
  });
});
