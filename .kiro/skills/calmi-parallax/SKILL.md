---
name: calmi-parallax
description: Calmi parallax and scroll-linked motion system. Pure-CSS scroll-driven animations (animation-timeline scroll()/view()), compositor-only, 0 JS. Use when adding, tuning, reviewing, or debugging parallax, scroll-driven animation, depth/drift/lag/pop effects, or scroll jank on any page.
---

# Calmi Parallax System

## Approach (decided — do not re-litigate)

- **Pure CSS scroll-driven animations** (`animation-timeline: scroll()` / `view()`). 0 JS, 0 deps.
- Animate **`transform` only** (translate3d / scale). Runs on the compositor thread → no jank when the main thread is busy.
- **Never**: JS scroll listeners, `requestAnimationFrame` parallax directives, Web Workers, GSAP/Lenis/Motion/Locomotive, `ngx-parallax`, `@angular/animations` (removed from the project), `background-attachment: fixed`, animating `background-position`/`top`/`margin`/`filter`/`opacity`.
- Unsupported browsers (Firefox today) and reduced motion → static layout. That is the accepted fallback; do not add a JS polyfill.

## Where things live

- All keyframes + classes: `src/tailwind.css` (parallax block after `@keyframes slide`). Never in component styles (4 kB `anyComponentStyle` budget).
- Usage: class names on elements in templates. No directive.
- Reference implementation: `src/app/features/home/pages/home/home.component.html`.

## Class catalog

| Class | Timeline / range | Motion | Kind | Use for |
|---|---|---|---|---|
| `parallax-slow` / `parallax-fast` | `scroll(root block)`, `0 600px` | 0→90px / 0→180px | hero | Hero illustrations on about, experts, rumi-ai. Shared — don't change values. |
| `parallax-deep` / `parallax-deeper` | `scroll(root block)`, `0 700px` | 0→300px / 0→520px | hero | Home hero illustrations (more intense). |
| `parallax-rise-1/2/3` | `scroll(root block)`, `0 600px` | 0→-40 / -80 / -120px | hero | Hero text "spread": higher element = higher tier. |
| `parallax-depth-1` / `parallax-depth-3` | `view(block)`, `cover 0% cover 100%` | ±45px / ±130px | continuous | Horizontal row-mates (card waves, 2-col splits). |
| `parallax-sink` | `view(block)`, `cover 0% cover 100%` | -70→+70px | continuous | Counter-motion column opposite a depth tier. |
| `parallax-pop` | `view(block)`, `entry 0% entry 100%` | 90px + scale 0.9 → identity | entry-only | Top-level cards/blocks entering. |
| `parallax-lag-1/2/3` | `view(block)`, entry 0–60% / 10–80% / 20–100% | 40px → identity | entry-only | Sub-elements: titles, text, list items, buttons, footer. |

## Hard rules

1. **Gate every rule**: `@supports (animation-timeline: scroll()|view())` → `@media (prefers-reduced-motion: no-preference)` (+ `and (min-width: 768px)` for everything except hero images) → selector `:root:not(.reduce-motion) .parallax-x`. The global `animation: none !important` reduce rules must keep winning.
2. **Longhands only**: `animation-name`, `animation-timing-function: linear`, `animation-fill-mode: both`, `animation-timeline`, `animation-range`. Never the `animation` shorthand (it resets `animation-timeline`). No `animation-duration`, no `will-change`.
3. **Literal keyframe values**, no `var()` inside keyframes.
4. **No conflicts on the same element**: never put a parallax class on an element with `appAnimateOnScroll` (its `animation` shorthand overwrites ours), `transition-transform`, `hover:*translate*`, `hover:scale`, or `group-hover:*`. Wrap it in a plain `<div class="parallax-x">` instead; keep directives, `[style.--index]`, `routerLink`, aria on the original element. `transition-colors`/`transition-shadow` are fine.
5. **Layout at rest unchanged**: wrappers take over the grid/flex item role (`h-full`, `flex-1`, `w-full` as needed); inner element gets `h-full` if it used to stretch.
6. **S1 — tier direction**: continuous tiers (`depth-*`, `sink`) may differ **only between horizontally adjacent row-mates** at every md+ breakpoint (768/992/1200). Vertically stacked elements in a section use entry-only effects for variety. For grids that change column count, alternate by `i % 2`, e.g. `[class]="['parallax-depth-1','parallax-depth-3'][i % 2]"` with static `class="h-full"`.
7. **S2 — nesting**: a continuous tier never sits inside another continuous tier. Entry-only (`pop`, `lag-*`) may nest anywhere; `pop` only on top-level blocks.
8. **Bottom-of-page**: the footer and anything in the last viewport of the page use entry-only effects only (ranges end ≤ `entry 100%`), so they settle at max scroll.
9. **Clipping**: an element inside an `overflow-hidden` parent must not translate more than that parent's padding on the clipped side. Hero text rises (negative Y) for this reason; hero images drift down with factor < 1, so the gap they reveal stays above the viewport. `overflow-hidden`/`auto`/`scroll` make an element a scroll container, so any `view()` class (depth/sink/pop/lag) on a DESCENDANT binds to it and never animates — use `overflow-clip` on such ancestors instead (same clip, not a scroll container); a class on the overflow element itself is fine.
10. **No opacity on interactive content** (forms, buttons, links).
11. Keep a small tier set; add a new tier only when a real layout needs it, and delete unused classes/keyframes.

## Recipe — adding parallax to a page

1. Pick layers: hero images (`slow`/`fast` or `deep`/`deeper`), hero text (`rise-*`), row-mates (`depth-*`/`sink`), blocks (`pop`), sub-elements (`lag-*`).
2. Check each target element against rule 4; wrap where needed.
3. Check S1/S2 and the footer rule; check clipping against `overflow-hidden` ancestors. Any `overflow-hidden` ancestor of a `view()` class → swap to `overflow-clip`.
4. Need a new tier? Add keyframe + class in the `src/tailwind.css` parallax block, inside the existing gates.
5. Verify: `npx ng build` must exit 0 (never run `ng test` — steering). Grep `dist/calmi-web/browser/styles-*.css` for `animation-timeline` / the class names to confirm the minifier kept them. Then scroll the page in Chrome or Safari at ≥768px.

## Tuning

- Stronger/weaker: change the literal px values in the keyframes. Speed of a root-scroll layer = shift / range length (keep < 1 for downward hero image drift).
- Overlap between stacked sections: keep continuous-tier magnitude below the combined section padding (e.g. `pb-16` + `md:pt-20` = 144px).
