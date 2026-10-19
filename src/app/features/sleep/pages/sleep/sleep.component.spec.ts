import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  LucideAudioLines, LucideChevronDown, LucideChevronLeft, LucideChevronRight, LucideCloudRain,
  LucideEllipsisVertical, LucideFlame, LucideHeart, LucidePause, LucidePlay, LucideRepeat,
  LucideSearch, LucideShuffle, LucideSkipBack, LucideSkipForward, LucideSun, LucideTreePine,
  LucideVolume2, LucideWavesHorizontal, provideLucideIcons,
} from '@lucide/angular';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerService } from '@/core/services/player.service';
import { SleepComponent } from './sleep.component';

class FakeAudio {
  loop = false; volume = 1; playbackRate = 1; duration = NaN; currentTime = 0;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  addEventListener = vi.fn();
}

describe('SleepComponent', () => {
  let fixture: ComponentFixture<SleepComponent>;
  let component: SleepComponent;
  let player: PlayerService;
  const root = () => fixture.nativeElement as HTMLElement;
  const allSoundsSection = () => Array.from(root().querySelectorAll('section'))
    .find((s) => s.querySelector('h2')?.textContent?.includes('All Sounds')) as HTMLElement;
  const rowButtons = () => Array.from(allSoundsSection().querySelectorAll<HTMLButtonElement>('.space-y-4 button.flex-1'));

  beforeEach(async () => {
    vi.stubGlobal('Audio', FakeAudio);
    await TestBed.configureTestingModule({
      imports: [SleepComponent],
      providers: [provideLucideIcons(
        LucideAudioLines, LucideChevronDown, LucideChevronLeft, LucideChevronRight, LucideCloudRain,
        LucideEllipsisVertical, LucideFlame, LucideHeart, LucidePause, LucidePlay, LucideRepeat,
        LucideSearch, LucideShuffle, LucideSkipBack, LucideSkipForward, LucideSun, LucideTreePine,
        LucideVolume2, LucideWavesHorizontal,
      )],
    }).compileComponents();
    fixture = TestBed.createComponent(SleepComponent);
    component = fixture.componentInstance;
    player = TestBed.inject(PlayerService);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('track identity', () => {
    it('gives every track a unique id across both lists', () => {
      const ids = [...component.featuredSounds(), ...component.allSounds()].map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('uses consistent durations for same-title tracks', () => {
      const all = [...component.featuredSounds(), ...component.allSounds()];
      for (const title of ['Heavy Rain', 'Night Ambience', 'Calming Ocean']) {
        const durations = new Set(all.filter((t) => t.title === title).map((t) => t.duration));
        expect(durations.size, title).toBe(1);
      }
    });

    it('highlights only the row that is playing when another list has the same title', () => {
      const featuredHeavyRain = component.featuredSounds().find((t) => t.title === 'Heavy Rain')!;
      const listHeavyRain = component.allSounds().find((t) => t.title === 'Heavy Rain')!;

      component.onRowActivate(featuredHeavyRain, component.featuredSounds());
      fixture.detectChanges();

      expect(component.isCurrentTrack(featuredHeavyRain)).toBe(true);
      expect(component.isCurrentTrack(listHeavyRain)).toBe(false);
      expect(allSoundsSection().querySelectorAll('div.border-brand')).toHaveLength(0);

      component.onRowActivate(listHeavyRain, component.allSounds());
      fixture.detectChanges();

      expect(component.isCurrentTrack(featuredHeavyRain)).toBe(false);
      expect(allSoundsSection().querySelectorAll('div.border-brand')).toHaveLength(1);
    });
  });

  describe('track rows', () => {
    it('are real buttons that play on click and toggle on re-click', () => {
      const first = rowButtons().find((b) => b.textContent?.includes('Heavy Rain'))!;
      expect(first.tagName).toBe('BUTTON');
      expect(first.type).toBe('button');

      first.click();
      fixture.detectChanges();
      expect(player.nowPlaying()?.id).toBe('all-heavy-rain');
      expect(player.isPlaying()).toBe(true);

      first.click();
      expect(player.isPlaying()).toBe(false);
    });

    it('shows tracks without audio as aria-disabled "Coming soon" and does not play them', () => {
      const soon = rowButtons().find((b) => b.textContent?.includes('Night Ambience'))!;
      expect(soon.getAttribute('aria-disabled')).toBe('true');
      expect(soon.textContent).toContain('Coming soon');

      soon.click();
      expect(player.hasTrack()).toBe(false);
    });

    it('has no dead enabled buttons in the All Sounds section', () => {
      const dead = Array.from(allSoundsSection().querySelectorAll<HTMLButtonElement>('button'))
        .filter((b) => !b.disabled && b.getAttribute('aria-label')?.startsWith('More options'));
      expect(dead).toHaveLength(0);
      const pageButtons = Array.from(allSoundsSection().querySelectorAll<HTMLButtonElement>('nav button'));
      expect(pageButtons.filter((b) => !b.hasAttribute('aria-current')).every((b) => b.disabled && b.getAttribute('aria-disabled') === 'true')).toBe(true);
    });

    it('toggles favorite with aria-pressed', () => {
      const fav = allSoundsSection().querySelector<HTMLButtonElement>('button[aria-label="Favorite Heavy Rain"]')!;
      expect(fav.getAttribute('aria-pressed')).toBe('false');
      fav.click();
      fixture.detectChanges();
      expect(fav.getAttribute('aria-pressed')).toBe('true');
      fav.click();
      fixture.detectChanges();
      expect(fav.getAttribute('aria-pressed')).toBe('false');
    });
  });

  describe('vibe filter and search', () => {
    const vibeButtons = () => Array.from(root().querySelectorAll<HTMLButtonElement>('button[aria-pressed]'))
      .filter((b) => ['All Sounds', 'Rain', 'Ocean', 'White Noise'].includes(b.textContent!.replace('Selected', '').trim()));
    const vibe = (label: string) => vibeButtons().find((b) => b.textContent!.replace('Selected', '').trim() === label)!;

    it('filters the list and toggles aria-pressed', () => {
      expect(rowButtons()).toHaveLength(4);
      expect(vibe('All Sounds').getAttribute('aria-pressed')).toBe('true');

      vibe('Rain').click();
      fixture.detectChanges();
      expect(vibe('Rain').getAttribute('aria-pressed')).toBe('true');
      expect(vibe('All Sounds').getAttribute('aria-pressed')).toBe('false');
      expect(rowButtons().map((b) => b.textContent)).toHaveLength(1);
      expect(rowButtons()[0].textContent).toContain('Heavy Rain');
    });

    it('shows an empty state when a vibe has no sounds', () => {
      vibe('White Noise').click();
      fixture.detectChanges();
      expect(rowButtons()).toHaveLength(0);
      expect(allSoundsSection().textContent).toContain('No sounds match');
    });

    it('labels the search input and filters by text', () => {
      const input = root().querySelector<HTMLInputElement>('#sleep-search')!;
      expect(root().querySelector('label[for="sleep-search"]')?.textContent).toContain('Search sounds');

      input.value = 'ocean';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(rowButtons()).toHaveLength(1);
      expect(rowButtons()[0].textContent).toContain('Calming Ocean');
    });
  });

  describe('seekbar', () => {
    const slider = () => root().querySelector<HTMLElement>('[role="slider"]')!;

    beforeEach(() => {
      component.onRowActivate(component.allSounds()[1], component.allSounds()); // Heavy Rain, 45:00
      fixture.detectChanges();
    });

    it('exposes slider semantics', () => {
      const el = slider();
      expect(el.getAttribute('tabindex')).toBe('0');
      expect(el.getAttribute('aria-valuemin')).toBe('0');
      expect(el.getAttribute('aria-valuemax')).toBe('2700');
      expect(el.getAttribute('aria-valuenow')).toBe('0');
      expect(el.getAttribute('aria-valuetext')).toContain('0:00');
    });

    it('seeks from clientX relative to the slider rect, not offsetX', () => {
      const el = slider();
      el.getBoundingClientRect = () => ({ left: 100, width: 200, right: 300, top: 0, bottom: 20, height: 20, x: 100, y: 0, toJSON: () => ({}) });
      el.dispatchEvent(new MouseEvent('click', { clientX: 200, bubbles: true }));
      expect(player.elapsed()).toBe(1350);

      // Click on a nested child must still use the slider (currentTarget) rect.
      el.firstElementChild!.dispatchEvent(new MouseEvent('click', { clientX: 300, bubbles: true }));
      expect(player.elapsed()).toBe(2700);

      el.dispatchEvent(new MouseEvent('click', { clientX: 0, bubbles: true }));
      expect(player.elapsed()).toBe(0);
    });

    it('supports Arrow, Home and End keys', () => {
      const press = (key: string) => {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
        slider().dispatchEvent(event);
        return event;
      };
      press('ArrowRight');
      press('ArrowRight');
      expect(player.elapsed()).toBe(10);
      press('ArrowLeft');
      expect(player.elapsed()).toBe(5);
      press('ArrowLeft');
      press('ArrowLeft');
      expect(player.elapsed()).toBe(0);
      press('End');
      expect(player.elapsed()).toBe(2700);
      press('Home');
      expect(player.elapsed()).toBe(0);
      expect(press('Tab').defaultPrevented).toBe(false);
      expect(press('ArrowUp').defaultPrevented).toBe(true);
    });
  });

  it('clears the shadow-check timeouts on destroy', () => {
    const timers = (component as unknown as { shadowTimers: unknown[] }).shadowTimers.slice();
    expect(timers).toHaveLength(3);
    const clear = vi.spyOn(globalThis, 'clearTimeout');
    fixture.destroy();
    for (const handle of timers) expect(clear).toHaveBeenCalledWith(handle);
    clear.mockRestore();
  });
});
