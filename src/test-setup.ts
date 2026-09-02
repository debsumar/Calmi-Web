import { afterEach } from 'vitest';

/**
 * Global test setup, executed after the Angular TestBed is initialised and
 * before any spec file runs.
 *
 * jsdom ships no `matchMedia`, so every component that reads a media query
 * (theme resolution, `prefers-reduced-motion`, `prefers-reduced-transparency`,
 * the chat panel's viewport check) used to throw
 * `TypeError: matchMedia is not a function` mid-render. Individual specs papered
 * over it with their own `vi.stubGlobal`, which made results order-dependent:
 * a suite passed alone and failed inside the full run depending on which file
 * had stubbed the global first.
 *
 * A single inert default fixes that. Specs that care about a specific query
 * result can still override it with `vi.stubGlobal('matchMedia', ...)`.
 */

/** Minimal, spec-compliant `MediaQueryList` that never matches. */
function createMediaQueryList(query: string): MediaQueryList {
  return {
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    // Deprecated Safari surface, still probed by some libraries.
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  } as MediaQueryList;
}

// Service-only specs run in the default Node environment, where `window` is
// absent; only patch when a DOM is actually present.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => createMediaQueryList(query),
  });
}

/**
 * Leaked-timer guard.
 *
 * `pool: 'threads'` + `isolate: true` means a worker cannot exit while a timer
 * is still pending, and the app schedules genuinely long ones —
 * `OTP_TTL_SECONDS` is 10 minutes. A spec that walks the email verification
 * path without fake timers therefore leaves a 600s handle behind and the whole
 * run looks frozen instead of failing. Clearing stragglers after each test
 * turns that hang into a visible warning.
 *
 * This is a safety net, not a licence: specs that assert timing behaviour
 * should still use `vi.useFakeTimers()`.
 */
const pendingHandles = new Set<ReturnType<typeof setTimeout>>();
const realSetTimeout = globalThis.setTimeout;
const realSetInterval = globalThis.setInterval;
const realClearTimeout = globalThis.clearTimeout;
const realClearInterval = globalThis.clearInterval;

globalThis.setTimeout = ((...args: Parameters<typeof setTimeout>) => {
  const handle = realSetTimeout(...args);
  pendingHandles.add(handle);
  return handle;
}) as typeof setTimeout;

globalThis.setInterval = ((...args: Parameters<typeof setInterval>) => {
  const handle = realSetInterval(...args);
  pendingHandles.add(handle);
  return handle;
}) as typeof setInterval;

globalThis.clearTimeout = ((handle: Parameters<typeof clearTimeout>[0]) => {
  if (handle !== undefined) pendingHandles.delete(handle as ReturnType<typeof setTimeout>);
  realClearTimeout(handle);
}) as typeof clearTimeout;

globalThis.clearInterval = ((handle: Parameters<typeof clearInterval>[0]) => {
  if (handle !== undefined) pendingHandles.delete(handle as ReturnType<typeof setTimeout>);
  realClearInterval(handle);
}) as typeof clearInterval;

afterEach(() => {
  if (pendingHandles.size === 0) return;
  const leaked = pendingHandles.size;
  for (const handle of pendingHandles) {
    realClearTimeout(handle);
    realClearInterval(handle as unknown as ReturnType<typeof setInterval>);
  }
  pendingHandles.clear();
  console.warn(`[test-setup] cleared ${leaked} leaked timer handle(s) after this test.`);
});
