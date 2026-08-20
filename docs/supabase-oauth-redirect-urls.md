# Supabase OAuth Redirect URLs

Status: **applied 2026-08-20** via the Management API. No code change was required.

Original problem: after a successful Google OAuth sign-in, the browser landed on
`https://calmi-web-debanjan-sumars-projects.vercel.app/` instead of staying on the originating origin —
both from production (`www.calmi.in`) and from the local dev server.

## Root cause

`AuthService.signInWithProvider()` builds `redirectTo` from `window.location.origin`, so it always sends
the correct origin. Supabase validates `redirectTo` against the project's **Redirect URLs** allow list;
when the value is not on the list it is **silently discarded** and Supabase falls back to **Site URL**.
Site URL was the Vercel domain, and neither `www.calmi.in` nor the dev origin was on the allow list.

```text
app  --redirectTo=<origin>-->  Supabase Auth
                                ├─ on allow list?  → honour it
                                └─ not listed?     → fall back to Site URL (silently)
```

## What is configured now

Project ref: `yguztxepfnjccbvwzttj`
Dashboard: <https://supabase.com/dashboard/project/yguztxepfnjccbvwzttj/auth/url-configuration>

Site URL: `https://www.calmi.in`

Redirect URLs (14): the eight pre-existing Vercel production and preview patterns, plus

```text
https://www.calmi.in        https://www.calmi.in/**
https://calmi.in            https://calmi.in/**
http://localhost:2000       http://localhost:2000/**
```

## Two gotchas that made this take longer than it should have

**The port must match exactly.** The dev server runs on **2000**, set in `angular.json` (`serve` options,
`"port": 2000`) — not Angular's default 4200. The allow list is exact per origin *and* port, so entries for
the wrong port match nothing. Verify the real value in the edge logs rather than assuming:

```sql
select timestamp, log_attributes['request.url'] from logs
where source = 'edge_logs' and log_attributes['request.path'] = '/auth/v1/authorize'
order by timestamp desc limit 5
```

The `redirect_to` query param in that URL is the ground truth for what the app sent.

**Both the bare origin and the `/**` form are needed.** In Supabase's glob matcher `.` and `/` are
separators and `**` matches any sequence, but the literal `/` in `http://localhost:2000/**` must still be
present in the candidate URL. `window.location.origin` has **no** trailing slash, so the bare origin needs
its own entry. The `/**` entry covers the other branch of `signInWithProvider()`, where a validated
`returnUrl` is appended and `new URL(origin)` serialises with a slash: `http://localhost:2000/?returnUrl=…`.

## Nothing to change at the identity providers

Google and Apple redirect to **Supabase**, not to this app. Confirm once and leave alone:

| Provider | Value that must exist |
|---|---|
| Google Cloud → OAuth client → Authorized redirect URIs | `https://yguztxepfnjccbvwzttj.supabase.co/auth/v1/callback` |
| Apple → Service ID → Return URLs | `https://yguztxepfnjccbvwzttj.supabase.co/auth/v1/callback` |

## Security constraints

- List **specific** origins only. Never `**` alone, and never `https://*.vercel.app/**`. Anything on the
  allow list is a valid delivery target for a real session token, so a broad pattern turns any matching
  (or hijacked) host into an account-takeover path.
- The inherited `https://calmi-*-web-…-projects.vercel.app/**` preview patterns are the form Supabase
  recommends for Vercel and are scoped to this team's slug, but they do mean any preview deployment can
  receive a live session token. Prefer testing OAuth on localhost or production; delete stale entries.
- Site URL is also the base for password-reset and email-confirmation links, so changing it changes those
  emails too. Re-test the forgot-password flow after any Site URL change.
- `redirectTo` is built from `window.location.origin` plus a `safeReturnUrl()`-validated path. Keep that
  validation: it is what stops `?returnUrl=https://evil.com` and `//evil.com` from becoming open redirects.
- Session tokens persist in `localStorage` (required for the PKCE code verifier and for
  session-survives-refresh), so XSS on the origin can exfiltrate them. Hardening path, if ever needed:
  move to a server-managed HttpOnly cookie session.

## Changing this config later

The Supabase MCP server cannot do it — auth URL configuration is not one of its tools, and it is started
`read_only=true`. Use the dashboard, or the Management API with a personal access token:

```powershell
$h = @{ Authorization = "Bearer $env:SUPABASE_ACCESS_TOKEN" }
$u = 'https://api.supabase.com/v1/projects/yguztxepfnjccbvwzttj/config/auth'
Invoke-RestMethod -Uri $u -Headers $h -Method Get | Select-Object site_url, uri_allow_list
```

`uri_allow_list` is a comma-separated string and PATCH **replaces the whole list** — always GET, merge,
then PATCH. Never paste a `sbp_…` token into a chat or commit it; export it as an env var.

## Verification checklist

| Check | Expected |
|---|---|
| Google sign-in from `http://localhost:2000/auth/login` | returns to `http://localhost:2000/`, topbar shows avatar |
| Google sign-in from `https://www.calmi.in/auth/login` | returns to `https://www.calmi.in/` |
| Sign-in with `?returnUrl=%2Fhome%3Ftab%3Dcalm` | returns to `/home?tab=calm` — proves the allow list matched rather than the Site URL fallback masking a failure |
| Hard refresh after sign-in | still signed in (session restored via `restoreSession()`) |
| `?returnUrl=https://evil.com` appended manually | rejected, lands on `/home` |
| Forgot-password email link | points at `https://www.calmi.in/auth/reset` |
