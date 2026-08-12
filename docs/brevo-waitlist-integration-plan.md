# Brevo Waitlist — Prototype Plan

Status: **live in production on www.calmi.in** (2026-08-13). Honeypot wired. Privacy/legal hardening deferred (see Later).

## Verified

| Check | Result |
|---|---|
| `POST /api/waitlist` valid email | `200 {"success":true}` |
| Resubmit same email | `200` — no duplicate error (`updateEnabled: true`) |
| Invalid email / empty body | `400 "Enter a valid email address."` |
| Honeypot filled | `200`, and address absent from Brevo — zero Brevo calls |
| `GET /api/waitlist` | `405` + `Allow: POST` + `Cache-Control: no-store` |
| Brevo list membership | `<your verified Brevo sender>` in list `3` (Calmi Waitlist) |
| Welcome mail | 2 sends, both `delivered` (Brevo event log) |
| Browser bundle scan | no `xkeysib`, no `BREVO_API_KEY`, no `api.brevo.com` in `dist/` or `src/` |
| SPA rewrite vs function | `/api/waitlist` reaches the function; catch-all does not shadow it |

Brevo account is on the **free** plan: 300 emails/day. That is the practical waitlist ceiling.

## Gotcha worth remembering

Vercel compiles `api/*.ts` with the nearest `tsconfig.json`. The root one uses `"module": "ES2022"`, which emitted `export default` into a `.js` file that Vercel's Node launcher loads as CommonJS — every request died with `FUNCTION_INVOCATION_FAILED` and no runtime logs. Fix: `api/tsconfig.json` with `"module": "CommonJS"`. Do not remove that file.


## Decision

Waitlist submit → Vercel Function → Brevo. No separate backend, no SSR.

```text
waitlist-card.component  →  POST /api/waitlist  →  api/waitlist.ts (Vercel Function)
                                                     ├─ POST /v3/contacts        (save lead to list)
                                                     └─ POST /v3/smtp/email      (send welcome mail)
```

`BREVO_API_KEY` lives only in Vercel Environment Variables. Never in `src/`, never in the browser bundle. This is the one non-negotiable: a leaked key lets anyone send mail from your domain and drain your Brevo credits.

## Brevo dashboard prereqs

Owner does this once, before code:

1. Verify a sender email (or domain) in Brevo. Required or `smtp/email` rejects.
2. Create list `Calmi Waitlist`. Copy the numeric list ID.
3. Create API key (Settings → SMTP & API → API keys).

No DOI template needed. Prototype uses single opt-in + a plain welcome mail.

## Vercel environment variables

Set in all three Vercel environments (Development, Preview, Production) — done via `vercel env add ... --non-interactive`.

| Var | Value in use | Notes |
|---|---|---|
| `BREVO_API_KEY` | `xkeysib-…` | Stored Sensitive. Server only. **Rotate — it was pasted into a chat transcript.** |
| `BREVO_LIST_ID` | `3` | List "Calmi Waitlist", created via API. |
| `BREVO_SENDER_EMAIL` | `<your verified Brevo sender>` | Verified sender in Brevo. |
| `BREVO_SENDER_NAME` | `Calmi` | |

Local dev: `vercel env pull` writes `.env.local` (already gitignored). Add names only to `.env.example`, never values.

## Files

| File | Change |
|---|---|
| `api/waitlist.ts` | Done. The Vercel Function. |
| `api/tsconfig.json` | Done. Forces CommonJS emit — required, see Gotcha. |
| `.env.example` | Done. 4 Brevo var names, blank values. |
| `.env.local` | Done. Real values, gitignored (`.env*.local`). |
| `src/environments/environment.ts` | Done. `apiUrl: '/api'` so dev matches prod. |
| `package.json` | Done. Pinned `@vercel/node` 5.9.9 + `@types/node` 26.2.0, `typecheck:server`, `dev:api`. |
| `vercel.json` | Unchanged — verified the function is not shadowed. |
| `src/app/core/services/waitlist.service.ts` | Done. `join(email, honeypot)` posts `{ email, website }`. |
| `src/app/shared/components/waitlist-card/waitlist-card.component.ts` | Done. Off-screen `website` decoy, `aria-hidden` + `tabindex="-1"`. |
| `src/app/shared/components/waitlist-card/waitlist-card.component.spec.ts` | Done. Updated call assertion, added 2 honeypot tests (not executed — user deferred test runs). |

Existing client contract already matches: `WaitlistService.join(email)` posts `{ email }` to `${apiUrl}/waitlist` and expects `{ success, message? }`. Keep it.

## Function skeleton

```ts
// api/waitlist.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. POST only -> 405
  // 2. read { email, website } from req.body
  // 3. honeypot: website non-empty -> return { success: true } and send nothing
  // 4. trim email, max 254 chars, basic shape check -> 400 on fail
  // 5. POST https://api.brevo.com/v3/contacts
  //      headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json' }
  //      body:    { email, listIds: [Number(process.env.BREVO_LIST_ID)], updateEnabled: true }
  //      201 = created, 400 duplicate_parameter = already on list -> both OK
  // 6. POST https://api.brevo.com/v3/smtp/email  (welcome mail, inline html)
  //      body: { sender: { email, name }, to: [{ email }], subject, htmlContent }
  //      mail failure must NOT fail the request - lead is already saved
  // 7. respond { success: true, message: "You're on the list. Check your inbox." }
  // 8. any upstream error -> 502 { success: false, message: 'Try again later.' }
}
```

`updateEnabled: true` makes resubmit idempotent — existing contact just gets re-added to the list instead of erroring.

Use built-in `fetch` (Node 18+ on Vercel). No Brevo SDK needed for two calls.

## Brevo request shapes

Add contact:

```http
POST https://api.brevo.com/v3/contacts
api-key: <BREVO_API_KEY>
content-type: application/json
```

```json
{ "email": "person@example.com", "listIds": [12], "updateEnabled": true }
```

`201` → created. `400` with `{ "code": "duplicate_parameter" }` → already exists; treat as success.

Send welcome mail:

```http
POST https://api.brevo.com/v3/smtp/email
api-key: <BREVO_API_KEY>
content-type: application/json
```

```json
{
  "sender": { "email": "hello@calmi.app", "name": "Calmi" },
  "to": [{ "email": "person@example.com" }],
  "subject": "You're on the Calmi waitlist",
  "htmlContent": "<p>Thanks for joining. We'll email you when Calmi opens.</p>"
}
```

`201` → queued, returns `messageId`.

Docs: https://developers.brevo.com/reference/createcontact · https://developers.brevo.com/reference/sendtransacemail

## Routing note — resolved

`vercel.json` rewrites `/(.*)` → `/index.html`. Vercel checks the filesystem (functions included) before applying rewrites, so `/api/waitlist` wins. Confirmed empirically against a preview deployment: the endpoint returned function JSON, never `index.html`. No exclusion rule needed, so `vercel.json` was left untouched.

## Local dev

```bash
vercel env pull        # writes .env.local
vercel dev             # serves Angular + /api/waitlist together on :3000
```

Set `environment.ts` `apiUrl` to `/api` (currently `http://localhost:3000/api`) so the same relative path works in dev, preview, and prod.

## Minimum safety (prototype-level, keep these)

Cheap, and each one prevents a real prototype failure:

- Key server-side only. Grep the build output for `xkeysib` before shipping.
- Validate email server-side. Client regex is UX only.
- Hidden honeypot field. Kills naive bots for ~5 lines of code.
- Don't log the email address or the Brevo response body.
- Return generic error text. Don't forward Brevo's error body to the browser.

Skipping for prototype: DOI/double opt-in, consent checkbox, privacy page, durable rate limiting, consent audit trail.

Rate limiting gap, stated plainly: with no limiter, anyone can POST your endpoint in a loop and burn Brevo credits, and can trigger repeated mail to a chosen address. Acceptable while traffic is near zero. If it gets abused, the cheapest fix is a Vercel Firewall rate-limit rule on `/api/waitlist` — config only, no code, no extra service.

## Test / verify

1. `npm test` — existing waitlist-card specs still pass (service contract unchanged).
2. `npm run build` — Angular build clean.
3. `vercel dev` smoke: valid email → `200`, contact appears in Brevo list, welcome mail arrives at a real inbox you own.
4. Resubmit same email → still success, no duplicate error surfaced.
5. Bad email → `400`, no Brevo call.
6. Honeypot filled → success response, zero Brevo calls.
7. Preview deploy, repeat 3–6 against the deployment URL.

## Later (when past prototype)

- Switch to DOI (`POST /v3/contacts/doubleOptinConfirmation`) for real consent proof; needs a DOI template + `{{ params.DOIurl }}` + redirect page.
- Consent checkbox + privacy notice + retention/deletion process.
- Durable rate limit (Vercel Firewall rule, or Upstash if a per-email cap is needed).
- Stop distinguishing new vs existing emails in responses to avoid membership enumeration.
- Separate server `tsconfig` + tests for `api/`.
