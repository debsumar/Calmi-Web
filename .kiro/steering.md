# Project Steering — Calmi-Web

NEVER RUN ng test, or any test commands or test cases
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
├── app.config.ts          # Providers: zoneless, router, PrimeNG, Lucide icons
├── app.routes.ts          # Top-level routes (layout shell + auth)
├── app.component.ts       # Root component (just router-outlet)
│
├── core/                  # Singleton services, guards, interceptors
│   ├── services/
│   │   ├── theme.service.ts    # Light/dark/auto theming
│   │   └── api.service.ts      # Base HTTP service
│   ├── guards/
│   │   └── auth.guard.ts
│   ├── handlers/
│   │   └── global-error-handler.ts
│   └── interceptors/
│       ├── jwt.interceptor.ts
│       └── loader.interceptor.ts
│
├── layout/                # App shell (used once, wraps all pages)
│   └── components/
│       ├── app.layout.ts       # Shell: topbar + router-outlet
│       └── app.topbar.ts       # Sticky navbar with theme toggle
│
├── shared/                # Reusable UI across features
│   ├── components/
│   │   ├── card/               # Generic card with shadow + dark mode
│   │   ├── primary-button/     # Brand button (solid/outline, optional icon)
│   │   ├── loader/
│   │   ├── empty-state/
│   │   └── error-state/
│   ├── directives/
│   │   └── drag-scroll.directive.ts
│   ├── services/
│   │   └── loader.service.ts
│   └── types/
│       └── api.types.ts
│
├── features/              # Feature modules (lazy-loaded)
│   ├── home/pages/home/        # Landing page
│   ├──     therapy/pages/therapy/  # Therapy page
    sleep/pages/sleep/      # Sleep sounds browser
│   ├── about/pages/about/      # About Us
│   ├── pricing/pages/pricing/  # Pricing plans
│   └── onboarding/             # Onboarding wizard
│       ├── components/
│       └── services/
│
└── pages/                 # Standalone pages (outside features)
    ├── notfound/               # 404 "Still working on it" page
    └── auth/
        ├── auth.routes.ts
        └── login/
```

## Routing

All feature pages are children of `AppLayout` (which provides the sticky topbar):

```
/home        → HomeComponent
/therapy     -> TherapyComponent
/sleep       -> SleepComponent
/sessions    -> redirects to /therapy
/sounds      -> redirects to /sleep
/about       → AboutComponent
/pricing     → PricingComponent
/notfound    → NotFoundComponent
/auth/login  → LoginComponent (no layout)
/**          → redirects to /notfound
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
dark mode — Aura's dark scheme already references `{primary.400}`. See
`docs/dynamic-theming.md` and the typography/color skill for the full rules.

### Dark Mode

- Toggle cycles: light → dark → auto (system preference)
- PrimeNG: `.app-dark` class on `<html>` triggers dark tokens
- Tailwind: `@variant dark` mapped to `.app-dark` selector
- Persistence: `localStorage('calmi-theme')`
- Transition: View Transitions API for smooth switch

### Dark Mode Colors

Legacy literals still present in templates. These are debt, not guidance — new UI uses the
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

Generic card wrapper. No forced layout — content projection via `<ng-content />`.

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
2. **Always** `inject()` for DI — never constructor injection
3. **Always** signals for state (`signal()`, `computed()`)
4. **Always** `templateUrl` for page components (>30 lines)
5. Inline templates OK for small shared components
6. Use Lucide icons via `<svg [lucideIcon]="'x'" [size]="n"></svg>`; dynamic names require registration in `provideLucideIcons(...)`
7. Register new dynamic icons in `app.config.ts` `provideLucideIcons(...)` provider
8. Angular 22 defaults to `ChangeDetectionStrategy.OnPush`. Existing components carry an explicit `ChangeDetectionStrategy.Eager` from the v22 migration to preserve prior behavior. Prefer OnPush for new components; only use `Eager` when a component genuinely needs it.

## PrimeUI License

PrimeNG 22 requires a license key (free Community tier or Commercial). Without one, a red "Invalid PrimeUI License" banner appears in the running app.

- The key is **never committed**. `scripts/set-license.mjs` generates the gitignored `src/environments/license.ts` and `app.config.ts` passes it to `providePrimeNG({ license })`.
- Source the key from `PRIMEUI_LICENSE_KEY` — an env var in CI/deploy, or `.env.local` for local dev (see `.env.example`).
- Generation runs automatically via the `prebuild` / `prestart` npm hooks, so `npm start` and `npm run build` need no extra steps.
- Community keys expire yearly and must be renewed.

## Assets

- Format: AVIF (converted from PNG for 90%+ compression)
- Location: `public/assets/`
- Naming: PascalCase for illustrations, kebab-case for others
- Favicon: `public/favicon.ico` (multi-size ICO from logo)

## Styling Guidelines

1. Use Tailwind utility classes directly — no custom CSS unless necessary
2. Use `dark:` prefix for dark mode variants on custom elements
3. PrimeNG components get themed automatically via `updatePreset()`
4. Avoid `bg-primary`/`text-primary` from tailwindcss-primeui (timing issues) — use `bg-brand`/`text-brand` instead
5. Only use `.scss` for `:host` styles or complex animations

## Skills

1. **Angular development (MANDATORY):** Before creating, editing, or reviewing Angular code, load and follow [`angular-developer`](skills/angular-developer/SKILL.md). It is the authoritative source for Angular architecture, Signals reactivity, forms, dependency injection, routing, accessibility, animations, styling, testing, and Angular CLI tooling.
2. **Typography + color (MANDATORY):** Before creating, editing, or reviewing visible UI, load and follow [`angular-apply-typography-color-system`](skills/angular-apply-typography-color-system/SKILL.md). It is the authoritative source for font roles, type scale, emphasis, accessibility, semantic color tokens, PrimeNG tokens, and light/dark behavior.

## References

- [DI Fundamentals](references/di-fundamentals.md)
- [Signals Overview](references/signals-overview.md)
- [Tailwind CSS v4](references/tailwind-css.md)
- [Dynamic theming](../docs/dynamic-theming.md)
