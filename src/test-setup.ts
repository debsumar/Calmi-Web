import { TestBed } from '@angular/core/testing';
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
 * Only genuinely pending handles are tracked: a `setTimeout` removes itself
 * when it fires (the callback is wrapped), an interval stays until cleared.
 * Fake timers (`vi.useFakeTimers()`) replace the globals and so bypass these
 * wrappers entirely; handles created before faking are still tracked and swept.
 *
 * This is a safety net, not a licence: specs that assert timing behaviour
 * should still use `vi.useFakeTimers()`.
 */
type TimerHandle = ReturnType<typeof setTimeout>;
type TimerKind = 'timeout' | 'interval';

const pendingHandles = new Map<TimerHandle, TimerKind>();
const realSetTimeout = globalThis.setTimeout;
const realSetInterval = globalThis.setInterval;
const realClearTimeout = globalThis.clearTimeout;
const realClearInterval = globalThis.clearInterval;

globalThis.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
  // String handlers (eval-style) cannot be wrapped; pass through untracked.
  if (typeof handler !== 'function') {
    return realSetTimeout(handler, timeout, ...args);
  }
  const handle: TimerHandle = realSetTimeout(
    (...callbackArgs: unknown[]) => {
      pendingHandles.delete(handle);
      return handler(...callbackArgs);
    },
    timeout,
    ...args,
  );
  pendingHandles.set(handle, 'timeout');
  return handle;
}) as typeof setTimeout;

globalThis.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
  const handle: TimerHandle = realSetInterval(handler, timeout, ...args);
  pendingHandles.set(handle, 'interval');
  return handle;
}) as typeof setInterval;

globalThis.clearTimeout = ((handle: Parameters<typeof clearTimeout>[0]) => {
  if (handle !== undefined) pendingHandles.delete(handle as TimerHandle);
  realClearTimeout(handle);
}) as typeof clearTimeout;

globalThis.clearInterval = ((handle: Parameters<typeof clearInterval>[0]) => {
  if (handle !== undefined) pendingHandles.delete(handle as TimerHandle);
  realClearInterval(handle);
}) as typeof clearInterval;

afterEach(() => {
  // Tear the TestBed down FIRST: services and components clear their timers in
  // `ngOnDestroy` / `DestroyRef.onDestroy`, and Angular's own auto-teardown hook
  // runs after this one (vitest runs `afterEach` hooks in reverse registration
  // order and this file registers last). Counting before teardown reported
  // properly cleaned-up timers as leaks. Resetting twice is a no-op.
  try {
    TestBed.resetTestingModule();
  } catch {
    // Teardown errors are surfaced by Angular's own hook; do not mask the real result here.
  }
  if (pendingHandles.size === 0) return;
  const leaked = pendingHandles.size;
  for (const [handle, kind] of pendingHandles) {
    if (kind === 'interval') realClearInterval(handle);
    else realClearTimeout(handle);
  }
  pendingHandles.clear();
  console.warn(`[test-setup] cleared ${leaked} leaked timer handle(s) after this test.`);
});

/**
 * jsdom does not implement canvas; `getContext` logs "Not implemented" noise
 * and returns undefined. Return `null` (the spec'd "unsupported" result)
 * silently. Plain writable/configurable property so `vi.spyOn` still works.
 */
if (typeof HTMLCanvasElement !== 'undefined') {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    writable: true,
    configurable: true,
    value: () => null,
  });
}

/**
 * jsdom has no `URL.createObjectURL` / `revokeObjectURL`. Provide inert
 * defaults ONLY when missing, as writable + configurable properties, so specs
 * can `vi.spyOn` / reassign them and restore afterwards.
 */
if (typeof URL !== 'undefined') {
  if (typeof URL.createObjectURL !== 'function') {
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      configurable: true,
      value: () => 'blob:test-setup-stub',
    });
  }
  if (typeof URL.revokeObjectURL !== 'function') {
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      configurable: true,
      value: () => undefined,
    });
  }
}
