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
