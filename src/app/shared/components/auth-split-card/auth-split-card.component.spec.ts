// @vitest-environment jsdom
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LucideX, provideLucideIcons } from '@lucide/angular';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthSplitCardComponent } from './auth-split-card.component';

describe('AuthSplitCardComponent', () => {
  let fixture: ComponentFixture<AuthSplitCardComponent>;
  let originalMatchMedia: typeof window.matchMedia | undefined;

  const root = () => fixture.nativeElement as HTMLElement;
  const dots = () => Array.from(root().querySelectorAll('[aria-label^="Show testimonial"]')) as HTMLButtonElement[];
  const quote = () => root().querySelector('blockquote')!.textContent!;
  const stubMatchMedia = (reduced: boolean) => {
    window.matchMedia = ((query: string) => ({ matches: reduced, media: query }) as MediaQueryList) as typeof window.matchMedia;
  };

  const create = async (reduced: boolean | 'missing' = false) => {
    if (reduced === 'missing') delete (window as { matchMedia?: unknown }).matchMedia;
    else stubMatchMedia(reduced);
    await TestBed.configureTestingModule({
      imports: [AuthSplitCardComponent],
      providers: [provideRouter([]), provideLucideIcons(LucideX)],
    }).compileComponents();
    fixture = TestBed.createComponent(AuthSplitCardComponent);
    fixture.componentRef.setInput('imageSrc', 'assets/welcome.svg');
    fixture.componentRef.setInput('imageAlt', 'Welcome');
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();
  };

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalMatchMedia) window.matchMedia = originalMatchMedia;
    else delete (window as { matchMedia?: unknown }).matchMedia;
  });

  it('carries no unverifiable numeric or credential claims', async () => {
    await create();
    const text = root().textContent ?? '';
    expect(text).not.toMatch(/10k/i);
    expect(text).not.toMatch(/licensed/i);
    expect(text).not.toMatch(/\d+\s*(months?|years?|sessions?)/i);
    expect(root().querySelector('main')?.className).not.toContain('min-h-screen');
  });

  it('gives each testimonial dot a >=24px hit area with a small visual dot inside', async () => {
    await create();
    expect(dots()).toHaveLength(3);
    for (const dot of dots()) {
      expect(dot.className).toContain('h-6');
      expect(dot.className).toContain('min-w-6');
      expect(dot.querySelector('span[aria-hidden="true"]')).not.toBeNull();
    }
    expect(dots()[0].getAttribute('aria-current')).toBe('true');
  });

  it('autoplays and lets the user pause and resume rotation', async () => {
    await create();
    const first = quote();

    vi.advanceTimersByTime(6_000);
    fixture.detectChanges();
    expect(quote()).not.toBe(first);

    const toggle = root().querySelector('button[aria-pressed]') as HTMLButtonElement;
    expect(toggle.textContent).toContain('Pause');
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.textContent).toContain('Play');

    const paused = quote();
    vi.advanceTimersByTime(30_000);
    fixture.detectChanges();
    expect(quote()).toBe(paused);

    // Hover/focus leaving must not override the user's explicit pause.
    fixture.componentInstance.resume();
    vi.advanceTimersByTime(30_000);
    fixture.detectChanges();
    expect(quote()).toBe(paused);

    toggle.click();
    fixture.detectChanges();
    vi.advanceTimersByTime(6_000);
    fixture.detectChanges();
    expect(quote()).not.toBe(paused);
  });

  it('does not autoplay and offers no pause control under prefers-reduced-motion', async () => {
    await create(true);
    const first = quote();
    vi.advanceTimersByTime(30_000);
    fixture.detectChanges();
    expect(quote()).toBe(first);
    expect(root().querySelector('button[aria-pressed]')).toBeNull();
  });

  it('does not throw when matchMedia is unavailable', async () => {
    await expect(create('missing')).resolves.toBeUndefined();
    expect(dots()).toHaveLength(3);
  });

  it('shows the chosen slide when a dot is clicked and stops its timer on destroy', async () => {
    await create();
    dots()[2].click();
    fixture.detectChanges();
    expect(dots()[2].getAttribute('aria-current')).toBe('true');

    fixture.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });
});
