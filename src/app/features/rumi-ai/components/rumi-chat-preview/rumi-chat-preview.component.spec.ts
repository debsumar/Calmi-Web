// @vitest-environment jsdom
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  provideLucideIcons,
  LucideAudioLines,
  LucideCheckCheck,
  LucideSend,
  LucideUser,
} from '@lucide/angular';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RumiChatPreviewComponent } from './rumi-chat-preview.component';

class IntersectionObserverStub {
  static instances: IntersectionObserverStub[] = [];
  private callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    IntersectionObserverStub.instances.push(this);
  }

  observe(): void {}
  unobserve(): void {}
  readonly disconnect = vi.fn();
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  emit(visible: boolean): void {
    this.callback(
      [{ isIntersecting: visible } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

function advanceNextTimer(
  fixture: ComponentFixture<RumiChatPreviewComponent>,
): void {
  expect(vi.getTimerCount()).toBe(1);
  vi.advanceTimersToNextTimer();
  fixture.detectChanges();
}

function advanceUntil(
  fixture: ComponentFixture<RumiChatPreviewComponent>,
  condition: () => boolean,
  maximumTimers = 120,
): void {
  for (let index = 0; index < maximumTimers && !condition(); index += 1) {
    advanceNextTimer(fixture);
  }
  expect(condition()).toBe(true);
}

describe('RumiChatPreviewComponent', () => {
  let fixture: ComponentFixture<RumiChatPreviewComponent>;
  const originalIntersectionObserver = window.IntersectionObserver;
  const originalMatchMedia = window.matchMedia;

  beforeEach(async () => {
    vi.useFakeTimers();
    IntersectionObserverStub.instances = [];
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: IntersectionObserverStub,
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });

    await TestBed.configureTestingModule({
      imports: [RumiChatPreviewComponent],
      providers: [
        provideLucideIcons(
          LucideAudioLines,
          LucideCheckCheck,
          LucideSend,
          LucideUser,
        ),
      ],
    }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: originalIntersectionObserver,
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
    });
    vi.useRealTimers();
  });

  it('renders the complete static transcript for reduced motion', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    fixture = TestBed.createComponent(RumiChatPreviewComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain(
      'Hi there, I’m Rumi. How are you feeling today?',
    );
    expect(root.textContent).toContain(
      'Honestly, a bit anxious. Work has been piling up',
    );
    expect(root.textContent).toContain('what feels heaviest right now?');
    expect(root.querySelector('.rumi-chat-preview--animated')).toBeNull();
    expect(IntersectionObserverStub.instances).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('renders the complete static transcript without IntersectionObserver', () => {
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: undefined,
    });
    fixture = TestBed.createComponent(RumiChatPreviewComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain(
      'Hi there, I’m Rumi. How are you feeling today?',
    );
    expect(root.textContent).toContain(
      'Honestly, a bit anxious. Work has been piling up',
    );
    expect(root.textContent).toContain('what feels heaviest right now?');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps the preview inert and contains no interactive elements', () => {
    fixture = TestBed.createComponent(RumiChatPreviewComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const inertBlock = root.querySelector('.rumi-chat-preview') as HTMLElement;
    expect(inertBlock.hasAttribute('inert')).toBe(true);
    expect(inertBlock.getAttribute('aria-hidden')).toBe('true');
    expect(
      root.querySelectorAll(
        'button, a, textarea, input, [tabindex], [contenteditable]',
      ),
    ).toHaveLength(0);
    expect(root.querySelector('.sr-only')?.textContent).toContain(
      'Preview of a conversation with Rumi AI',
    );
  });

  it('clears every scheduled loop timer when destroyed', () => {
    fixture = TestBed.createComponent(RumiChatPreviewComponent);
    fixture.detectChanges();
    const observer = IntersectionObserverStub.instances[0];
    observer.emit(true);
    vi.advanceTimersByTime(600 + 800 + 32 * 4);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const transcriptBeforeDestroy = root.textContent;
    const phaseBeforeDestroy = fixture.componentInstance.phase();
    const composerBeforeDestroy = fixture.componentInstance.composerText();
    expect(vi.getTimerCount()).toBe(1);

    fixture.destroy();

    expect(vi.getTimerCount()).toBe(0);
    expect(observer.disconnect).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(120_000);
    expect(fixture.componentInstance.phase()).toBe(phaseBeforeDestroy);
    expect(fixture.componentInstance.composerText()).toBe(composerBeforeDestroy);
    expect(root.textContent).toBe(transcriptBeforeDestroy);
  });

  it('advances the composer typewriter while visible', () => {
    fixture = TestBed.createComponent(RumiChatPreviewComponent);
    fixture.detectChanges();
    IntersectionObserverStub.instances[0].emit(true);

    vi.advanceTimersByTime(600 + 800 + 32 * 4);
    fixture.detectChanges();

    const composer = fixture.nativeElement.querySelector(
      '[data-preview-composer]',
    ) as HTMLElement;
    expect(composer.textContent?.trim()).toBe('Hone');
    expect(composer.textContent).not.toContain("Share what's on your mind...");
  });

  it('pauses off-screen and resumes from the same scripted phase', () => {
    fixture = TestBed.createComponent(RumiChatPreviewComponent);
    fixture.detectChanges();
    const observer = IntersectionObserverStub.instances[0];
    observer.emit(true);
    advanceNextTimer(fixture);
    advanceNextTimer(fixture);

    const root = fixture.nativeElement as HTMLElement;
    const composer = root.querySelector('[data-preview-composer]') as HTMLElement;
    observer.emit(false);
    const pausedText = composer.textContent;
    expect(vi.getTimerCount()).toBe(0);

    vi.advanceTimersByTime(10_000);
    fixture.detectChanges();
    expect(composer.textContent).toBe(pausedText);

    observer.emit(true);
    expect(vi.getTimerCount()).toBe(1);
    advanceNextTimer(fixture);
    expect(composer.textContent?.trim()).toBe('H');
  });

  it('falls back to the finished transcript when the observer cannot be created', () => {
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: class {
        constructor() {
          throw new Error('observer unavailable');
        }
      },
    });
    fixture = TestBed.createComponent(RumiChatPreviewComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.phase()).toBe('final');
    expect(root.querySelectorAll('[data-preview-message]')).toHaveLength(3);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('pauses the loop while the tab is hidden and resumes when it returns', () => {
    fixture = TestBed.createComponent(RumiChatPreviewComponent);
    fixture.detectChanges();
    IntersectionObserverStub.instances[0].emit(true);
    advanceNextTimer(fixture);

    const phaseBefore = fixture.componentInstance.phase();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(30_000);
    fixture.detectChanges();
    expect(fixture.componentInstance.phase()).toBe(phaseBefore);

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(vi.getTimerCount()).toBe(1);
    advanceNextTimer(fixture);
    expect(fixture.componentInstance.phase()).not.toBe(phaseBefore);
  });

  it('runs one timer through sending, reply, reset, and the next greeting', () => {
    fixture = TestBed.createComponent(RumiChatPreviewComponent);
    fixture.detectChanges();
    IntersectionObserverStub.instances[0].emit(true);

    const root = fixture.nativeElement as HTMLElement;
    const messages = () => root.querySelectorAll('[data-preview-message]');
    const send = () => root.querySelector('[data-preview-send]') as HTMLElement;

    expect(vi.getTimerCount()).toBe(1);
    advanceNextTimer(fixture);
    expect(messages()).toHaveLength(1);
    advanceNextTimer(fixture);

    advanceUntil(fixture, () => send().classList.contains('rumi-chat-preview__send--pulsing'));
    expect(messages()).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(1);

    advanceNextTimer(fixture);
    expect(messages()).toHaveLength(2);
    expect(root.textContent).toContain("Share what's on your mind...");
    advanceNextTimer(fixture);
    expect(root.querySelector('[data-preview-typing]')).not.toBeNull();
    advanceNextTimer(fixture);
    expect(messages()).toHaveLength(3);
    advanceNextTimer(fixture);
    expect(root.querySelector('.rumi-chat-preview--resetting')).not.toBeNull();
    advanceNextTimer(fixture);
    expect(messages()).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(1);
    advanceNextTimer(fixture);
    expect(messages()).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(1);
  });
});
