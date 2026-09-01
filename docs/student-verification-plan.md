# Student Plan Verification

Student Premium (`₹99`/month, `₹999`/year) is gated behind proof of enrolment. The pricing card's
`Verify Student Status` CTA opens a modal that collects the institution plus one proof, runs an
automated check, and either unlocks Student Premium or falls back to a manual support review.

The pricing card's `Verify Student Status` CTA now opens a dedicated dialog backed by
`StudentVerificationService`. The current service is fixture-backed for UI development; real API
binding remains deferred to the seams listed in [Current implementation status](#current-implementation-status).

Static mockup: `mockups/student-verification.html` (open directly in a browser, no build step).

## Workflow

```
[ User clicks "Verify Student Status" ]
                |
                v
[ Modal: enter college name + choose proof (institutional email | student ID upload) ]
                |
                | (document path: upload-url creates owned draft + requestId before upload)
                v
[ Automated check via API ] ---- (failed) ----> [ Request manual support review ]
                |                                            |
          (approved)                                    (pending, 1-2 days)
                v                                            v
[ Unlock "Student Premium" status + apply discount ]   [ Emailed decision ]
```

## Scope files

New:
- `src/app/features/student-verification/models/student-verification.model.ts`
- `src/app/features/student-verification/services/student-verification.service.ts`
- `src/app/features/student-verification/components/student-verification-dialog/`
- `src/app/features/student-verification/components/verification-method-step/`
- `src/app/features/student-verification/components/verification-pending-step/`
- `src/app/features/student-verification/components/verification-result-step/`
- `api/student-verification.ts` (submit + status)
- `api/student-verification-upload.ts` (signed upload URL issuer)

Touched:
- `src/app/features/pricing/pages/pricing/pricing.component.ts` — `startStudentVerification()` opens
  the dialog instead of onboarding
- `src/app/features/pricing/pages/pricing/pricing.component.html` — CTA gets
  `aria-haspopup="dialog"`, and reflects verified state
- `src/app/features/onboarding/services/onboarding.service.ts` — retain legacy
  `studentVerificationRequested` because the onboarding wizard still consumes it; the pricing
  entry point no longer sets the intent
- `docs/pricing-plans.md` — cross-link this document

## States

| State | Trigger | UI | Exit |
|---|---|---|---|
| `idle` | Dialog closed | Pricing CTA only | Click CTA |
| `collecting` | Dialog opened | Resolved institution, method radios, conditional proof field, consent; submit disabled until valid | Valid submit |
| `emailSent` | Email method submitted | 6-digit code entry, resend timer | Valid 6-digit code or resend |
| `checking` | Proof submitted | Progress copy + indeterminate bar, `aria-busy` | API responds |
| `approved` | API `approved` | Success panel, unlocked price, valid-until date | Continue to checkout |
| `failed` | API `rejected` | Reason copy, retry other method, request review | Retry or escalate |
| `manualPending` | Review requested | Ticket reference, expectation copy | Close |
| `error` | Network/5xx/offline | Inline alert, retry button, state preserved | Retry |
| `otpExpired` | OTP TTL elapsed | Expiry copy, resend path, no data loss | Request code |
| `alreadyVerified` | Existing valid record | Existing approval and valid-until date | Continue |

Field-level errors: unknown institution, non-institutional domain, wrong file type, file over 3 MB,
expired code, too many attempts.

## Data model

```ts
export type VerificationMethod = 'email' | 'document';

export type VerificationStatus =
  | 'idle' | 'collecting' | 'emailSent' | 'checking'
  | 'approved' | 'failed' | 'manualPending' | 'error'
  | 'otpExpired' | 'alreadyVerified';

export interface StudentVerificationRequest {
  institutionName: string;
  institutionId: string;        // resolved from the institution lookup
  method: VerificationMethod;
  institutionalEmail?: string;    // method === 'email'
  requestId?: string;             // server-issued by upload-url; required for document submit; never client-generated
  documentRef?: string;           // method === 'document', server-issued upload ref bound to requestId
  consentAccepted: boolean;
  // Idempotency-Key is a request header, never serialized in this body.
}

export type VerificationReasonCode =
  | 'domain_mismatch' | 'unreadable_document' | 'not_enrolled' | 'provider_unavailable'
  | 'otp_expired' | 'already_verified' | 'conflict' | 'rate_limited';

interface VerificationResultBase {
  requestId: string;
}

// status is the discriminant. pendingKind and supportTicketRef exist only on the
// branches that require them, so a malformed `{ status: 'pending' }` or an
// `approved` result carrying pendingKind cannot type-check.
export interface VerificationApproved extends VerificationResultBase {
  status: 'approved';
  verifiedUntil: string;          // ISO date, 12 months from approval
  reasonCode?: 'already_verified';  // only reason allowed on approved
}

export interface VerificationRejected extends VerificationResultBase {
  status: 'rejected';
  reasonCode: VerificationReasonCode;
}

export interface VerificationPendingAutomated extends VerificationResultBase {
  status: 'pending';
  pendingKind: 'automated';
}

export interface VerificationPendingManual extends VerificationResultBase {
  status: 'pending';
  pendingKind: 'manual';
  supportTicketRef: string;       // persisted, replayed on every later status read
}

export type StudentVerificationResult =
  | VerificationApproved
  | VerificationRejected
  | VerificationPendingAutomated
  | VerificationPendingManual;
```


### API-to-UI status mapping

`StudentVerificationResult.status` is the server discriminant; the client must not infer a UI
state from missing fields. Map responses as follows:

| API response | UI status | Required contract |
|---|---|---|
| `approved` + no reason | `approved` | `verifiedUntil` required |
| `approved` + `reasonCode: already_verified` | `alreadyVerified` | `verifiedUntil` required; no other status may use this reason |
| `rejected` + `reasonCode: otp_expired` | `otpExpired` | Preserve collected form state; issue resend path |
| `rejected` + any other reason | `failed` | Show retry and manual-review actions |
| `pending` + `pendingKind: automated` | `checking` | Poll `GET /status` with backoff |
| `pending` + `pendingKind: manual` | `manualPending` | `supportTicketRef` required in POST `/review` and every later status response |
| network, offline, 5xx | `error` | Client-local error; preserve collected state |

`POST /review` returns `{ supportTicketRef, status: 'pending', pendingKind: 'manual' }`. Status
polling returns that same manual ticket reference after reload, so a client can deterministically
restore `manualPending` rather than treating it as automated checking.

Persisted server-side in `student_verifications`: `id`, `user_id`, `institution_id`,
`institution_name`, `method`, `status`, `pending_kind`, `reason_code`, `document_path`,
`verified_at`, `verified_until`, `reviewed_by`, `attempts`, `created_at`.

## Components

All standalone, `ChangeDetectionStrategy.OnPush`, signal inputs and outputs.

| Component | Inputs | Outputs | Job |
|---|---|---|---|
| `StudentVerificationDialogComponent` | `open: boolean` | `closed`, `verified: StudentVerificationResult` | Shell, focus trap, step routing off the service status |
| `VerificationMethodStepComponent` | `institutions: Institution[]`, `pending: boolean` | `submitted: StudentVerificationRequest` | Typed form, validation, consent |
| `VerificationEmailCodeStepComponent` | `email: string`, `resendIn: number` | `codeSubmitted: string`, `resend` | OTP entry |
| `VerificationPendingStepComponent` | `label: string` | — | Indeterminate progress, `aria-live` |
| `VerificationResultStepComponent` | `result: StudentVerificationResult` | `retry`, `escalate`, `continue` | Approved / failed / manual-pending panels |

`StudentVerificationService` owns `status`, `result`, `error` signals plus `submit()`,
`confirmCode()`, `requestManualReview()`, `reset()`, and a `canUseStudentPlan` computed the pricing
page reads.

## API contract

| Method | Route | Body | Response |
|---|---|---|---|
| `GET` | `/api/institutions?q=` | — | `{ id, name, domains[] }[]` |
| `POST` | `/api/student-verification/upload-url` | `{ contentType, size }` | `{ uploadUrl, documentRef, requestId }`; creates an authenticated user's owned draft request and one pending upload before signing URL |
| `POST` | `/api/student-verification` | `StudentVerificationRequest` | `StudentVerificationResult`; document method must include the server-issued `requestId` and matching `documentRef` |
| `POST` | `/api/student-verification/confirm` | `{ requestId, code }` | `StudentVerificationResult` |
| `POST` | `/api/student-verification/review` | `{ requestId, note? }` | `{ supportTicketRef, status: 'pending', pendingKind: 'manual' }` |
| `GET` | `/api/student-verification/status` | — | `StudentVerificationResult \| null`; manual pending includes `supportTicketRef` |

All listed student-verification endpoints, including institution lookup and upload-url, require an
authenticated session. Mutating requests require `Idempotency-Key: <UUID>` as the sole transport;
the body has no idempotency field. Persist a unique `(user_id, route, idempotency_key)` with request
fingerprint, in-progress/completed response, expiry, and transactional side effects. Retain records
for 24 hours, then expire them. Concurrent reuse with a different fingerprint returns `409`; same-key
retries replay the original response and never duplicate review tickets or entitlement changes.
`409 Conflict` means a request is already active or the account is already verified. `429 Too Many
Requests` includes `Retry-After` and preserves the collected state.

The email path is an OTP to the institutional address; the document path queues an OCR/provider check. Both return `pending` when the provider is slow, and the client polls `status` with backoff.

## Security

Verification decides who pays less, so the client is never trusted.

- Entitlement is read from the server record on every billing action. An `approved` signal in the
  browser only changes copy, never price.
- Discount codes are applied server-side at checkout against `verified_until`; no code string is
  ever sent to the client.
- Email proof requires an OTP the user must read from the institutional inbox. A typed `.edu`
  address alone proves nothing. Generate OTP with a CSPRNG; store a keyed HMAC/peppered hash plus
  `user_id`, `request_id`, normalized institutional-email hash, expiry and `used_at`; compare in
  constant time and consume atomically only after a successful owned-request check. Never log or
  return the OTP. Enforce expiry, single use, and attempt limits. Return generic failure copy so
  institution membership and account state are not enumerable.
- Client validation blocks unselected institutions, non-institutional domains, wrong MIME types, and files over 3 MB; repeat every check server-side.
- Resolve `institutionId` and allowed domains server-side; never trust a client-supplied institution
  record or domain list.
- Cookie-authenticated mutations require CSRF protection; verify origin where supported.
- Domain allowlist check: submitted email domain must match the resolved institution's domains.
- Upload issuer creates an authenticated user's owned draft verification request and one pending upload record, then signs one private, fixed object key/prefix bound to that user and draft `requestId`. Signed URL has short expiry, one-upload use, exact allowed content type, and content-length conditions. Response returns server-issued `requestId` and `documentRef`; client must pass both unchanged to final submit. Final submission atomically finalizes that exact pending draft and accepts `documentRef` only when its owned upload record is unused, pending, and scanned. Server revalidates object ownership/state, inspects bytes (MIME plus magic bytes), quarantines and malware-scans before use, strips EXIF, and rejects failed scans. Delete abandoned or expired objects and upload records. Never render the file back from a user-supplied path.
- Rate limit submissions and OTP attempts per user and per IP; cap `attempts`, lock after 5 failures,
  return `429` with `Retry-After`, and do not let retries bypass the limit or idempotency record.
- Every listed endpoint requires an authenticated session. For every `requestId` or `documentRef`
  lookup, query by `{ id/ref, user_id: session.userId }`; reject cross-user references as not-found.
  Never accept a client owner/user ID. This applies to upload-url, submit, confirm, review, status,
  and institution lookup, preventing IDOR and cross-account document attachment or attempt exhaustion.
- ID images are PII: hard-delete the private blob, `document_path`, OCR/derived fields, and upload
  record on decision or at 30 days, whichever comes first. Scheduled lifecycle cleanup handles
  abandoned uploads; emit a deletion audit event and retain only minimum non-document verification
  metadata under a named retention schedule. Access stays limited to reviewer role, with encryption
  and every read written to an audit log.
- Consent checkbox is recorded with a timestamp and the privacy-policy version.

## Accessibility

- `role="dialog"`, `aria-modal="true"`, labelled by the step heading, focus moved to the heading on
  open and returned to the CTA on close, `Esc` closes, focus trapped inside.
- Step indicator uses an ordered list with `aria-current="step"`.
- Method radios sit in a `fieldset`/`legend`; conditional fields are revealed, not disabled-hidden.
- Errors: `aria-invalid`, `aria-describedby` to the message, `role="alert"` for the form-level alert.
- Progress and outcome announced through one `aria-live="polite"` region with `aria-busy` while
  checking.
- Every control keyboard reachable with a visible focus ring; the dropzone has a real
  `<input type="file">` and a button, not a bare div.
- Motion respects `prefers-reduced-motion`; spinners degrade to static text.
- Body copy holds 4.5:1 minimum on both themes; success and failure carry an icon plus text, never
  colour alone.

## Motion

Owner: shared app motion tokens, not component-local values. The static mockup defines prototype-only
fallbacks because PrimeNG is absent; production should consume shared tokens.

- Tokens: `--dur-instant: 0ms`, `--dur-fast: 180ms`, `--dur-base: 320ms`, `--dur-slow: 620ms`,
  `--dur-loop: 1800ms`, `--motion-grace: 40ms`, `--stagger-step: 80ms`; easings
  `--ease-out`, `--ease-spring`, and `--ease-standard`.
- Inventory: pricing-card entry stagger/hover, ribbon emphasis, button press/hover/focus, theme
  surfaces and direct token consumers, scrim/dialog open-close, directional pane enter/exit,
  stepper/connector, method choice/proof-field collapse, dropzone, validation error, OTP entry,
  checking progress/indicator, result icon/receipt, strike-through, and alert entry.
- Enter/exit uses transform and opacity first. Connector fill is a documented paint exception;
  proof-field collapse is a documented layout-reflow exception. Pane listeners and fallback timers
  settle on animation end/cancel; user motion-off and `prefers-reduced-motion` disable animation,
  settle progress/results, and preserve static content.

## Design tokens

Existing semantic roles from `src/tailwind.css` only. No new colour literals.

| Token | Usage |
|---|---|
| `--color-canvas` | Page behind the scrim |
| `--color-surface` | Dialog panel |
| `--color-sunken` | Dropzone, code inputs, result panels |
| `--color-hairline` | Borders, dividers |
| `--color-scrim` | Modal backdrop |
| `--color-ink` / `--color-ink-soft` / `--color-ink-muted` | Headings / body / hints and timestamps |
| `--color-brand`, `--color-brand-light`, `--color-on-brand` | Primary CTA, focus ring, progress fill |
| `--color-success` | Approved panel accent |
| `--color-danger` | Failure and field errors |
| `--color-accent-gold` | `For Students` ribbon, manual-review pending accent |
| `--shadow-card` | Dialog elevation |
| `--font-sans` | Bricolage Grotesque |

Radii follow the pricing card scale (`rounded-2xl` panel, `rounded-xl` fields, `rounded-full`
pills). The static mockup hardcodes snapshots of these roles because PrimeNG is not present to emit
`--p-primary-*`; snapshots mirror resolved values from `src/tailwind.css` and must never be copied
back into the runtime bridge. Runtime token note: before normal text uses `--color-brand` (`#967bb6`),
`src/tailwind.css` needs a contrast-aware `--color-on-brand` (default runtime snapshot `#261f2e`) and a
contrast-safe focus role; this pass leaves runtime source untouched. Mock `--color-on-brand` (`#241c2b`)
and `--color-on-brand-dark` provide contrast-safe foregrounds for the light-brand CTA and dark-brand
hover; focus snapshot `--color-brand-light` satisfies focus checks locally. Status snapshots are
illustrative runtime palette values; production resolves success/danger from the live Prime palette. Mock fallback
font matches app `--font-sans`.

## Build phases

1. Model, fixture service, and fixture helpers. **Done.** `StudentVerificationService` exposes the
   frozen contract and deterministic approved, failed, error, OTP-expired, and already-verified
   outcomes. Every service seam remains explicitly marked `// TODO(api):`.
2. Dialog shell, motion, accessibility, and pricing entry-point wiring. **UI implemented.** The
   dialog is signal-driven, rendered from the pricing page, and the student CTA restores focus on
   close and reflects the service's verified state.
3. Method step form: institution lookup, validation, consent. **UI implemented against fixtures.**
   Client-side validation and state transitions are covered without network calls.
4. Email OTP flow against the real endpoint. **Deferred.** Bind the fixture seams to the documented
   `/api/student-verification/confirm` endpoint when backend work is available.
5. Document path: signed upload, size and type guards, provider check. **Fixture UI implemented;
   API deferred.** Bind upload URL issuance and final submission to the documented endpoints.
6. Failure and manual review, including ticket reference and pending copy. **Fixture UI implemented;
   API deferred.**
7. Entitlement enforcement at checkout plus `alreadyVerified` short-circuit. **Backend deferred.**
   The browser signal changes copy only; checkout must re-read server entitlement.
8. Tests and docs. **In progress/implemented for the fixture-backed UI.** Production API contract,
   idempotency, persistence, polling, and server security remain backend work.

## Current implementation status

Created or updated files:

- `src/app/features/student-verification/models/student-verification.model.ts` — frozen model contract.
- `src/app/features/student-verification/services/student-verification.fixtures.ts` — institutions,
  OTP/document constants, validators, and fixture result factory.
- `src/app/features/student-verification/services/student-verification.service.ts` — fixture-backed
  state machine and public signals/actions.
- `src/app/features/student-verification/components/student-verification-dialog/` — accessible,
  motion-aware dialog UI.
- `src/app/features/pricing/pages/pricing/pricing.component.ts` — dialog state, outputs, focus return,
  and service-derived verified state.
- `src/app/features/pricing/pages/pricing/pricing.component.html` — dialog host and verified CTA copy.
- `src/app/features/pricing/pages/pricing/pricing.component.spec.ts` — entry-point, focus, and verified-copy tests.
- `docs/student-verification-plan.md` — implementation status and deferred API notes.

Exact API binding seams currently present in `student-verification.service.ts`:

```ts
// TODO(api): bind institution lookup to GET /api/institutions?q=.
// TODO(api): revalidate the institution domain on POST /api/student-verification.
// TODO(api): bind submission to POST /api/student-verification; document uploads use POST /api/student-verification/upload-url first.
// TODO(api): bind code confirmation to POST /api/student-verification/confirm.
// TODO(api): bind OTP resend to POST /api/student-verification/confirm.
// TODO(api): bind manual escalation to POST /api/student-verification/review.
// TODO(api): bind retry to GET /api/student-verification/status and POST /api/student-verification.
// TODO(api): bind restored verification state to GET /api/student-verification/status.
// TODO(api): bind draft restoration to GET /api/student-verification/status.
```

## Verification checklist

- [x] `npx ng build` passes for the fixture-backed implementation when the parallel dialog component is present.
- [x] Student verification service fixture specs pass.
- [x] Student CTA opens the dialog, and closing returns focus to the CTA.
- [x] Student CTA label and supporting copy change when `canUseStudentPlan()` becomes true.
- [x] Unknown institution, non-institutional domain, wrong file type, and 4 MB file are rejected by fixture-side guards.
- [x] OTP confirmation accepts only exactly six numeric digits; resend resets the fixture TTL/cooldown.
- [x] Approved, failed, error, OTP-expired, already-verified, and manual-pending fixture states render through the dialog.
- [ ] Real institution lookup, OTP confirmation/resend, document upload, submission, status polling, and manual review API bindings.
- [ ] Server-side entitlement enforcement, idempotency, rate limits, persistence, and document lifecycle controls.
- [ ] Full end-to-end verification against authenticated backend endpoints.
- [ ] Light/dark themes and keyboard-only flow remain readable and accessible after API binding.

## Open questions

- Build the automated check in-house (institution domain list + OCR) or buy SheerID / UNiDAYS?
- Which institutions and verified domain aliases belong in the initial allowlist?
- Is Indian institution coverage good enough for a domain-only check, given many colleges issue no
  student email?
- Re-verification cadence: annual re-check, or trust `verified_until` and lapse silently?
- OTP TTL, resend cooldown, and attempt limits: confirm product values.
- How should `409` surface when an idempotency record is still in progress versus already complete?
- Does manual review live in the existing support inbox or need an admin screen?
- Should an unverified user be able to start Student Premium provisionally for 7 days?
