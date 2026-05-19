import { Injectable, signal, computed, effect } from '@angular/core';
import { updatePreset } from '@primeuix/themes';

export type ThemeMode = 'light' | 'dark' | 'auto';

const PRIMARY_PALETTE = {
  50: '#f5f0fa',
  100: '#ebe1f5',
  200: '#d4c2ea',
  300: '#bda3df',
  400: '#a985d4',
  500: '#967BB6',
  600: '#7c6499',
  700: '#634f7d',
  800: '#4a3b5e',
  900: '#32273f',
  950: '#1a1420',
};

const PRIMARY_PALETTE_DARK = {
  50: '#1a1420',
  100: '#32273f',
  200: '#4a3b5e',
  300: '#634f7d',
  400: '#7c6499',
  500: '#4E0E99',
  600: '#a985d4',
  700: '#bda3df',
  800: '#d4c2ea',
  900: '#ebe1f5',
  950: '#f5f0fa',
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _mode = signal<ThemeMode>((localStorage.getItem('calmi-theme') as ThemeMode) || 'light');
  readonly mode = this._mode.asReadonly();

  darkTheme = computed(() => {
    const m = this.mode();
    if (m === 'auto') return window.matchMedia('(prefers-color-scheme: dark)').matches;
    return m === 'dark';
  });

  constructor() {
    // Apply dark mode class
    effect(() => {
      const isDark = this.darkTheme();
      this.applyDarkMode(isDark);
    });

    // Persist mode
    effect(() => localStorage.setItem('calmi-theme', this.mode()));

    // Apply primary color on startup
    this.applyTheme();

    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.mode() === 'auto') {
        this.applyDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
      }
    });
  }

  toggle(): void {
    const next: ThemeMode = this.mode() === 'light' ? 'dark' : this.mode() === 'dark' ? 'auto' : 'light';
    this._mode.set(next);
  }

  private applyDarkMode(isDark: boolean): void {
    const el = document.documentElement;
    if ('startViewTransition' in document) {
      (document as any).startViewTransition(() => el.classList.toggle('app-dark', isDark));
    } else {
      el.classList.toggle('app-dark', isDark);
    }
  }

  private applyTheme(): void {
    updatePreset({
      semantic: {
        primary: PRIMARY_PALETTE,
        colorScheme: {
          light: { primary: PRIMARY_PALETTE },
          dark: { primary: PRIMARY_PALETTE_DARK },
        },
      },
    });
  }
}
