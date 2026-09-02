/**
 * Watchdog wrapper around `ng test`.
 *
 * Why this exists: the unit-test builder runs Vitest with `pool: 'threads'` and
 * `isolate: true`. A worker cannot exit while a timer is pending, and this app
 * schedules long ones (`OTP_TTL_SECONDS` is 10 minutes). A spec that leaks one
 * makes the command sit there with no output and no exit — indistinguishable
 * from a frozen terminal, which is how CI time and patience get burned.
 *
 * This wrapper streams output live and kills the whole process tree after a
 * hard deadline, exiting non-zero. A hang becomes a bounded, diagnosable
 * failure instead of an open-ended stall.
 *
 * Usage:
 *   node scripts/run-tests.mjs                 # 300s budget, whole suite
 *   node scripts/run-tests.mjs --timeout=120   # custom budget in seconds
 *   node scripts/run-tests.mjs -- --include=src/app/features/**\/*.spec.ts
 */
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const DEFAULT_TIMEOUT_SECONDS = 300;

const argv = process.argv.slice(2);
const timeoutArg = argv.find((arg) => arg.startsWith('--timeout='));
const passthrough = argv.filter((arg) => arg !== timeoutArg && arg !== '--');
const timeoutSeconds = Number.parseInt(timeoutArg?.split('=')[1] ?? '', 10) || DEFAULT_TIMEOUT_SECONDS;

const isWindows = process.platform === 'win32';
// Spawn the CLI's JS entry with the current Node binary: Node refuses to spawn
// `npx.cmd` without a shell (EINVAL on Windows), and enabling a shell would put
// these arguments through cmd.exe parsing. This keeps `shell: false`.
const cliEntry = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules/@angular/cli/bin/ng.js');
const command = process.execPath;
const args = [cliEntry, 'test', '--watch=false', ...passthrough];

console.log(`[run-tests] ng test --watch=false ${passthrough.join(' ')} (hard limit ${timeoutSeconds}s)`);

const child = spawn(command, args, { stdio: 'inherit', shell: false });

let timedOut = false;

/** Kill the child and everything it spawned; Vitest workers outlive a plain SIGTERM. */
function killTree() {
  if (child.pid === undefined) return;
  if (isWindows) {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    return;
  }
  try {
    process.kill(-child.pid, 'SIGKILL');
  } catch {
    child.kill('SIGKILL');
  }
}

const watchdog = setTimeout(() => {
  timedOut = true;
  console.error(
    `\n[run-tests] No exit after ${timeoutSeconds}s — killing the process tree.\n`
    + '[run-tests] This is almost always a leaked timer keeping a Vitest worker alive.\n'
    + '[run-tests] Look for a spec that walks the OTP/resend path without vi.useFakeTimers().',
  );
  killTree();
}, timeoutSeconds * 1000);

child.on('error', (error) => {
  clearTimeout(watchdog);
  console.error(`[run-tests] failed to start: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  clearTimeout(watchdog);
  if (timedOut) process.exit(124); // conventional timeout status
  if (signal) {
    console.error(`[run-tests] terminated by signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
