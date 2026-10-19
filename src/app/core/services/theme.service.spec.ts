// @vitest-environment jsdom
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const updatePresetMock = vi.hoisted(() => vi.fn());
// Root cause of the old "Cannot access '__vi_import_1__' before initialization":
// `importOriginal()` on '@primeuix/themes' re-enters the module being mocked while
// theme.service.ts / calmi-preset.ts are still evaluating it (ESM cycle under
// threads + isolate). '@primeuix/themes' is a thin wrapper over '@primeuix/styled',
// so build the mock from '@primeuix/styled' (a different module, no cycle) and
// override only `updatePreset`.
vi.mock('@primeuix/themes', async () => {
  const styled = await import('@primeuix/styled');
  return {
    palette: styled.palette,
    definePreset: styled.definePreset,
    updatePreset: updatePresetMock,
  };
});

import { palette } from '@primeuix/styled';
import { isDarkHour, THEME_STORAGE_KEY, ThemeService } from './theme.service';

type ViewTransitionDocument = { startViewTransition?: (cb: () => void) => unknown };
const viewTransitionDoc = () => document as unknown as ViewTransitionDocument;

const originalMatchMedia = window.matchMedia;

function stubMatchMedia(reduced: boolean): void {
  window.matchMedia = ((query: string) => ({
    matches: reduced && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

function createService(): ThemeService {
  const service = TestBed.inject(ThemeService);
  TestBed.tick();
  return service;
}

describe('auto theme schedule', () => {
  it('uses light mode from 06:00 to 19:59 local time', () => {
    for (const hour of [6, 7, 12, 18, 19]) {
      expect(isDarkHour(hour)).toBe(false);
    }
  });

  it('uses dark mode from 20:00 to 05:59 local time', () => {
    for (const hour of [20, 21, 23, 0, 3, 5]) {
      expect(isDarkHour(hour)).toBe(true);
    }
  });

  it('switches exactly at the boundary hours', () => {
    expect(isDarkHour(5)).toBe(true);
    expect(isDarkHour(6)).toBe(false);
    expect(isDarkHour(19)).toBe(false);
    expect(isDarkHour(20)).toBe(true);
  });
});

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    updatePresetMock.mockClear();
    stubMatchMedia(false);
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.matchMedia = originalMatchMedia;
    delete viewTransitionDoc().startViewTransition;
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('cycles light -> dark -> auto -> light on toggle', () => {
    const service = createService();
    expect(service.mode()).toBe('auto');

    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      service.toggle();
      seen.push(service.mode());
    }
    expect(seen).toEqual(['light', 'dark', 'auto', 'light']);
  });

  it('falls back to auto for an invalid stored value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'solarized');
    expect(createService().mode()).toBe('auto');
  });

  it('restores a valid stored explicit mode and applies it to <html>', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const service = createService();
    expect(service.mode()).toBe('dark');
    expect(document.documentElement.classList.contains('app-dark')).toBe(true);
  });

  it('persists explicit choices but never stores auto', () => {
    const service = createService();
    service.toggle(); // light
    TestBed.tick();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    service.toggle(); // dark
    TestBed.tick();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    service.toggle(); // auto
    TestBed.tick();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('does not crash when storage throws on read or write', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });

    let service!: ThemeService;
    expect(() => { service = createService(); }).not.toThrow();
    expect(service.mode()).toBe('auto');
    expect(() => { service.toggle(); TestBed.tick(); }).not.toThrow();
    expect(service.mode()).toBe('light');
  });

  it('flips auto to dark at 20:00 on the 60s clock tick', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 19, 59, 30));
    const service = createService();
    expect(service.darkTheme()).toBe(false);
    expect(document.documentElement.classList.contains('app-dark')).toBe(false);

    vi.advanceTimersByTime(60_000); // now 20:00:30
    TestBed.tick();
    expect(service.darkTheme()).toBe(true);
    expect(document.documentElement.classList.contains('app-dark')).toBe(true);
  });

  it('flips auto to light at 06:00 on the 60s clock tick', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 5, 59, 30));
    const service = createService();
    expect(service.darkTheme()).toBe(true);
    expect(document.documentElement.classList.contains('app-dark')).toBe(true);

    vi.advanceTimersByTime(60_000); // now 06:00:30
    TestBed.tick();
    expect(service.darkTheme()).toBe(false);
    expect(document.documentElement.classList.contains('app-dark')).toBe(false);
  });

  it('does not let the clock override an explicit light choice', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 19, 59, 30));
    const service = createService();
    service.toggle(); // light
    vi.advanceTimersByTime(60_000);
    TestBed.tick();
    expect(service.darkTheme()).toBe(false);
  });

  it('rejects an invalid hex in setPrimary and accepts a valid one', () => {
    const service = createService();
    updatePresetMock.mockClear();

    service.setPrimary('not-a-colour');
    service.setPrimary('#12345');
    service.setPrimary('123456');
    expect(updatePresetMock).toHaveBeenCalledTimes(0);
    expect(updatePresetMock.mock.calls).toEqual([]);

    service.setPrimary('#336699');
    expect(updatePresetMock).toHaveBeenCalledTimes(1);
    type Payload = { semantic: { primary: Record<number, string>; colorScheme: Record<string, { primary: { contrastColor: string } }> } };
    const payload = updatePresetMock.mock.calls[0][0] as Payload;
    const expected = palette('#336699') as Record<number, string>;
    expect(payload.semantic.primary).toEqual(expected);
    // The seed hex is the 500 stop; 400 is the lighter dark-scheme pair.
    expect(payload.semantic.primary[500]).toBe('#336699');
    expect(payload.semantic.primary[400]).toBe('#5a83ac');
    expect(payload.semantic.colorScheme['light'].primary.contrastColor).toMatch(/^#[0-9a-f]{6}$|^\{surface\.\d+\}$/i);
    expect(payload.semantic.colorScheme['dark'].primary.contrastColor).toBeTruthy();

    service.setPrimary('#abc');
    expect(updatePresetMock).toHaveBeenCalledTimes(2);
    expect((updatePresetMock.mock.calls[1][0] as Payload).semantic.primary).toEqual(palette('#abc'));
  });

  it('uses a view transition for a later change but not for the first apply', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0));
    const startViewTransition = vi.fn((cb: () => void) => cb());
    viewTransitionDoc().startViewTransition = startViewTransition;

    const service = createService();
    expect(startViewTransition).not.toHaveBeenCalled();

    service.toggle(); // light (already light at noon): no visual change
    service.toggle(); // dark
    TestBed.tick();
    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(document.documentElement.classList.contains('app-dark')).toBe(true);
  });

  it('skips the view transition under prefers-reduced-motion but still applies the class', () => {
    stubMatchMedia(true);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0));
    const startViewTransition = vi.fn((cb: () => void) => cb());
    viewTransitionDoc().startViewTransition = startViewTransition;

    const service = createService();
    service.toggle(); // light
    service.toggle(); // dark
    TestBed.tick();

    expect(startViewTransition).not.toHaveBeenCalled();
    expect(document.documentElement.classList.contains('app-dark')).toBe(true);
  });
});
