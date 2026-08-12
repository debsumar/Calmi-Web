---
name: angular-apply-typography-color-system
description: Authoritative Angular typography, color, palette, font, theming, dark mode, styling, Tailwind, PrimeNG tokens, and design tokens system. Use when creating, editing, or reviewing visible UI; choosing colors, typography, fonts, sizes, weights, surfaces, or styling; or fixing Tailwind, PrimeNG, theming, dark-mode, and accessibility issues.
---

# Typography and Color Design System

## Typography

### Approved font roles

- Use Bricolage Grotesque through `--font-sans` (`font-sans`). `src/tailwind.css` defines `--font-sans: 'Bricolage Grotesque', sans-serif`; `index.html` loads weights 400, 600, 700, 800.
- Use one family by role, never by screen: Bricolage Grotesque for all product UI unless a centrally approved token says otherwise. Do not invent `font-bricolage`; it is currently not defined.
- Do not use `font-light` or `font-medium` as a new convention until corresponding weights are loaded. Existing uses are debt, not an approval.
- Prefer named typography utilities/aliases when available. Keep responsive sizing in the token or component role, not ad hoc per template.

### Type scale

| Element role | De facto/current pattern | Required convention | Weight / rhythm |
|---|---|---|---|
| Page hero / page title `h1` | `text-3xl md:text-5xl`; other pages reach `text-5xl md:text-7xl` or `text-4xl md:text-6xl` | `text-3xl md:text-5xl` | 700, `leading-tight`; `tracking-tight` only for display |
| Onboarding question `h2` | `text-3xl md:text-5xl` | `text-3xl md:text-5xl` | 700, `leading-tight` |
| Section title `h2` | Mostly `text-3xl md:text-4xl`; sound sections use `text-2xl`/`md:text-3xl` | `text-3xl md:text-4xl` | 700 |
| Card title | `text-base md:text-lg` in list cards; `text-2xl` in marketing/plan cards | `text-lg`; use `text-2xl` only for a marketing feature title | 700 |
| Body | Usually inherited/base | `text-base` | 400/normal, readable line height |
| Lead body | `text-lg`; about hero uses `text-xl leading-relaxed` | `text-lg`, `text-xl` only for a page-intro token | 400, `leading-relaxed` |
| Caption / metadata | `text-xs`; four `text-[10px]` occurrences | `text-xs`; replace arbitrary 10px | 400/600 as needed |
| Button label | Shared solid `text-base`, outline `text-lg`, filters `text-xs` | `text-base` for primary actions; `text-xs` only compact controls | 600 |
| Small control text | `text-xs` | `text-xs`; never below 11px for normal UI | 600 |

The inventory contains `text-xs` 8 times, `text-sm` 38, `text-base` 7, `text-lg` 15, `text-xl` 6, `text-2xl` 13, `text-3xl` 16, `text-4xl` 12, `text-5xl` 7, `text-6xl` once, `text-7xl` once. It also contains `text-[10px]` four times; those are migration targets, not a role. Use the role convention above instead of preserving four competing hero scales.

### Emphasis and decoration

- Use `font-bold`/`font-extrabold` only for headings or deliberate emphasis; use 600 for controls and metadata where needed. No 900.
- Never bold whole paragraphs, italicize UI/control/error copy, use decorative underlines, or turn ordinary labels into sentence-wide caps.
- Keep body tracking normal. `tracking-tight` belongs to display titles; `tracking-wide`/`tracking-wider` belongs only to short labels where legibility survives.
- Do not put text in fixed-height containers that can clip at responsive sizes. Do not justify UI prose.

### Readability and accessibility

- Preserve responsive wrapping and browser text scaling; test at 200% text size and narrow widths.
- Text and meaningful icons must meet WCAG 2.2 AA: 4.5:1 for normal body text and 3:1 for large text. Verify the composited color, not the token name.
- Never communicate status, selection, validation, or error by color alone; add text, icon, shape, pattern, or state semantics.
- Keep focus indicators visible and keyboard reachable. Do not trade contrast or focus visibility for a decorative effect.

## Color and Theme Architecture

### Token pipeline and accessors

One pipeline only: seed `#967BB6` → PrimeNG `palette(seed)` → Aura semantic `{primary.*}` references → runtime `updatePreset()` → CSS variables → Tailwind bridge and PrimeNG components.

- `src/app/core/theme/calmi-preset.ts` owns `SEED_PRIMARY = '#967BB6'` and the Aura preset.
- `src/app/core/services/theme.service.ts` owns runtime seed changes. Call `ThemeService.setPrimary(seed)`; do not set component colors, CSS variables, or a second palette directly.
- Custom templates use `bg-brand`, `text-brand`, `border-brand`, `ring-brand`, `*-brand-light`, `*-brand-dark`, and Calmi roles: `bg-canvas`, `bg-surface`, `bg-elevated`, `bg-sunken`, `border-hairline`, `bg-glass`, `bg-brand-soft`, `bg-brand-deep`, and `bg-accent-*`. Precise primary stops use `var(--p-primary-50)` through `var(--p-primary-950)` only when the semantic role requires a stop.
- Calmi role tokens are scheme-aware through `.app-dark`. PrimeUI `surface-N` utilities are NOT scheme-aware; never use them for dark-mode surfaces or assume they flip with `.app-dark`.
- PrimeNG components use PrimeNG semantic tokens/components. Do not override them with raw CSS or arbitrary Tailwind colors.
- Raw hex is forbidden in templates/components. Central preset/bridge literals, contrast math, and exact third-party vendor marks are controlled exceptions; they are not a license for view code.

### Calmi role token reference

Nothing in this table is a hardcoded color. Every role is a `color-mix()` off the live brand
palette, so changing the seed re-themes all of it at runtime with no rebuild. `white`, `black`
and `transparent` are anchors, not brand decisions.

| Utility role | Light derivation | Dark derivation |
|---|---|---|
| `bg-canvas` | brand 5% + white | brand 7% + black |
| `bg-surface` | `white` | brand 32% + black |
| `bg-elevated` | `white` | brand 13% + black |
| `bg-sunken` | brand 10% + white | brand 19% + black |
| `bg-sunken-alt` | brand 15% + white | brand 13% + black |
| `border-hairline` | brand 12% + white | brand 40% + black |
| `bg-glass` | white 60% + transparent | `elevated` 55% + transparent |
| `bg-brand-soft` | `--p-primary-400` | same |
| `bg-brand-deep` | `--p-primary-600` | same |
| `bg-accent-coral` | `--p-coral-500` | same |
| `bg-accent-gold` | `--p-gold-500` | same |
| `bg-accent-pink` | `--p-pink-500` | same |
| `bg-hero` | brand 92% + white | same |
| `from-hero-grad-from` | dark-only | brand 19% + black |
| `to-hero-grad-to` | dark-only | brand 9% + black |
| `bg-brand-night` | dark-only | brand 28% + black |
| `from-player-from` | dark-only | brand 11% + black |
| `to-player-to` | dark-only | brand 16% + black |
| `shadow-card` | black 25% | black 50% |
| `shadow-player` | black 10% | black 40% |
| `drop-shadow-accent-coral` | `accent-coral` 30% | same |
| `drop-shadow-accent-gold` | `accent-gold` 20% | same |

`brand-soft`/`brand-deep` bridge to `--p-primary-400`/`--p-primary-600`. Accents are registered as
primitive palettes in `core/theme/calmi-preset.ts` (`SEED_ACCENTS`), which emits `--p-coral-*`,
`--p-gold-*` and `--p-pink-*` — so accents are theme tokens too, re-themeable through
`updatePreset()`. The only literals allowed in `src/tailwind.css` are the first-paint fallbacks in
the `var(--p-*, #hex)` bridges, which cover the window before PrimeNG injects its stylesheet.

Mix percentages replaced the previous hand-picked hexes (`#f5f3f0`, `#2a2a40`, `#090514`, …). They
approximate the former values rather than reproducing them exactly; the seed-tracking behaviour is
the point. Retune the percentage, never the color.

Two specificity rules that are easy to get wrong: the dark override must be
`:root[class*="app-dark"]` (0,2,0) because plain `:root` is (0,1,0) and would win against a
`:where()` selector, silently leaving every role at its light value in dark mode. And `color-mix()`
needs no `@supports` fallback here — Tailwind 4 already requires browsers that support it.

Use `dark:` only with decorative dark-only stops. Role surfaces (`canvas`, `surface`, `elevated`, `sunken`, `sunken-alt`, `hairline`, `glass`) flip through `.app-dark`, not PrimeUI `surface-N` utilities.

### Seed-generated schemes

The real seed and generated primary scale are:

| Stop | Value | Bridge / meaning |
|---:|---|---|
| 50 | `#faf8fb` | `--p-primary-50` |
| 100 | `#e6dfed` | `--p-primary-100` |
| 200 | `#d2c6e0` | `--p-primary-200` |
| 300 | `#beadd2` | `--p-primary-300`, `--color-brand-light` |
| 400 | `#aa94c4` | `--p-primary-400` |
| 500 | `#967bb6` | `--p-primary-500`, `--color-brand` |
| 600 | `#80699b` | `--p-primary-600` |
| 700 | `#69567f` | `--p-primary-700`, `--color-brand-dark` |
| 800 | `#534464` | `--p-primary-800` |
| 900 | `#3c3149` | `--p-primary-900` |
| 950 | `#261f2e` | `--p-primary-950` |

Generate this scale from one seed. Never hand-author separate light and dark primary 50..950 arrays, select a literal hue by scheme, or make a near-purple substitute. Aura semantic values must keep `{primary.*}` references so `setPrimary()` reaches PrimeNG components.

```ts
// src/app/core/theme/calmi-preset.ts — central system only
const SEED_PRIMARY = '#967BB6';
export const CalmiPreset = definePreset(Aura, {
  semantic: { primary: palette(SEED_PRIMARY) },
  // Component/semantic values reference {primary.*}; no per-component hex.
});
```

### Dynamic and system color policy

- Light, dark, and `auto` are appearance modes, not separate brand systems. `ThemeService` stores `light | dark | auto`, reads `matchMedia` for `auto`, and toggles `.app-dark` on `document.documentElement`.
- Tailwind dark variant is `@variant dark (&:where([class*="app-dark"], [class*="app-dark"] *))`. PrimeNG uses `darkModeSelector: '.app-dark'`.
- Use `dark:` only for a deliberate custom-element role that has no semantic PrimeNG/surface token. Do not duplicate dark palettes in component TypeScript or templates.
- Runtime seed personalization enters through `ThemeService.setPrimary()` and `updatePreset()`, never through view-local literals. Every new appearance source expands the light/dark/auto and contrast test matrix.

### Appearance contract

| Concern | Required owner | View usage |
|---|---|---|
| Brand primary | `SEED_PRIMARY` → `palette()` → `--p-primary-*` | `bg-brand`, `text-brand`, `border-brand` |
| Brand bridge | `--color-brand` → `--p-primary-500`; `--color-brand-light` → `--p-primary-300`; `--color-brand-dark` → `--p-primary-700` | Named Tailwind utilities |
| PrimeNG appearance | Aura semantic tokens with `{primary.*}` and surface tokens | PrimeNG component API/tokens |
| Neutral canvas/card/control | Calmi role layer | `bg-canvas`, `bg-surface`, `bg-elevated`, `bg-sunken`, `border-hairline`, `bg-glass` |
| Custom dark appearance | `.app-dark` selector | `dark:` only for decorative dark-only stops or roles with no Calmi token |

Do not use `bg-primary`/`text-primary` from `tailwindcss-primeui` in custom app templates; timing issues make `bg-brand`/`text-brand` the project choice. Any filled color must have an intentional readable foreground. Recheck contrast after changing seed, surface, opacity, or font size.

### Hard rules

- Reference brand tokens for brand color. No raw hex, `rgb()`, `rgba()`, `hsl()`, or arbitrary color utilities in templates/components.
- Reference Calmi role tokens for surfaces: `bg-canvas`, `bg-surface`, `bg-elevated`, `bg-sunken`, `border-hairline`, and `bg-glass`. Do not encode light/dark canvas, card, popover, border, or control palettes in component TypeScript.
- PrimeUI `surface-N` utilities are NOT scheme-aware. Do not use them for dark-mode surfaces; use Calmi roles instead.
- Use PrimeNG semantic tokens for PrimeNG components. Do not fight Aura with component-local CSS or literal primary scales.
- Do not use color alone for meaning. Do not hide focus, disabled, selected, or error state behind contrast-poor color.
- Check WCAG 2.2 AA: 4.5:1 body text, 3:1 large text.

### Enforcement pairs

Reject actual inventory debt; use semantic accessors instead:

```html
<!-- Bad: exact source line features/home/pages/home/home.component.html:2 -->
<section class="relative w-full overflow-hidden bg-[#9b8abf] dark:bg-gradient-to-b dark:from-[#1b0d36] dark:to-[#0c0517] min-h-[400px] md:min-h-[500px] flex items-center justify-center">...</section>

<!-- Good: retain gradient direction; use existing emitted semantic utilities -->
<section class="relative w-full overflow-hidden bg-hero dark:bg-gradient-to-b dark:from-hero-grad-from dark:to-hero-grad-to min-h-[400px] md:min-h-[500px] flex items-center justify-center">...</section>
```

```html
<!-- Bad: exact source line features/home/pages/home/home.component.html:86 -->
<div class="bg-gradient-to-b from-[#9b8abf] to-[#7c6499] dark:from-brand dark:to-[#2d2550] rounded-2xl p-8 text-white flex flex-col items-center">...</div>

<!-- Good: brand light endpoint; registered dark-only decorative stops -->
<div class="bg-gradient-to-b from-hero to-brand-deep dark:from-brand dark:to-brand-night rounded-2xl p-8 text-white flex flex-col items-center">...</div>
```

```html
<!-- Bad: features/sounds/pages/sounds/sounds.component.html:77,83,111 -->
<div class="dark:bg-[#2a2a40]">...</div>

<!-- Good: theme-aware Calmi role utility -->
<div class="bg-surface border border-hairline">...</div>
```

```ts
// Bad: pages/auth/login/login.component.ts:10 — dark palette in component TS
template: `<main class="dark:bg-[#0c0517]">...</main>`;

// Good: no scheme literal in component; semantic surface resolves through .app-dark
template: `<main class="bg-canvas">...</main>`;
```

```css
/* Bad: per-scheme literal primary scales in view/style code */
.component { --primary-light: #beadd2; --primary-dark: #69567f; }

/* Good: one seed, generated palette, Aura {primary.*} references */
.component { color: var(--p-primary-500); }
```

```html
<!-- Bad: sounds.component.html:94 uses undefined font-bricolage; metadata has four text-[10px] occurrences -->
<span class="font-bricolage text-[10px]">Nature</span>

<!-- Good: declared family token + role scale -->
<span class="font-sans text-xs">Nature</span>
```

### Role meaning and balance

- **Primary/brand:** Calmi lavender action, identity, focus, and selected emphasis. Use `*-brand` utilities or PrimeNG semantic primary; do not paint every hero/card full-bleed primary.
- **Surface:** Neutral canvas, card, elevated, popover, control, muted-control, and border roles. Use `bg-canvas`, `bg-surface`, `bg-elevated`, `bg-sunken`, `border-hairline`, and `bg-glass`; add missing semantic roles centrally before using them.
- **Accent:** Coral `#e8724a`, gold `#f5b731`, and pink `#f2a0b0` use named utilities (`bg-accent-coral`, `bg-accent-gold`, `bg-accent-pink`) before use. They are not brand substitutes.
- **Status:** Success, warning, danger, and info need semantic tokens plus non-color cues where meaningful.
- Judge color by semantic role, never by hue, hex, or whichever class is shortest.

### Surface, fixed, and outline roles

Use Calmi roles for neutral fills: canvas → surface/card → elevated/popover → sunken/control → sunken-alt/muted control. Pair every fill with readable semantic text and `border-hairline`. `bg-canvas`, `bg-surface`, `bg-elevated`, `bg-sunken`, `bg-sunken-alt`, and `border-hairline` are scheme-aware through `.app-dark`. PrimeUI `surface-N` utilities are NOT scheme-aware and must not be used for dark-mode surfaces.

### Glass and translucent surfaces

Glass is a first-class approved pattern for overlays, topbars, and floating players. Use `bg-glass backdrop-blur-*` or `bg-surface/70 backdrop-blur-xl` when translucent hierarchy improves a real backdrop. Text over glass must meet WCAG 2.2 AA contrast. Provide an opaque fallback when `prefers-reduced-transparency` is set. Translucent color must come from `--color-glass` or a token with an opacity modifier; never use a raw `rgba()`/`rgb()` literal in view code.

### Interaction states

Use PrimeNG component state tokens or centrally named Tailwind state tokens for hover, pressed, focus-visible, disabled, selected, loading, and invalid states. State must remain perceivable in grayscale and with color-difference disabled. Preserve native keyboard focus and ARIA semantics. Do not fabricate state by swapping to an unrelated hue or opacity-only overlay.

### Decision order

1. Is this a PrimeNG component? Use its semantic token/component API.
2. Is this a neutral surface, text, or border? Use `bg-canvas`, `bg-surface`, `bg-elevated`, `bg-sunken`, `bg-sunken-alt`, or `border-hairline`.
3. Is this Calmi brand identity/action? Use `*-brand` utilities.
4. Is this a precise generated primary stop? Use `var(--p-primary-N)` or a deliberate named alias.
5. Is this an approved accent, status, gradient, scrim, or shadow? Add/use its central semantic token.
6. Is this a custom dark-only exception? Use the `.app-dark`-backed `dark:` role, never a literal palette.
7. If no semantic role exists, stop and add one centrally before styling the view.

### Project element defaults

| Element | Default |
|---|---|
| Page canvas | `bg-canvas` |
| Card / dialog / popover | `bg-surface` / `bg-elevated`; PrimeNG component token for PrimeNG dialog |
| Headings | semantic primary text role; `text-3xl md:text-4xl` section or `text-3xl md:text-5xl` page title |
| Body | semantic secondary/body text role; `text-base` |
| Metadata | muted text role; `text-xs` |
| Brand action | `bg-brand` + readable on-brand text; PrimeNG button uses semantic primary |
| Outline action | `bg-surface` + `border-brand`/`text-brand`; preserve focus ring |
| Status / validation | semantic status token + icon/text/shape cue |
| Nav / shell | `bg-surface` / `bg-canvas`; `.app-dark` controls scheme |

### Quick accessor reference

```html
<!-- Custom HTML: approved token access -->
<section class="bg-surface text-brand-deep border border-hairline">
  <button class="bg-brand text-white hover:bg-brand-deep ring-brand">Calm Me Now</button>
</section>

<!-- Glass overlay: approved first-class treatment -->
<div class="bg-glass backdrop-blur-xl border border-hairline">...</div>

<!-- Brand light/dark role, only when visually intended -->
<span class="text-brand dark:text-brand-light">Lavender</span>

<!-- PrimeNG: use component and semantic token API, not literal classes -->
<p-button label="Continue" severity="primary" />
```

```css
/* Central bridge in src/tailwind.css; fallbacks only belong here. */
--color-brand: var(--p-primary-500, #967bb6);
--color-brand-light: var(--p-primary-300, #beadd2);
--color-brand-dark: var(--p-primary-700, #69567f);
```

```ts
// Runtime seed update: central service only.
this.themeService.setPrimary(seed);
```

### Pairing cheat sheet

| Fill role | Required foreground/state pairing |
|---|---|
| `bg-brand` | readable on-brand/contrast foreground; visible focus. Fixed `--p-primary-500` Tailwind bridge, not Aura's scheme-aware semantic primary. |
| Aura `{primary.500}` (light) / `{primary.400}` (dark) | readable semantic contrast foreground; PrimeNG component token pairing |
| `bg-brand-light` / `{primary.300}` | dark readable text unless contrast check proves otherwise |
| `bg-brand-dark` / `{primary.700}` | light readable text unless contrast check proves otherwise |
| `bg-surface` / `bg-elevated` | readable semantic text role; visible `border-hairline` where needed |
| `bg-sunken` / `bg-sunken-alt` | readable semantic text role; visible `border-hairline` where needed |
| accent coral/gold/pink | named on-accent token when interactive |
| success/warning/danger/info | status text/icon/shape cue, not color alone |
| selected/active | selected token plus label/icon/outline |
| disabled | disabled text plus disabled interaction semantics |
| focus | visible focus ring with sufficient contrast |
| scrim/overlay | semantic scrim and readable foreground beneath/above |

Do not place `text-brand-deep` or `on-brand` assumptions on a colored fill without checking the composited result. Large text may use 3:1; normal body text requires 4.5:1.

### Worked example — session list card

```html
<!-- Bad: current debt from sounds.component.html:77,83,111 -->
<article class="dark:bg-[#2a2a40]">
  <h3 class="text-[10px]">Rain</h3>
</article>

<!-- Good: semantic Calmi surface + hairline + role scale -->
<article class="bg-surface text-brand-deep border border-hairline">
  <h3 class="text-lg font-bold">Rain</h3>
  <span class="text-xs text-brand-dark">Nature</span>
</article>
```

A card title is still a card title when its content changes. Do not choose `text-base`, `text-xl`, or an arbitrary 10px value by screen or mood; use the role, then make a deliberate central scale change if the whole system needs it.

### Quick decision flow

```text
PrimeNG component?       → PrimeNG semantic token/component API.
Neutral surface/text?    → Calmi role utilities: bg-canvas/bg-surface/bg-elevated/bg-sunken/border-hairline.
Brand identity/action?   → bg/text/border/ring-brand*.
Specific primary stop?   → var(--p-primary-N) or approved alias.
Accent/status/effect?    → central semantic token first.
Dark custom exception?    → .app-dark-backed dark: role, no literal.
No role?                 → stop; add token centrally.
```

Background size does not change semantic ownership: gradients, shadows, scrims, SVG fills, and opacity effects also need central tokens.

### Migration recipe — existing literal-hex debt

1. Inventory first. Preserve only central runtime/bridge literals and exact Google vendor SVG marks. Use verification command below for current source counts; counts can differ between literal occurrences and regex matches.
2. Replace brand-ish view values such as `bg-[#9b8abf]` with `bg-brand`; map `#7c6499` to a deliberate generated-stop alias or semantic brand-dark role, not a near-purple literal.
3. Replace light/dark canvas, card, popover, control, border, and pagination literals with `bg-canvas`, `bg-surface`, `bg-elevated`, `bg-sunken`, `bg-sunken-alt`, and `border-hairline`. Never use PrimeUI `surface-N` utilities for dark-mode surfaces.
4. Tokenize coral/gold/pink accents, hero gradient endpoints, scrim, and shadows centrally. Keep Google `#4285F4`, `#34A853`, `#FBBC05`, `#EA4335` vendor marks exact.
5. Replace any runtime color-picker path with `ThemeService.setPrimary(seed)`. Keep `SEED_PRIMARY`, `palette(seed)`, Aura `{primary.*}`, and the Tailwind bridge as one chain.
6. Run contrast checks in light, dark, and changed-seed states; fix semantic foreground pairs, then test focus, disabled, selected, loading, empty, error, dialog, and overlay states.

### Verification gate

PowerShell patterns, runnable from `C:\K4U\Calmi-Web`:

```powershell
# Find raw hex and arbitrary color utilities in source.
Get-ChildItem .\src -Recurse -File -Include *.html,*.ts,*.scss,*.css |
  Select-String -Pattern '#[0-9A-Fa-f]{3,8}|(?:bg|text|border|from|to|ring|shadow|drop-shadow)-\[#'

# Find hardcoded dark palettes and literal dark effects.
Get-ChildItem .\src -Recurse -File -Include *.html,*.ts,*.scss,*.css |
  Select-String -Pattern 'dark:[^\s"'']*\[#|dark:.*rgba\(|dark:.*#[0-9A-Fa-f]'

# Find ad hoc typography and unsupported font utility usage.
Get-ChildItem .\src -Recurse -File -Include *.html,*.ts,*.scss,*.css |
  Select-String -Pattern 'text-\[[^]]+\]|font-(light|medium|bricolage)'

# Confirm approved access patterns exist and inspect violations separately.
Get-ChildItem .\src -Recurse -File -Include *.html,*.ts,*.scss,*.css |
  Select-String -Pattern 'bg-brand|text-brand|bg-canvas|bg-surface|bg-elevated|bg-sunken|border-hairline|bg-glass|setPrimary\('
```

Review hits, excluding `src/tailwind.css` bridge fallbacks, `calmi-preset.ts` seed, `theme.service.ts` contrast math, and exact vendor SVG marks. Zero unexplained view hits required. Confirm link targets, generated stops, `.app-dark` behavior, PrimeNG semantic token resolution, and WCAG 2.2 AA contrast after every palette or typography change.

### Anti-patterns

- Raw hex, `rgb()`, `rgba()`, arbitrary `bg-[#...]`, `dark:from-[#...]`, `dark:bg-[#...]`, or literal SVG colors in app-owned view code.
- `dark:bg-[#1b0d36]`, `dark:from-[#090514]`, `dark:border-[#3a3a50]`, or any hand-coded dark palette in a component/template.
- Per-scheme literal primary 50..950 arrays, a second seed, or a component-local `updatePreset()`/CSS-variable mutation.
- PrimeNG styling through raw CSS/Tailwind overrides instead of Aura semantic tokens and `{primary.*}` references.
- Surface colors through `gray-*`, `white/*`, `black/*`, PrimeUI `surface-N`, or local dark literals when a Calmi role exists.
- Glass implemented with raw `rgba()`/`rgb()` literals or without the required opaque reduced-transparency fallback.
- `text-[10px]` for metadata, one-off hero scales, `font-bricolage` without a declared token, or new `font-light`/`font-medium` without loaded weights.
- Full-bleed primary/accent cards, opacity-only interaction states, invisible focus, color-only status, or contrast below 4.5:1 body / 3:1 large text.
- Local `color-mix()`, alpha overlays, gradients, shadows, or accent literals used to synthesize missing roles at the view boundary.
- Treating current debt as precedent. Inventory evidence describes migration targets, not permission.
