// @vitest-environment jsdom
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideLucideIcons, LucideCircleAlert, LucideVolume2, LucideX } from '@lucide/angular';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceSessionOverlayComponent } from './voice-session-overlay.component';
import { VoiceSessionService } from '../../services/voice-session.service';
import { VoiceSessionAdapter } from '../../services/voice-session.adapter';

describe('VoiceSessionOverlayComponent', () => {
  let fixture: ComponentFixture<VoiceSessionOverlayComponent>;
  let voice: VoiceSessionService;

  beforeEach(async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }));
    await TestBed.configureTestingModule({
      imports: [VoiceSessionOverlayComponent],
      providers: [VoiceSessionService, VoiceSessionAdapter, provideLucideIcons(LucideCircleAlert, LucideVolume2, LucideX)],
    }).compileComponents();
    fixture = TestBed.createComponent(VoiceSessionOverlayComponent);
    voice = TestBed.inject(VoiceSessionService);
    fixture.detectChanges();
  });

  // The builder runs Vitest with `isolate: false`, so spec files share a worker
  // global. Without this the reduced-motion stub above leaks into later files.
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens as a non-modal dialog and moves focus into End', async () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    voice.start(trigger);
    fixture.detectChanges();
    await fixture.whenStable();

    const overlay = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    const end = fixture.nativeElement.querySelector('button[aria-label="End voice conversation"]') as HTMLButtonElement;
    expect(document.activeElement).toBe(end);
    expect(overlay.getAttribute('aria-modal')).toBeNull();
    expect(end).not.toBeNull();
  });

  it('does not trap keyboard focus inside the voice controls', async () => {
    voice.start();
    fixture.detectChanges();
    await fixture.whenStable();

    const end = fixture.nativeElement.querySelector('button[aria-label="End voice conversation"]') as HTMLButtonElement;
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    end.dispatchEvent(tab);

    expect(tab.defaultPrevented).toBe(false);
  });

  it('ends from the explicit End control and restores focus to the trigger', async () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    voice.start(trigger);
    fixture.detectChanges();

    const end = fixture.nativeElement.querySelector('button[aria-label="End voice conversation"]') as HTMLButtonElement;
    end.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(voice.isActive()).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('ends on Escape and restores focus to the trigger', async () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    voice.start(trigger);
    fixture.detectChanges();
    const overlay = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;

    overlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(voice.isActive()).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('toggles mute and does not dismiss when the scrim is clicked', () => {
    voice.start();
    fixture.detectChanges();
    const mute = fixture.nativeElement.querySelector('button[aria-label="Mute microphone"]') as HTMLButtonElement;
    mute.click();
    expect(voice.isMuted()).toBe(true);

    const overlay = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    overlay.click();
    expect(voice.isActive()).toBe(true);
  });


  it('renders microphone errors with an alert and retry affordance', () => {
    const adapter = TestBed.inject(VoiceSessionAdapter);
    vi.spyOn(adapter, 'start').mockImplementation((callbacks) => {
      callbacks.onError('not-allowed');
      return true;
    });

    voice.start();
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('.voice') as HTMLElement;
    const status = fixture.nativeElement.querySelector('.voice__status') as HTMLElement;
    const caption = fixture.nativeElement.querySelector('.voice__caption') as HTMLElement;
    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    const retry = fixture.nativeElement.querySelector('button[aria-label="Retry microphone access"]') as HTMLButtonElement;
    const end = fixture.nativeElement.querySelector('button[aria-label="End voice conversation"]') as HTMLButtonElement;
    const orbSlot = fixture.nativeElement.querySelector('.orb-slot') as HTMLElement;
    expect(overlay).not.toBeNull();
    expect(getComputedStyle(overlay).overflowY).toBe('auto');
    // jsdom serialises a zero length without a unit.
    expect(['0', '0px']).toContain(getComputedStyle(overlay).minBlockSize);
    expect(overlay.classList).not.toContain('justify-center');
    expect(orbSlot.classList).not.toContain('h-[200px]');
    expect(status).not.toBeNull();
    expect(caption).not.toBeNull();
    expect(alert).not.toBeNull();
    expect(alert.textContent).toContain('Microphone access was blocked');
    expect(retry).not.toBeNull();
    expect(retry.getAttribute('class')).toContain('min-h-11');
    expect(end).not.toBeNull();
  });

  it('applies the reduced-motion class', () => {
    voice.start();
    fixture.detectChanges();
    const overlay = fixture.nativeElement.querySelector('.voice') as HTMLElement;
    expect(overlay.classList.contains('reduce-motion')).toBe(true);
  });

  it('keeps the orb isolated and uses its semantic core token', () => {
    voice.start();
    fixture.detectChanges();

    const orb = fixture.nativeElement.querySelector('.orb--a') as HTMLElement;
    const styles = (VoiceSessionOverlayComponent as unknown as { ɵcmp?: { styles?: string | string[] } }).ɵcmp?.styles;
    const styleText = Array.isArray(styles) ? styles.join('\n') : styles ?? '';

    expect(orb).not.toBeNull();
    expect(orb.querySelectorAll('.layer')).toHaveLength(3);
    expect(orb.querySelector('.core')).not.toBeNull();
    expect(styleText).toContain('isolation: isolate');
    expect(styleText).toContain('color-voice-core');
    expect(styleText).not.toContain('color-surface');
  });
});
