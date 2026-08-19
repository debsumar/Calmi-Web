import { definePreset, palette } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/** Seed color for the whole app palette. Lavender. */
export const SEED_PRIMARY = '#967BB6';

/**
 * Accent seeds. These are the only other colors the design system knows about.
 * They live here, in the theme, so views never hardcode them and a single
 * `updatePreset()` can re-theme every accent at runtime.
 */
export const SEED_ACCENTS = {
  coral: '#e8724a',
  gold: '#f5b731',
  pink: '#f2a0b0',
  success: '#2E7D32',
  danger: '#C62828',
} as const;

/**
 * Aura ships `semantic.primary` as `{emerald.*}` (green). Overriding it only at
 * runtime leaves a green first paint, so the seed palette is baked into the
 * preset here, before PrimeNG injects its stylesheet.
 *
 * Aura's scheme-specific tokens (`primary.color`, `highlight.*`, `focusRing.color`)
 * are all `{primary.*}` references, so this one scale drives light and dark.
 *
 * Accents are registered as primitive palettes, which emits `--p-coral-*`,
 * `--p-gold-*` and `--p-pink-*`. Surfaces are not enumerated here: they are
 * derived from the primary palette in `src/tailwind.css` via `color-mix`.
 */
export const CalmiPreset = definePreset(Aura, {
  primitive: {
    coral: palette(SEED_ACCENTS.coral),
    gold: palette(SEED_ACCENTS.gold),
    pink: palette(SEED_ACCENTS.pink),
    success: palette(SEED_ACCENTS.success),
    danger: palette(SEED_ACCENTS.danger),
  },
  semantic: {
    primary: palette(SEED_PRIMARY),
  },
});
