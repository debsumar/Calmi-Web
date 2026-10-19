// @vitest-environment jsdom
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnimateOnScrollDirective } from './animate-on-scroll.directive';

@Component({
  imports: [AnimateOnScrollDirective],
  template: `<div appAnimateOnScroll id="target" style="opacity: 0">content</div>`,
})
class HostComponent {}

class FakeObserver {
  static instances: FakeObserver[] = [];
  disconnected = false;
  constructor(public callback: IntersectionObserverCallback) { FakeObserver.instances.push(this); }
  observe(): void {}
  disconnect(): void { this.disconnected = true; }
}

describe('AnimateOnScrollDirective', () => {
  let originalMatchMedia: typeof window.matchMedia | undefined;

  const mount = async (): Promise<{ fixture: ComponentFixture<HostComponent>; target: HTMLElement }> => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    TestBed.tick();
    return { fixture, target: fixture.nativeElement.querySelector('#target') as HTMLElement };
  };

  const stubMatchMedia = (reduced: boolean) => {
    window.matchMedia = ((query: string) => ({ matches: reduced, media: query }) as MediaQueryList) as typeof window.matchMedia;
  };

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    FakeObserver.instances = [];
    vi.useFakeTimers();
    stubMatchMedia(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    if (originalMatchMedia) window.matchMedia = originalMatchMedia;
    else delete (window as { matchMedia?: unknown }).matchMedia;
  });

  it('reveals immediately without IntersectionObserver instead of staying invisible', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { target } = await mount();
    expect(target.style.opacity).toBe('');
    expect(target.classList.contains('stagger-enter')).toBe(true);
  });

  it('reveals without animation under prefers-reduced-motion', async () => {
    stubMatchMedia(true);
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    const { target } = await mount();
    expect(target.style.opacity).toBe('');
    expect(target.classList.contains('stagger-enter')).toBe(false);
  });

  it('stays hidden off-screen until it intersects', async () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    const { target } = await mount();
    expect(target.style.opacity).toBe('0');

    FakeObserver.instances[0].callback([{ isIntersecting: true } as IntersectionObserverEntry], FakeObserver.instances[0] as never);
    expect(target.style.opacity).toBe('');
    expect(target.classList.contains('stagger-enter')).toBe(true);
    expect(FakeObserver.instances[0].disconnected).toBe(true);
  });

  it('falls back to revealing after 1.5s if the observer never fires', async () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    const { target } = await mount();
    expect(target.style.opacity).toBe('0');

    vi.advanceTimersByTime(1_500);
    expect(target.style.opacity).toBe('');
    expect(target.classList.contains('stagger-enter')).toBe(true);
  });

  it('cancels the fallback timer and disconnects on destroy', async () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    const { fixture, target } = await mount();
    fixture.destroy();

    expect(FakeObserver.instances[0].disconnected).toBe(true);
    vi.advanceTimersByTime(2_000);
    expect(target.classList.contains('stagger-enter')).toBe(false);
  });
});
