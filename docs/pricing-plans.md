# Pricing Plans

Current Calmi pricing is an INR three-tier model with monthly and annual billing for paid plans.
The pricing page keeps the Free tier permanently free and uses an accessible native segmented control
for `Monthly` and `Annually (Save 20%)`.

Scope files:
- `src/app/features/pricing/pages/pricing/pricing.component.ts`
- `src/app/features/pricing/pages/pricing/pricing.component.html`

## Pricing table

| Tier | Monthly | Annual | Tagline | CTA |
|---|---:|---:|---|---|
| Free | `₹0` forever | `₹0` forever | Perfect for exploring Calmi. | Get Started |
| Student Premium | `₹99`/month | `₹999`/year | Everything you need for everyday self-reflection. | Verify Student Status |
| Premium | `₹249`/month | `₹2,399`/year | More room to reflect, understand and explore. | Start 7-Day Free Trial |

The annual values are explicit product prices. They are not calculated from the monthly values.
The toggle's `Save 20%` label is the shared product message requested for annual billing.

## Features

### Free
1. Daily Mood Check-ins
2. Basic Journaling
3. Limited Sleep Sessions
4. Access to Community
5. Limited Rumi AI Conversations

### Student Premium
1. Everything in Free
2. Limited Rumi AI conversations — 20–30 conversations/month
3. Unlimited Guided Journaling
4. Sleep Library
5. Personalised Recommendations
6. Mood Insights & Progress
7. Notice Your Patterns.

The Student Premium card retains its `Recommended` ribbon and `Student Plan` badge. Its `Verify Student Status` CTA opens the dedicated verification dialog. See [Student Plan Verification](student-verification-plan.md).

### Premium
1. Everything in Student Premium
2. Higher Rumi AI limits — 100–150 conversations/month
3. Deeper Mood Insights
4. Premium Sleep Journeys
5. Therapist Session Discounts
6. Exclusive Weekly Content
7. Priority Support

The Premium card retains its `Most Popular` ribbon and starts the existing 7-day trial onboarding
flow.

## Implementation notes

- `billingPeriod = signal<'monthly' | 'annual'>('monthly')` owns the selected billing period.
- `displayedPlans` is a computed view that selects each plan's explicit monthly or annual price.
- Free has an explicit annual `₹0` price and remains `forever` in either mode.
- The billing control uses native buttons with `aria-pressed`, so it is keyboard operable without
  adding a PrimeNG dependency or component.
- Prices are stored as formatted INR strings, including Indian grouping such as `₹2,399`.
- Price and period are visually rendered while the computed `ariaLabel` provides a single screen-reader value.
- Existing Lucide icons, card emphasis, equal-height layout, CTA dispatch, and scroll animation are
  preserved.

## Verification checklist

- [ ] `npx ng build` passes.
- [ ] `npx ng test --watch=false` passes when the test setup is available.
- [ ] Monthly mode displays `₹99`/month and `₹249`/month.
- [ ] Annual mode displays `₹999`/year and `₹2,399`/year.
- [ ] The billing buttons expose `aria-pressed`, have visible focus rings, and work from the keyboard.
- [ ] Student Premium shows both its `Recommended` ribbon and `Student Plan` badge without overlap.
- [ ] Cards remain equal height and feature copy matches this document exactly.
- [ ] Light and dark themes remain readable using Calmi semantic token utilities.
