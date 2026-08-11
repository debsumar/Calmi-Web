/**
 * Generates src/environments/license.ts from an untracked source so the PrimeUI
 * license key is never committed.
 *
 * Key resolution order:
 *   1. process.env.PRIMEUI_LICENSE_KEY  (use this in CI / deployment)
 *   2. PRIMEUI_LICENSE_KEY=... in .env.local  (local development)
 *
 * If no key is found the file is still generated with an empty string, so the
 * build always succeeds; PrimeNG then shows its "Invalid PrimeUI License"
 * notice instead of failing the build.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = resolve(projectRoot, '.env.local');
const outFile = resolve(projectRoot, 'src/environments/license.ts');

/** Reads a single key from a .env style file without adding a dependency. */
function readFromEnvFile(name) {
  if (!existsSync(envFile)) return '';

  for (const rawLine of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator === -1) continue;
    if (line.slice(0, separator).trim() !== name) continue;

    return line
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
  }

  return '';
}

const key = (process.env.PRIMEUI_LICENSE_KEY ?? '').trim() || readFromEnvFile('PRIMEUI_LICENSE_KEY');

writeFileSync(
  outFile,
  `// GENERATED FILE - do not edit and do not commit.\n` +
    `// Created by scripts/set-license.mjs from PRIMEUI_LICENSE_KEY.\n` +
    `export const primeLicenseKey = ${JSON.stringify(key)};\n`,
  'utf8',
);

console.log(
  key
    ? '[set-license] PrimeUI license key injected into src/environments/license.ts'
    : '[set-license] No PRIMEUI_LICENSE_KEY found; generated an empty license key.',
);
