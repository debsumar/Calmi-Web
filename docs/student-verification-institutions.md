# Student Verification — Institution List & Domain Matching

Companion to [`student-verification-plan.md`](./student-verification-plan.md), which covers the
dialog flow. This doc covers only two things: **where the institution list comes from** and **how a
domain decides eligibility**. Persistence and OTP delivery are deliberately out of scope (see
[Deferred](#deferred)).

Status: dataset is **hand-curated fixtures** in `src/app/features/student-verification/services/student-verification.fixtures.ts`
(~200 Indian institutions). The refresh pipeline below is **not built yet**.

## Principle

No third-party API is called at request time — not from the browser, not from a Vercel function.
The list is generated offline, committed, and shipped as a static asset. An upstream outage or a bad
upstream edit can therefore never break signup or silently widen the allowlist.

## Sources

Measured live on 2026-09-02.

| Source | Coverage | Domains | Use |
|---|---|---|---|
| [Hipolabs university-domains-list](https://github.com/Hipo/university-domains-list) | 10,259 worldwide; **477 India** | **477 / 477 have ≥1 domain** | the domain allowlist |
| [ROR](https://ror.org/) (`types:education`) | **2,106 India**, global, CC0, monthly release | `domains` present in schema but **0 of first 20 India records populated** | canonical name + stable `ror.org/xxxx` id |
| [AISHE](https://aishe.gov.in/) (official) | ~1,100 universities + ~43,000 colleges | none | Indian long-tail names |

Verification queries used:

```
http://universities.hipolabs.com/search?country=India
https://api.ror.org/v2/organizations?filter=country.country_code:IN,types:education
```

### The two sources disagree, on purpose

```
hipolabs: Lovely Professional University -> lpu.in
ROR:      Lovely Professional University -> lpu.co.in   (ror.org/00et6q107)
```

Both are real; `lpu.co.in` is older. Same story for Jadavpur (`jadavpur.edu` upstream vs
`jadavpuruniversity.in` in our fixtures). **Union the domains per institution — never pick a winner.**

## Payload size

Slim shape (`name` + `domains` + country code), measured 2026-09-02:

| Slice | Records | Raw | Gzip |
|---|---|---|---|
| India | 477 | 34.8 kB | **7.4 kB** |
| Worldwide | 10,259 | 693.2 kB | **139.5 kB** |

7.4 kB gzip is smaller than most lazy chunks in this app. This is why no search endpoint, no
database table, and no per-keystroke request is needed — now or when the app goes global.

## Refresh pipeline (to build)

Monthly GitHub Action (free for public repos — no Vercel cron, no DB):

1. Fetch the hipolabs JSON from `raw.githubusercontent.com`, **pinned to a commit SHA, not `master`**.
   Pinning makes an upstream mistake show up as a reviewable diff instead of a silently poisoned allowlist.
2. Fetch the ROR monthly CC0 dump (the dump, not the paginated API — the API is for one-off admin lookups).
3. Join: ROR id + canonical name as the spine, hipolabs domains unioned in, AISHE for Indian long-tail names.
4. Emit `public/institutions.<contenthash>.json`, lowercase every domain, drop duplicate ids.
5. Open a PR. Human reviews the diff, merges, Vercel deploys.

AISHE is a manual, once-a-year step — it is an annual survey release, not an API.

### Output shape

Extends today's `Institution` model rather than replacing it:

```ts
interface Institution {
  id: string;              // prefer the ROR id — survives renames
  name: string;
  domains: readonly string[];
  country?: string;        // ISO alpha-2, for the global phase
}
```

## Runtime loading

- Fetch the asset **lazily on first focus of the institution field**, not at app boot and not inside
  the pricing chunk. The combobox already opens on focus, so that is the natural trigger.
- Keep the committed fixtures as the immediate fallback so the list is never empty while the asset
  is in flight, or if the fetch fails.
- Cache in a service signal for the session; the content-hashed filename lets the CDN cache immutably.
- Filtering stays a client-side `computed()` over the array — no debounce needed at 477 records, and
  still fine at 10k.
- If AISHE's ~43k names are ever merged, the asset grows past a few hundred kB gzip (estimate, not
  measured). That is the point to split: domain-bearing institutions in the asset, long-tail names
  behind a server-side search endpoint, and virtual scrolling in the listbox.

## Domain matching

Two distinct layers. Only the second one verifies anything.

1. **Eligibility** — does the typed email's domain belong to the chosen institution.
   `StudentVerificationService.isAllowedDomain()` does this today. It is a UX affordance, **not a
   security control**, because it runs in the browser.
2. **Proof** — an OTP to that institutional address. A domain list cannot distinguish a current
   student from an alumnus or a professor.

### Known limitation: exact-match rejects real addresses

`isAllowedDomain()` exact-matches the substring after the last `@`. Institutions use departmental and
campus subdomains, so `@pilani.bits-pilani.ac.in` and `@cse.iitb.ac.in` are rejected unless every
subdomain is enumerated by hand — which is why the BITS campuses are currently listed individually.

Proposed rule, which is what these datasets assume:

```ts
domain === allowed || domain.endsWith(`.${allowed}`)
```

Guard it: match only against the institution's own domains (never a bare public suffix), and keep
comparisons lowercase and trimmed.

### Server-side re-check (when the API lands)

The endpoint must re-run eligibility against its own copy of the dataset and **ignore any
`institutionId` or domain sent by the client**. Otherwise a user posts
`{ institutionId: 'iit-bombay' }` with a Gmail address and passes.

## Coverage gaps are guaranteed

477 records against ~43,000 Indian colleges means genuine students will see "No institutions match".
Confirmed example: hipolabs has **no Chandigarh University** at all, despite its size.

So the "can't find my institution" path is not optional — it must route to the existing document
upload plus `manualPending` review, or those users hit a dead end.

## Deferred

- **Persistence.** Not needed to populate the list (static asset), but required the moment OTP is
  real: send/confirm are two stateless invocations, so the code hash, expiry, attempt count, and the
  durable "verified until" entitlement need a store. Supabase is already wired for auth
  (`src/app/core/services/auth.service.ts`) and is the intended home. Until then the flow is
  fixture-backed and verifies nothing.
- **Email delivery.** Brevo, called from a Vercel function exactly like `api/waitlist.ts`, with
  `BREVO_API_KEY` server-side only. Free plan ceiling is 300 emails/day, shared with the waitlist.

## Open decisions

- Switch `Institution.id` to the ROR id now, or keep slugs and carry `rorId` alongside? Changing ids
  breaks the specs that assert `jadavpur-university` / `iit-kharagpur`.
- Ship India-only first (7.4 kB) or the full worldwide asset (139.5 kB) from day one?
- Whether to accept subdomains globally or per-institution opt-in.
