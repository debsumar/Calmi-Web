import { defineConfig } from 'vitest/config';

/**
 * Runner config consumed by the `@angular/build:unit-test` builder
 * (see the `runnerConfig` option in angular.json).
 *
 * Why this file exists:
 * - The builder runs Vitest with `isolate: false` by default, so every spec shares one
 *   module registry. With a shared registry, a `vi.mock()` in one spec leaks into the
 *   others and load order decides which factory wins - that made `@supabase/supabase-js`
 *   mocks apply intermittently and let the real Supabase client (live HTTP + auth
 *   auto-refresh timers) load inside jsdom specs. `isolate` is re-enabled in angular.json.
 * - Isolation spawns one worker per spec file. Windows fork startup is slow enough to hit
 *   `[vitest-pool]: Timeout starting forks runner`, so use the threads pool instead:
 *   same isolation guarantee, much cheaper start-up. Worker count is capped because
 *   booting Angular + jsdom in every worker at once also times out pool start-up.
 */
export default defineConfig({
  test: {
    pool: 'threads',
    isolate: true,
    maxWorkers: 4,
    minWorkers: 1,
  },
});
