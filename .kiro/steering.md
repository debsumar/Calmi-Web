# Project Steering â€” Calmi-Web

## Overview

Calmi-Web is a wellness/meditation web app built with Angular 22. It provides guided calm sessions, soothing sounds, and wellness coaching.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Angular 22 (standalone, zoneless) |
| UI Library | PrimeNG 22 (Aura preset, PrimeUI license required) |
| Styling | Tailwind CSS 4 + tailwindcss-primeui |
| Icons | @lucide/angular (globally registered dynamic icons) |
| State | Angular Signals |
| Routing | Lazy-loaded standalone components |
| Build | Angular CLI 22, TypeScript 6, port 2000 |

## Folder Structure

```
src/app/
â”œâ”€â”€ app.config.ts          # Providers: zoneless, router, PrimeNG, Lucide icons
â”œâ”€â”€ app.routes.ts          # Top-level routes (layout shell + auth)
â”œâ”€â”€ app.component.ts       # Root component (just router-outlet)
â”‚
â”œâ”€â”€ core/                  # Singleton services, guards, interceptors
â”‚   â”œâ”€â”€ services/
â”‚   â”‚   â”œâ”€â”€ theme.service.ts    # Light/dark/auto theming
â”‚   â”‚   â””â”€â”€ api.service.ts      # Base HTTP service
â”‚   â”œâ”€â”€ guards/
â”‚   â”‚   â””â”€â”€ auth.guard.ts
â”‚   â”œâ”€â”€ handlers/
â”‚   â”‚   â””â”€â”€ global-error-handler.ts
â”‚   â””â”€â”€ interceptors/
â”‚       â”œâ”€â”€ jwt.interceptor.ts
â”‚       â””â”€â”€ loader.interceptor.ts
â”‚
â”œâ”€â”€ layout/                # App shell (used once, wraps all pages)
â”‚   â””â”€â”€ components/
â”‚       â”œâ”€â”€ app.layout.ts       # Shell: topbar + router-outlet
â”‚       â””â”€â”€ app.topbar.ts       # Sticky navbar with theme toggle
â”‚
â”œâ”€â”€ shared/                # Reusable UI across features
â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”œâ”€â”€ card/               # Generic card with shadow + dark mode
â”‚   â”‚   â”œâ”€â”€ primary-button/     # Brand button (solid/outline, optional icon)
â”‚   â”‚   â”œâ”€â”€ loader/
â”‚   â”‚   â”œâ”€â”€ empty-state/
â”‚   â”‚   â””â”€â”€ error-state/
â”‚   â”œâ”€â”€ directives/
â”‚   â”‚   â””â”€â”€ drag-scroll.directive.ts
â”‚   â”œâ”€â”€ services/
â”‚   â”‚   â””â”€â”€ loader.service.ts
â”‚   â””â”€â”€ types/
â”‚       â””â”€â”€ api.types.ts
â”‚
â”œâ”€â”€ features/              # Feature modules (lazy-loaded)
â”‚   â”œâ”€â”€ home/pages/home/        # Landing page
â”‚   â”œâ”€â”€ sounds/pages/sounds/    # Sounds browser
â”‚   â”œâ”€â”€ about/pages/about/      # About Us
â”‚   â”œâ”€â”€ pricing/pages/pricing/  # Pricing plans
â”‚   â””â”€â”€ onboarding/             # Onboarding wizard
â”‚       â”œâ”€â”€ components/
â”‚       â””â”€â”€ services/
â”‚
â””â”€â”€ pages/                 # Standalone pages (outside features)
    â”œâ”€â”€ notfound/               # 404 "Still working on it" page
    â””â”€â”€ auth/
        â”œâ”€â”€ auth.routes.ts
        â””â”€â”€ login/
```

## Routing

All feature pages are children of `AppLayout` (which provides the sticky topbar):

```
/home        â†’ HomeComponent
/sounds      â†’ SoundsComponent
/about       â†’ AboutComponent
/pricing     â†’ PricingComponent
/notfound    â†’ NotFoundComponent
/auth/login  â†’ LoginComponent (no layout)
/**          â†’ redirects to /notfound
```

## Theming

### Dual System

| What | Handles |
|------|---------|
| PrimeNG (`updatePreset`) | Styles `p-*` components (p-button, p-dialog, etc.) |
| Tailwind (`@theme` + `dark:` variant) | Styles custom HTML/components |

### Brand Colors (defined in `src/tailwind.css`)

One seed color drives everything. `#967BB6` (lavender) is baked into the PrimeNG preset in
`src/app/core/theme/calmi-preset.ts`, which generates the `50..950` scale. The Tailwind brand
tokens are bridged to that scale, so changing the seed changes both systems:

```css
--color-brand: var(--p-primary-500, #967bb6);
--color-brand-light: var(--p-primary-300, #beadd2);
--color-brand-dark: var(--p-primary-700, #69567f);
```

Use `bg-brand`, `text-brand`, `border-brand`, `dark:text-brand-light`, `hover:bg-brand-dark` in
templates. Never reintroduce a literal hex for brand color, and never author a second palette for
dark mode â€” Aura's dark scheme already references `{primary.400}`. See
`docs/dynamic-theming.md` and the typography/color skill for the full rules.

### Dark Mode

- Toggle cycles: light â†’ dark â†’ auto (system preference)
- PrimeNG: `.app-dark` class on `<html>` triggers dark tokens
- Tailwind: `@variant dark` mapped to `.app-dark` selector
- Persistence: `localStorage('calmi-theme')`
- Transition: View Transitions API for smooth switch

### Dark Mode Colors

Legacy literals still present in templates. These are debt, not guidance â€” new UI uses the
PrimeUI surface utilities (`bg-surface-0`, `text-surface-500`, `border-surface-200`) so both
schemes resolve from tokens. Migrate on touch.

| Element | Light (legacy) | Dark (legacy) |
|---------|-------|------|
| Page background | `#f5f3f0` | `#1a1a2e` |
| Card background | `white` | `#2a2a40` |
| Card border | `gray-100` | `#3a3a50` |
| Headings | `gray-900` | `white` |
| Body text | `gray-600` | `gray-300` |
| Muted text | `gray-500` | `gray-400` |

## Shared Components

### `<app-card>`

Generic card wrapper. No forced layout â€” content projection via `<ng-content />`.

```html
<app-card class="h-[280px]">
  <div class="flex flex-col items-center">...</div>
</app-card>
```

Shadow: `0 4px 4px 0 rgba(0,0,0,0.25)` (matches Figma spec).

### `<app-primary-button>`

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| label | string | 'Button' | Button text |
| icon | string \| null | null | Lucide icon name (hidden if null) |
| variant | 'solid' \| 'outline' | 'solid' | solid=purple bg, outline=white bg |

```html
<app-primary-button label="Calm Me Now" icon="arrow-right" variant="outline" />
<app-primary-button label="Get Full Access" />
```

## Component Rules

1. **Always** `standalone: true`
2. **Always** `inject()` for DI â€” never constructor injection
3. **Always** signals for state (`signal()`, `computed()`)
4. **Always** `templateUrl` for page components (>30 lines)
5. Inline templates OK for small shared components
6. Use Lucide icons via `<svg [lucideIcon]="'x'" [size]="n"></svg>`; dynamic names require registration in `provideLucideIcons(...)`
7. Register new dynamic icons in `app.config.ts` `provideLucideIcons(...)` provider
8. Angular 22 defaults to `ChangeDetectionStrategy.OnPush`. Existing components carry an explicit `ChangeDetectionStrategy.Eager` from the v22 migration to preserve prior behavior. Prefer OnPush for new components; only use `Eager` when a component genuinely needs it.

## PrimeUI License

PrimeNG 22 requires a license key (free Community tier or Commercial). Without one, a red "Invalid PrimeUI License" banner appears in the running app.

- The key is **never committed**. `scripts/set-license.mjs` generates the gitignored `src/environments/license.ts` and `app.config.ts` passes it to `providePrimeNG({ license })`.
- Source the key from `PRIMEUI_LICENSE_KEY` â€” an env var in CI/deploy, or `.env.local` for local dev (see `.env.example`).
- Generation runs automatically via the `prebuild` / `prestart` npm hooks, so `npm start` and `npm run build` need no extra steps.
- Community keys expire yearly and must be renewed.

## Assets

- Format: AVIF (converted from PNG for 90%+ compression)
- Location: `public/assets/`
- Naming: PascalCase for illustrations, kebab-case for others
- Favicon: `public/favicon.ico` (multi-size ICO from logo)

## Styling Guidelines

1. Use Tailwind utility classes directly â€” no custom CSS unless necessary
2. Use `dark:` prefix for dark mode variants on custom elements
3. PrimeNG components get themed automatically via `updatePreset()`
4. Avoid `bg-primary`/`text-primary` from tailwindcss-primeui (timing issues) â€” use `bg-brand`/`text-brand` instead
5. Only use `.scss` for `:host` styles or complex animations

## Skills

1. **Angular development (MANDATORY):** Before creating, editing, or reviewing Angular code, load and follow [`angular-developer`](skills/angular-developer/SKILL.md). It is the authoritative source for Angular architecture, Signals reactivity, forms, dependency injection, routing, accessibility, animations, styling, testing, and Angular CLI tooling.
2. **Typography + color (MANDATORY):** Before creating, editing, or reviewing visible UI, load and follow [`angular-apply-typography-color-system`](skills/angular-apply-typography-color-system/SKILL.md). It is the authoritative source for font roles, type scale, emphasis, accessibility, semantic color tokens, PrimeNG tokens, and light/dark behavior.

## References

- [DI Fundamentals](references/di-fundamentals.md)
- [Signals Overview](references/signals-overview.md)
- [Tailwind CSS v4](references/tailwind-css.md)
- [Dynamic theming](../docs/dynamic-theming.md)

