# Calmi Web — Session Changelog (20 May 2026)

## Authentication
- **Google-only sign-in** via Supabase OAuth — removed email/password form, forgot password, sign-up link from Login Dialog and `/auth/login` route.
- **Session persistence** in localStorage; logout clears state.

## User Profile (Navbar)
- Signed-in users see their **Google avatar** with a dropdown showing full name, email, and logout button.

## Home Page
- **Dynamic greeting:** "How are you feeling today, [First Name]?" when logged in; default text when logged out.
- **Theme-aware hero:** Light mode uses soft lavender (`#9b8abf`); dark mode uses deep purple gradient. Same applied to One-Minute Reset card and footer CTA.

## Sounds Page
- **Hero theme fix:** `#9b8abf` (light) / `bg-brand-dark` (dark).
- **Search bar** moved inline with "Browse by Vibe" heading (title left, search right).
- **Vibe filters** redesigned from 120px circles → compact horizontal pills with `p-2 -m-2` for hover breathing room.
- **Section reorder:** Featured Sounds → Browse by Vibe → All Sounds.
- **Carousel improvements:** Softer page-bg-matching edge fades (`from-[#f5f3f0]`/`from-[#090514]`), hover lift (`-translate-y-1`), better peek (`70vw`/`260px`), progress dots (active stretches wider), play button visible on hover only. Removed "View All" link.
- **Equalizer click** now toggles pause/play instead of restarting (added `paused` output with `stopPropagation`).
- **Audio looping:** `audio.loop = true` always; displays track metadata duration (e.g., 45:00) not actual length. Timer-based elapsed tracking; seek uses modulo against real audio duration.
- **Seek bar thumb:** Brand-colored circle appears on hover, themed with `border-white`/`border-gray-900`.
- **Player bar glass:** `bg-white/10 backdrop-blur-sm` with translucent border matching login dialog style.
- **Hero stagger:** `appAnimateOnScroll` added to hero heading and subtitle.
- **List animations:** `appAnimateOnScroll` on featured sound cards and all sounds items.

## Login Dialog
- **Glass transparency:** `bg-white/10 backdrop-blur-sm` (clear glass, not frosted).
- **Light mode readability:** Text switched to `text-white`/`text-white/80`/`text-white/70`; button uses `bg-white/30 text-gray-900`.
- **Dark mode untouched** (already readable).
- **Backdrop blur** (`12px`) on modal overlay behind dialog.
- **Flicker fix:** Removed conflicting `.dialog-enter` CSS animation.
- **Logo pulse:** Breathing animation (scale + opacity + purple glow) every 2.2s; size bumped to `h-16`.
- **Stagger entrance:** Content fades up sequentially with 180ms delay per item.

## Navigation & Layout
- **Scroll position restoration:** `ScrollPositionService` saves/restores `window.scrollY` per route on tab switches.
- **Topbar:** Frosted glass (`bg-white/80 backdrop-blur-md`), bottom border, vertical divider between nav and actions.

## Animations
- **About Us:** Replaced CSS `animate-fade-in-up` with `appAnimateOnScroll` directive on hero, image, values heading, cards, footer CTA.
- **Pricing:** Same replacement on header section and pricing cards.
- Reduced spacing between sections on sounds page for tighter layout.

## Infrastructure
- Vercel MCP added. All changes verified with clean builds. Deployed to **https://www.calmi.in**.
