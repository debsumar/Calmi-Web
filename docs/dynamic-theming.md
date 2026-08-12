# Dynamic Theming — Single-Seed Color Palette

Status: implementing
Stack: Angular 22, PrimeNG 22, `@primeuix/themes` 2.0.3, Tailwind CSS 4 (no `@angular/material`)

## Problem

`src/app/core/services/theme.service.ts` declares two literal 11-stop palettes: `PRIMARY_PALETTE` (light) and `PRIMARY_PALETTE_DARK`. The dark one is independently authored, not derived — its `500: #4E0E99` does not match light `500: #967BB6`, so it is not even a reversal of the light scale. Changing brand color means hand-editing 22 hex values.

Separately, almost no component consumes the PrimeNG primary token. Visual brand color comes from Tailwind `--color-brand` / `--color-brand-dark`, hardcoded in `src/tailwind.css`. The two systems are not connected, so updating the PrimeNG preset changes little on screen.

## Principle

One seed color -> one generated tonal scale -> roles mapped per color scheme. This is what Angular Material v20+ does officially (`material-color-utilities` HCT seed, `mat.theme()` emitting `--mat-sys-*` roles wrapped in CSS `light-dark()`, dark mode by flipping `color-scheme`). Two hand-authored themes were only required before v19.

PrimeNG's Aura preset follows the same idea with token references:

```ts
// Aura default semantic.colorScheme.dark.primary
{ color: '{primary.400}', contrastColor: '{surface.900}',
  hoverColor: '{primary.300}', activeColor: '{primary.200}' }
```

Those refs resolve per scheme, so a single `semantic.primary` scale serves both light and dark. Overriding `colorScheme.dark.primary` with a literal scale, as we do now, throws that away.

## Decisions

1. Keep exactly one palette, generated from a seed hex. Delete `PRIMARY_PALETTE_DARK` and the `colorScheme.dark.primary` override; let Aura's refs derive dark.
2. Generate stops with `palette()` from `@primeuix/themes` (no new dependency). Its algorithm is a linear RGB tint/shade (19% steps toward white, 15% toward black), which is not perceptually even and can shift hue on purple/lavender seeds. Accepted for now; escalation path below.
3. Bridge Tailwind to the PrimeNG palette so `bg-brand` and friends follow the seed:
   ```css
   --color-brand: var(--p-primary-500);
   --color-brand-light: var(--p-primary-300);
   --color-brand-dark: var(--p-primary-700);
   ```
   Tailwind 4 emits these into `:root` and utilities reference `var(--color-brand)`, so runtime preset updates propagate. Opacity modifiers (`bg-brand/20`) compile to `color-mix(...)` and still work with a `var()` value.
4. `dark:text-brand-light` is already used in home, pricing, onboarding and about, but `--color-brand-light` was never declared — those classes are currently dead. Declaring it in step 3 fixes them.
5. Seed is a single constant now, but `applyTheme` takes it as a parameter so a color picker can be added later without restructuring.

## Neutral role layer

Surfaces, borders, glass and decorative gradient stops are not hardcoded either. `src/tailwind.css`
derives them from the live brand var with `color-mix`, so one seed drives the entire scheme:

```css
:root                      { --calmi-canvas: color-mix(in srgb, var(--color-brand) 5%, white); }
:root[class*="app-dark"]   { --calmi-canvas: color-mix(in srgb, var(--color-brand) 7%, black); }
```

Two traps, both hit during implementation:

1. The dark override must out-specify `:root`. `:where([class*="app-dark"])` is specificity (0,0,0)
   and loses to `:root` (0,1,0), which silently leaves every role at its light value in dark mode —
   the whole dark theme renders light. Use `:root[class*="app-dark"]` (0,2,0).
2. Mix in `srgb`, not `oklab`. `color-mix(in oklab, C 7%, black)` scales Oklab L and the inverse
   transform cubes it, so 7% resolves to roughly `#000001` rather than a dark tint. The former
   hand-picked hexes were effectively sRGB fractions, so `in srgb` reproduces them (max channel
   distance 29/255 across all 16 roles, verified numerically).

Accents (`coral`, `gold`, `pink`) are registered as primitive palettes in `calmi-preset.ts`, emitting
`--p-coral-*`, `--p-gold-*`, `--p-pink-*` (11 stops each, verified). Views reference
`bg-accent-coral` etc., never a literal.

## Accessibility


WCAG 2.2 AA: 4.5:1 for body text, 3:1 for large text. After any seed change, validate the `contrastColor` / `primary.color` pair in **both** schemes. Pick whichever of white/black scores higher and override `colorScheme.{light,dark}.primary.contrastColor` when the generated mid-tone fails. Target 5–7:1, not the 4.50 boundary.

## Performance

`updatePreset` / `updatePrimaryPalette` rebuild the whole token map, clear the loaded-style cache, and broadcast `theme:change` to every live PrimeNG component, which reloads component CSS. Fine on startup. If a color picker is added, debounce and apply on change/drag-end, never on `input`.

## Out of scope (follow-up)

- 79 literal hex values across 13 files (dark surfaces like `#1b0d36`, one-off shades like `hover:bg-[#7c6499]`). These are immune to any runtime theming and need their own migration pass.
- No custom PrimeNG `surface` palette is configured; Aura defaults apply while components use arbitrary `dark:bg-[#...]` surfaces.

## Escalation path (if lavender looks muddy)

Replace `palette()` with a perceptual generator, keeping the same `updatePrimaryPalette` wiring:

- `culori/fn` — OKLCH, tree-shakable, hue-preserving gamut mapping via `toGamut`/`clampChroma`.
- `@material/material-color-utilities` — HCT `TonalPalette.fromHueAndChroma`, same library Angular Material uses; map stops deliberately (50 -> tone 95 ... 950 -> tone 5).

Pure-CSS alternatives (`oklch(from var(--seed) l c h)`, `color-mix(in oklch, ...)`) cost zero JS but cannot loop, cannot pick an accessible foreground, and relative color syntax is only at ~91% global support. Preview-only.

## Verification

- `npx ng build` clean.
- Light and dark both render brand color; toggle cycles light -> dark -> auto.
- `bg-brand`, `text-brand`, `hover:bg-brand-dark`, `dark:text-brand-light` all resolve to non-empty computed colors.
- Contrast assertion passes for both schemes.
