# Pricing Plans - Spec & Implementation Plan

Target: replace the current USD 3-tier pricing (Basic / Premium / Lifetime) with the INR 3-tier
model (Free / Student Premium / Premium).

Scope files:
- `src/app/features/pricing/pages/pricing/pricing.component.ts`
- `src/app/features/pricing/pages/pricing/pricing.component.html`

---

## 1. Target content (source of truth)

### Tier 1 - Free
| Field | Value |
|---|---|
| Price | `₹0` |
| Period | `forever` |
| Tagline | Perfect for exploring Calmi. |
| Badge | none |
| Emphasis | none |
| CTA | `Get Started` (outline) |

Features:
1. Daily Mood Check-ins
2. Basic Journaling
3. Limited Sleep Sessions
4. Access to Community
5. Limited Rumi AI Conversations

### Tier 2 - Student Premium
| Field | Value |
|---|---|
| Price | `₹99` |
| Period | `per month` |
| Tagline | Built for students who need affordable mental wellness support. |
| Badge | Lucide icon `graduation-cap` + text `Student Plan` |
| Emphasis | `Recommended` |
| CTA | `Verify Student Status` (outline) |

Features:
1. Everything in Free
2. Unlimited Sleep Library
3. Unlimited Guided Journals
4. Unlimited Rumi AI
5. Personalized Recommendations
6. Mood Insights & Progress
7. Early Access to New Features

### Tier 3 - Premium
| Field | Value |
|---|---|
| Price | `₹249` |
| Period | `per month` |
| Tagline | Complete mental wellness for every stage of your journey. |
| Badge | none |
| Emphasis | `Most Popular` |
| CTA | `Start 7-Day Free Trial` (solid) |

Features:
1. Everything in Student Premium
2. Priority AI Responses
3. Therapist Session Discounts
4. Advanced Mood Analytics
5. Premium Sleep Journeys
6. Priority Customer Support
7. Exclusive Weekly Content

---

## 2. Gap analysis vs current code

Current `PricingPlan` interface (`pricing.component.ts:8-19`):

```ts
interface PricingPlan {
  name: string;
  icon: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  buttonText: string;
  buttonVariant: 'solid' | 'outline';
  highlight: boolean;
}
```

Gaps:

| # | Gap | Decision |
|---|---|---|
| G1 | Only one emphasis flag (`highlight`) drives both the border and the hardcoded "Most Popular" pill (`pricing.component.html:47-51`). New model needs **two distinct** emphases: Recommended (tier 2) and Most Popular (tier 3). | Replace `highlight: boolean` with `emphasis: 'none' \| 'recommended' \| 'popular'`. Ribbon label derived from it. |
| G2 | No support for a secondary badge alongside the emphasis ribbon. | Add optional `badgeIcon?: string` and `badgeLabel?: string`. Render top-right inside the card so it never collides with the centered top ribbon. |
| G3 | Single CTA handler - every button calls `getStarted()` (`pricing.component.html:88`). Student tier needs a distinct verification flow. | Add `action: 'start' \| 'verifyStudent' \| 'trial'` to the model; template dispatches via `onPlanAction(plan)`. |
| G4 | Prices are USD and tier 2 is toggled by `annualBilling` (`$5`/`$8`). New spec gives only monthly INR prices. | See section 3 - billing toggle decision. |
| G5 | Feature lists grow from 4-5 to 7 items; cards use `flex-1` on the `<ul>` and `items-stretch` on the grid, so equal heights already hold. | No change needed; verify visually. |
| G6 | Icons: `leaf` / `zap` / `sparkles` (Lucide dynamic icons). | Free -> `leaf`, Student Premium -> `graduation-cap`, Premium -> `sparkles`. Names must exist in `@lucide/angular`. |

---

## 3. Billing toggle decision

The spec lists only monthly prices. Three options:

- **A. Keep toggle, add annual prices.** Requires numbers not given by the spec (e.g. ₹79 / ₹199 annual-equivalent). Do not invent prices.
- **B. Remove the toggle** and the "Save 35%" pill (`pricing.component.html:16-33`), drop `annualBilling` signal and `toggleBilling()`. Simplest, matches the spec exactly.
- **C. Keep toggle disabled/hidden behind a flag.** Dead UI, not recommended.

**Chosen: B (remove).** Reinstate later when annual INR pricing is defined. Because prices become
static, `plans` can move from `computed()` to a `readonly` const array - keep it a signal-free
readonly field to avoid a pointless reactive dependency.

---

## 4. Target model

```ts
type PlanEmphasis = 'none' | 'recommended' | 'popular';
type PlanAction = 'start' | 'verifyStudent' | 'trial';

interface PricingPlan {
  name: string;
  icon: string;
  price: string;          // '₹0' | '₹99' | '₹249'
  period: string;         // 'forever' | 'per month'
  description: string;
  features: string[];
  buttonText: string;
  buttonVariant: 'solid' | 'outline';
  emphasis: PlanEmphasis;
  badgeIcon?: string;     // 'graduation-cap'
  badgeLabel?: string;    // 'Student Plan'
  action: PlanAction;
}
```

Ribbon label mapping (component method, not in the data, to keep copy in one place):

```ts
ribbonLabel(e: PlanEmphasis): string | null {
  return e === 'popular' ? 'Most Popular' : e === 'recommended' ? 'Recommended' : null;
}
```

---

## 5. Template changes

1. Delete the billing-toggle block (`pricing.component.html:16-33`).
2. Emphasis styling: swap `plan.highlight` bindings for `plan.emphasis !== 'none'` on
   `border-2` / `border-brand` / `shadow-xl`, and keep the icon-tile `bg-brand` for
   `emphasis === 'popular'` only, so Premium stays the strongest visual.
   Use a lighter accent (`border-brand/60`) for `recommended` so the two emphasised cards are
   distinguishable.
3. Ribbon: render `@if (ribbonLabel(plan.emphasis); as label)` in the existing centered
   `absolute -top-4` pill.
4. Badge: render optional `badgeIcon` and `badgeLabel` in an `absolute top-4 right-4` chip,
   `text-xs font-semibold`, `bg-brand/10 text-brand dark:bg-white/10 dark:text-brand-light`,
   `rounded-full px-3 py-1`, with the Lucide SVG and real text label.
5. CTA: `(clicked)="onPlanAction(plan)"`.
6. Keep `@for (... ; track plan.name)`, `appAnimateOnScroll`, and the Lucide `circle-check`
   feature bullets unchanged.

---

## 6. Component changes

```ts
onPlanAction(plan: PricingPlan) {
  switch (plan.action) {
    case 'verifyStudent': return this.startStudentVerification();
    case 'trial':
    case 'start':
    default: return this.onboardingService.start();
  }
}
```

`startStudentVerification()` - no verification flow exists in the app today. Interim behaviour:
route into onboarding via `onboardingService.start({ studentVerification: true })`; onboarding consumes
that persistent intent and shows student-flow context. Do not invent a backend call. Track the real flow
as follow-up work (section 8).

Remove: `annualBilling` signal, `toggleBilling()`, unused `computed` import if `plans` becomes a
plain readonly array. Keep `ChangeDetectionStrategy.Eager` as set during the v22 migration.

---

## 7. Accessibility & i18n notes

- Ribbon and badge are decorative-adjacent but carry meaning: keep them as real text nodes (they
  are), not CSS pseudo-content, so screen readers announce them.
- Badge icon SVG gets `aria-hidden="true"`; label is real text.
- Price + period must read as one unit: the visible `₹99` and `/ per month` spans are
  `aria-hidden="true"` and a `sr-only` span carries the combined string (`₹99 per month`) built by
  `ariaPrice(plan)`. An `aria-label` on a wrapper with all children hidden would leave an empty
  group, so the visually-hidden-text pattern is used instead.
- Feature `circle-check` icons are `<svg>` without labels - add `aria-hidden="true"` (list
  semantics already convey membership).
- Currency is hardcoded `₹`. No i18n layer exists in the project; if one is added, move prices to
  numeric values plus `CurrencyPipe` with `INR`.

---

## 8. Follow-up work (out of scope here)

- Real student verification flow (upload/institution email/third-party verifier) - the CTA is a
  placeholder until then.
- Annual INR pricing to restore the billing toggle and the "Save 35%" pill.
- Payment/checkout integration; no billing backend is wired today.
- Plan data likely belongs in a service or backend response rather than the component once
  entitlements are enforced server-side.

---

## 9. Verification checklist

- [ ] `npm run build` passes.
- [ ] Three cards render; Student Premium shows both the `Recommended` ribbon and the
      Lucide `graduation-cap` icon with `Student Plan` label without overlap at `md` and `lg` widths.
- [ ] Cards are equal height with 5 / 7 / 7 feature rows.
- [ ] Each CTA fires its mapped action; no console errors.
- [ ] `graduation-cap` icon resolves (no missing-icon warning from `LucideDynamicIcon`).
- [ ] Light and dark themes both legible (`bg-[#f5f3f0]` / `dark:bg-[#090514]`).
- [ ] No residual references to `annualBilling`, `toggleBilling`, or `highlight`.
