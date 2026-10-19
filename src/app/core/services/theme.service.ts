import { DestroyRef, Injectable, inject, signal, computed, effect, isDevMode } from '@angular/core';
import { updatePreset, palette } from '@primeuix/themes';
import { SEED_PRIMARY } from '../theme/calmi-preset';

export type ThemeMode = 'light' | 'dark' | 'auto';

/** WCAG 2.2 AA minimum for body text. */
const AA_CONTRAST = 4.5;

/** Aura dark `{surface.900}` resolved, used to measure the dark primary pair. */
const DARK_SURFACE_900 = '#18181b';

interface ForegroundChoice {
  foreground: string;
  ratio: number;
  replaced: boolean;
}

/**
 * Keep in sync with the inline pre-paint script in src/index.html, which reads
 * the same key and applies the same 20:00-06:00 `auto` rule before first paint.
 */
export const THEME_STORAGE_KEY = 'calmi-theme';
/** `auto` follows the user's local clock, not the OS preference. */
const LIGHT_START_HOUR = 6;
const LIGHT_END_HOUR = 20;

/** Re-check the clock often enough that the switch lands within a minute. */
const CLOCK_TICK_MS = 60_000;

/** Light between 06:00 and 19:59 local time, dark from 20:00 to 05:59. */
export function isDarkHour(hour: number): boolean {
  return hour < LIGHT_START_HOUR || hour >= LIGHT_END_HOUR;
}

/** Storage can throw (blocked cookies, Safari private mode, sandboxed iframes). */
function readStored(): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(mode: ThemeMode): void {
  try {
    if (typeof localStorage === 'undefined') return;
    // `auto` is the default, not a choice: store nothing so it keeps tracking the clock.
    if (mode === 'auto') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Persistence is best-effort; the in-memory mode still applies.
  }
}

/** Falls back to the clock-driven `auto` mode until the user picks a mode. */
function storedMode(): ThemeMode {
  const stored = readStored();
  return stored === 'light' || stored === 'dark' ? stored : 'auto';
}

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _mode = signal<ThemeMode>(storedMode());
  readonly mode = this._mode.asReadonly();

  /** Local hour, polled so `auto` flips without a reload. */
  private readonly clockHour = signal(new Date().getHours());

  darkTheme = computed(() => {
    const m = this.mode();
    if (m === 'auto') return isDarkHour(this.clockHour());
    return m === 'dark';
  });

  constructor() {
    // Apply dark mode class
    effect(() => {
      const isDark = this.darkTheme();
      this.applyDarkMode(isDark);
    });

    // Persist the user's explicit choice (never `auto`).
    effect(() => writeStored(this.mode()));

    // Apply primary color on startup
    this.applyTheme();

    const tick = setInterval(() => this.clockHour.set(new Date().getHours()), CLOCK_TICK_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(tick));
  }

  toggle(): void {
    const next: ThemeMode = this.mode() === 'light' ? 'dark' : this.mode() === 'dark' ? 'auto' : 'light';
    this._mode.set(next);
  }

  setPrimary(hex: string): void {
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return;
    this.applyTheme(hex);
  }

  private firstApply = true;

  private applyDarkMode(isDark: boolean): void {
    if (typeof document === 'undefined') return;
    const el = document.documentElement;
    const isFirst = this.firstApply;
    this.firstApply = false;
    const apply = () => el.classList.toggle('app-dark', isDark);

    // No cross-fade on the initial apply (it would flash) or for reduced-motion users.
    if (isFirst || el.classList.contains('app-dark') === isDark || prefersReducedMotion()
      || !('startViewTransition' in document)) {
      apply();
      return;
    }
    (document as Document & { startViewTransition: (callback: () => void) => unknown })
      .startViewTransition(apply);
  }

  private applyTheme(seed: string = SEED_PRIMARY): void {
    const scale = palette(seed) as Record<number, string>;

    // Aura light uses {primary.500} on white, dark uses {primary.400} on {surface.900}.
    const light = this.resolveForeground(scale[500], '#ffffff');
    const dark = this.resolveForeground(scale[400], DARK_SURFACE_900);

    // contrastColor is written unconditionally so a previous seed's override
    // cannot survive the deep merge performed by updatePreset.
    updatePreset({
      semantic: {
        primary: scale,
        colorScheme: {
          light: { primary: { contrastColor: light.foreground } },
          dark: { primary: { contrastColor: dark.replaced ? dark.foreground : '{surface.900}' } },
        },
      },
    });

    if (isDevMode()) {
      this.warnOnLowContrast('light', scale[500], light);
      this.warnOnLowContrast('dark', scale[400], dark);
    }
  }

  private resolveForeground(background: string, defaultForeground: string): ForegroundChoice {
    const defaultRatio = this.getContrastRatio(background, defaultForeground);
    if (defaultRatio >= AA_CONTRAST) {
      return { foreground: defaultForeground, ratio: defaultRatio, replaced: false };
    }

    const white = this.getContrastRatio(background, '#ffffff');
    const black = this.getContrastRatio(background, '#000000');
    return white >= black
      ? { foreground: '#ffffff', ratio: white, replaced: true }
      : { foreground: '#000000', ratio: black, replaced: true };
  }

  private warnOnLowContrast(scheme: ThemeMode, background: string, choice: ForegroundChoice): void {
    if (choice.ratio < AA_CONTRAST) {
      console.warn(
        `[theme] ${scheme} primary ${background} has no AA-compliant foreground; ` +
          `best is ${choice.foreground} at ${choice.ratio.toFixed(2)}:1 (need ${AA_CONTRAST}:1). Pick a different seed.`,
      );
    } else if (choice.replaced) {
      console.warn(
        `[theme] ${scheme} primary ${background} failed AA with the Aura default foreground; ` +
          `swapped to ${choice.foreground} at ${choice.ratio.toFixed(2)}:1.`,
      );
    }
  }

  private getContrastRatio(color1: string, color2: string): number {
    const luminance1 = this.getRelativeLuminance(color1);
    const luminance2 = this.getRelativeLuminance(color2);
    return (Math.max(luminance1, luminance2) + 0.05) / (Math.min(luminance1, luminance2) + 0.05);
  }

  private getRelativeLuminance(hex: string): number {
    const channels = hex.length === 4
      ? hex.slice(1).split('').map((channel) => parseInt(channel + channel, 16))
      : [
          parseInt(hex.slice(1, 3), 16),
          parseInt(hex.slice(3, 5), 16),
          parseInt(hex.slice(5, 7), 16),
        ];
    const [red, green, blue] = channels.map((channel) => {
      const srgb = channel / 255;
      return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  }
}
