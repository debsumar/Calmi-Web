# Calmi Web — Session Changelog
**Date:** 20 May 2026 | **Branch:** Calmi-Web

---

## 🔐 Authentication

### Google-Only Sign-In (Supabase OAuth)
- Removed email/password login form, forgot password link, email sign-in button, divider, and sign-up link from both the **Login Dialog** and the **Login Route Page** (`/auth/login`).
- The app now supports **Google Sign-In only** via Supabase OAuth.
- Cleaned up unused `onSubmit()` method and `PrimaryButtonComponent` import from both login components.

### Local Storage Persistence
- After Google sign-in, the user session is saved to **localStorage** so they remain logged in on refresh.
- Logout clears localStorage and resets the auth state.

---

## 👤 User Profile (Navbar)

- After sign-in, the **profile icon** in the top navigation bar now shows:
  - The user's **Google profile photo** as the avatar.
  - A dropdown with the user's **full name**, **email**, and a **Logout** button.
- Logout clears the session and reverts the navbar to the default sign-in state.

---

## 🏠 Home Page

### Personalized Greeting
- The **"What are you feeling right now?"** section heading is now dynamic:
  - **Logged in:** `"How are you feeling today, [First Name]?"` — extracts first name from Google profile (falls back to email prefix).
  - **Logged out:** `"What are you feeling right now?"` (default unchanged).

### Light/Dark Mode Theme Fix for Hero Section
- The hero background now correctly responds to the theme:
  - **Light mode:** Soft lavender (`#9b8abf`) — matching the brand palette.
  - **Dark mode:** Deep purple gradient (`from-[#1b0d36] to-[#0c0517]`).
- The **One-Minute Reset** player card and **"Still feeling overwhelmed?"** footer CTA card also now use soft lavender in light mode and deep purple in dark mode.
- Illustrations remain static (opacity unchanged across themes).

---

## 🎵 Sounds Page

### Light/Dark Mode Theme Fix
- **Hero section** background changed from always-dark `bg-brand-dark` to:
  - **Light mode:** Soft lavender (`#9b8abf`).
  - **Dark mode:** Deep brand purple (`bg-brand-dark`).
- **Active "All Sounds" vibe filter button** updated similarly:
  - **Light mode:** Soft lavender (`#9b8abf`).
  - **Dark mode:** Deep brand purple (`bg-brand-dark`).

---

## 💬 Login Dialog UI Enhancements

### Glassmorphism & Transparency
- Dialog background set to **10% opacity** with `backdrop-blur-sm` for a clear glass look (not frosted).
- Border updated to a soft translucent white (`border-white/20 dark:border-white/10`).
- The **modal overlay backdrop** (behind the dialog) now applies `backdrop-filter: blur(12px)` — blurring the page content behind the dialog when open.

### Text Readability Fix (Light Mode)
- In light mode, text colors changed to white-based for readability against transparent glass:
  - "Welcome back" → `text-white`
  - "Rejoin your space of calm" → `text-white/80`
  - Bottom tagline → `text-white/70`
  - Google button background → `bg-white/30` with `text-gray-900`
- Dark mode text untouched (already readable).

### Flickering Fixed
- Removed the conflicting `.dialog-enter` CSS animation class from the PrimeNG dialog container, eliminating the double-animation flicker on open.

### Pulsating Logo Animation
- The **Calmi logo** inside the dialog now has a slow, calming breathing animation (`scale` + `opacity` + purple `drop-shadow` glow) cycling every **2.2 seconds**.
- Logo size increased from `h-12` to `h-16`.

### Staggered Content Entrance
- Dialog content elements (Logo → Title → Subtitle → Button → Tagline) now **fade up sequentially** when the dialog opens using a custom `dialogFadeUp` keyframe animation with a **180ms delay** between each item.

---

## 🧭 Navigation & UX

### Scroll Position Restoration (Per-Tab Memory)
- Created `ScrollPositionService` (`src/app/core/services/scroll-position.service.ts`).
- Saves `window.scrollY` on `NavigationStart`, restores on `NavigationEnd`.
- Switching between Home, Sessions, Sounds, About Us, and Pricing tabs now remembers scroll position per route.

### Topbar Redesign
- **Frosted glass effect:** `bg-white/80 backdrop-blur-md` (light) / `bg-[#090514]/80` (dark).
- **Bottom border separator:** `border-b border-gray-100 dark:border-white/5`.
- **Vertical divider** between nav links and action buttons (theme toggle, user icon).

---

## 🎨 Animations & Scroll Effects

### Scroll-Triggered Stagger (About Us & Pricing)
- Replaced CSS-only `animate-fade-in-up` (fire on load) with `appAnimateOnScroll` directive on:
  - **About Us:** Hero text, image section, values heading, value cards, footer CTA.
  - **Pricing:** Header section, pricing cards.
- Sounds page: Added `appAnimateOnScroll` to **hero text**, **featured sound cards**, and **all sounds list items**.

---

## 🎵 Sounds Page Redesign

### Search Bar Repositioned
- Removed search from hero section.
- Placed inline with "Browse by Vibe" heading (title left, search right, same row).

### Vibe Filters Redesigned
- Changed from **large 120×120px circles** to **compact horizontal pills** (icon + label side by side).
- Added `p-2 -m-2` for hover scale breathing room (no edge clipping).

### Section Reorder
- Swapped: Now **Featured Sounds** appears before **Browse by Vibe**.
- Reduced spacing between sections for tighter layout.

### Featured Sounds Carousel Improvements
- **Softer edge fades:** Gradients now match page bg (`from-[#f5f3f0]` / `from-[#090514]`) instead of harsh black.
- **Hover lift:** Cards rise with `-translate-y-1` and deeper shadow on hover.
- **Better peek:** Card width adjusted to `70vw` / `260px` showing more of next card.
- **Progress dots:** Centered below carousel, active dot stretches wider with brand color.
- **Play button on hover only:** Fades in with scale animation, cleaner resting state.
- Removed "View All →" link, kept only left/right arrow buttons.

### Equalizer Pause/Play Fix
- Clicking the equalizer on an active sound card now **toggles pause/play** instead of restarting the track.
- Added `paused` output to `SoundCardComponent` with `stopPropagation()`.

---

## 🔊 Audio Player Enhancements

### Seamless Audio Looping (Fake Duration)
- Audio now always loops (`audio.loop = true`).
- Player displays the **track metadata duration** (e.g., 45:00) instead of actual audio length.
- Elapsed time tracked via independent timer (not `audio.currentTime`).
- Seek maps correctly via modulo against actual audio duration.
- Auto-stops or advances when display duration is reached.

### Seek Bar Thumb/Head
- Added a **brand-colored circle thumb** that appears on hover.
- Positioned at current progress percentage.
- Themed: `border-white` (light) / `border-gray-900` (dark).

### Player Bar Glass Transparency
- Player bar now uses the same glass style as the login dialog: `bg-white/10 backdrop-blur-sm` with translucent border (`border-white/20`).

---

## 🛠 Technical / Infrastructure

- **Vercel MCP** added to the Antigravity configuration via `npx mcp-remote https://mcp.vercel.com`.
- All changes verified with **clean development builds** — zero errors.

---

> All source changes are in the `Calmi-Web` Angular workspace. No backend schema changes were made this session.
