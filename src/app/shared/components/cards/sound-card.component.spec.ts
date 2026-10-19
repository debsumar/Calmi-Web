// @vitest-environment jsdom
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LucideHeart, LucidePause, LucidePlay, provideLucideIcons } from '@lucide/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundCardComponent } from './sound-card.component';

describe('SoundCardComponent', () => {
  let fixture: ComponentFixture<SoundCardComponent>;
  const root = () => fixture.nativeElement as HTMLElement;
  const buttons = () => Array.from(root().querySelectorAll('button')) as HTMLButtonElement[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SoundCardComponent],
      providers: [provideLucideIcons(LucideHeart, LucidePlay, LucidePause)],
    }).compileComponents();
    fixture = TestBed.createComponent(SoundCardComponent);
    fixture.componentRef.setInput('title', 'Rain');
    fixture.componentRef.setInput('image', 'assets/sound-images/rain.avif');
    fixture.componentRef.setInput('showControls', true);
    fixture.detectChanges();
  });

  it('exposes exactly one "Play Rain" button when idle', () => {
    const play = buttons().filter((b) => b.getAttribute('aria-label') === 'Play Rain');
    expect(play).toHaveLength(1);
  });

  it('emits played once when the single play button is activated', () => {
    const played = vi.fn();
    fixture.componentInstance.played.subscribe(played);
    buttons().find((b) => b.getAttribute('aria-label') === 'Play Rain')!.click();
    expect(played).toHaveBeenCalledTimes(1);
  });

  it('keeps the hover play circle decorative and reveals it on keyboard focus too', () => {
    const circle = root().querySelector('span[aria-hidden="true"].pointer-events-none') as HTMLElement;
    expect(circle).not.toBeNull();
    expect(circle.className).toContain('group-focus-within:opacity-100');
  });

  it('gives every button an explicit type and the like button a >=24px target', () => {
    for (const button of buttons()) {
      expect(button.getAttribute('type')).toBe('button');
    }
    const like = buttons().find((b) => b.getAttribute('aria-label')?.startsWith('Add Rain'))!;
    expect(like.className).toContain('h-8');
    expect(like.className).toContain('w-8');
  });

  it('toggles the like state without starting playback', () => {
    const played = vi.fn();
    fixture.componentInstance.played.subscribe(played);
    buttons().find((b) => b.getAttribute('aria-label')?.startsWith('Add Rain'))!.click();
    fixture.detectChanges();

    const like = buttons().find((b) => b.getAttribute('aria-label')?.startsWith('Remove Rain'))!;
    expect(like.getAttribute('aria-pressed')).toBe('true');
    expect(played).not.toHaveBeenCalled();
  });

  it('shows a pause control instead of a second play control while active', () => {
    fixture.componentRef.setInput('isActive', true);
    fixture.detectChanges();
    const paused = vi.fn();
    fixture.componentInstance.paused.subscribe(paused);

    const pause = buttons().find((b) => b.getAttribute('aria-label') === 'Pause Rain')!;
    pause.click();
    expect(paused).toHaveBeenCalledTimes(1);
    expect(root().querySelector('span[aria-hidden="true"].pointer-events-none')).toBeNull();
  });
});
