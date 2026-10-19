// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

// Node types are deliberately not pulled into the app's spec compilation (they
// clash with the DOM timer types), so the few Node built-ins used here are typed locally.
interface NodeProcess {
  cwd(): string;
  getBuiltinModule(id: string): unknown;
}
const nodeProcess = (globalThis as unknown as { process: NodeProcess }).process;
const fs = nodeProcess.getBuiltinModule('node:fs') as { readFileSync(path: string, encoding: 'utf8'): string };
const crypto = nodeProcess.getBuiltinModule('node:crypto') as {
  createHash(algorithm: 'sha256'): { update(data: string): { digest(encoding: 'base64'): string } };
};

const read = (file: string): string => fs.readFileSync(`${nodeProcess.cwd()}/${file}`, 'utf8');
const createHash = crypto.createHash;

describe('global CSS contract', () => {
  const tailwind = read('src/tailwind.css');
  const animations = read('src/styles/animations.scss');

  it('matches dark mode on the exact .app-dark class, not a substring', () => {
    expect(tailwind).not.toContain('class*="app-dark"');
    expect(tailwind).toMatch(/@variant dark \(&:where\(\.app-dark, \.app-dark \*\)\)/);
    expect(tailwind).toMatch(/:root\.app-dark\s*\{/);
  });

  it('declares color-scheme per mode', () => {
    expect(tailwind).toMatch(/:root\s*\{\s*color-scheme:\s*light;\s*\}/);
    expect(tailwind).toMatch(/:root\.app-dark\s*\{\s*color-scheme:\s*dark;\s*\}/);
  });

  it('gives status colours a literal fallback', () => {
    expect(tailwind).toMatch(/--calmi-success:\s*var\(--p-success-700,\s*#[0-9a-f]{3,8}\)/i);
    expect(tailwind).toMatch(/--calmi-danger:\s*var\(--p-danger-700,\s*#[0-9a-f]{3,8}\)/i);
    expect(tailwind).toMatch(/--calmi-warning:\s*var\(--p-gold-700,\s*#[0-9a-f]{3,8}\)/i);
  });

  it('keeps dialog stagger items visible in both reduced-motion blocks', () => {
    const mediaStart = tailwind.indexOf('@media (prefers-reduced-motion: reduce)');
    const mediaBlock = tailwind.slice(mediaStart, tailwind.indexOf(':root.reduce-motion *,'));
    expect(mediaBlock).toMatch(/\.dialog-stagger-item\s*\{\s*opacity:\s*1\s*!important/);

    const classBlock = tailwind.slice(tailwind.indexOf(':root.reduce-motion *,'));
    expect(classBlock).toMatch(/:root\.reduce-motion \.dialog-stagger-item\s*\{\s*opacity:\s*1\s*!important/);
  });

  it('styles the real PrimeNG dialog mask without ::ng-deep in global scss', () => {
    expect(animations).not.toContain('::ng-deep');
    expect(animations).toMatch(/^\.p-dialog-mask\s*\{/m);
  });
});

describe('index.html', () => {
  const html = read('src/index.html');
  const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1] ?? '';

  it('declares description, color-scheme, theme-color variants and the manifest', () => {
    expect(html).toContain('<meta name="description"');
    expect(html).toContain('<meta name="color-scheme" content="light dark">');
    expect(html).toMatch(/name="theme-color"[^>]*prefers-color-scheme: light/);
    expect(html).toMatch(/name="theme-color"[^>]*prefers-color-scheme: dark/);
    expect(html).toContain('rel="manifest"');
  });

  const run = (stored: string | null, hour: number | 'throws'): boolean => {
    const classes = new Set<string>();
    const fakeDocument = { documentElement: { classList: { add: (c: string) => classes.add(c) } } };
    const fakeStorage = {
      getItem: () => { if (hour === 'throws') throw new Error('blocked'); return stored; },
    };
    class FakeDate { getHours() { return hour === 'throws' ? 12 : hour; } }
    new Function('document', 'localStorage', 'Date', script)(fakeDocument, fakeStorage, FakeDate);
    return classes.has('app-dark');
  };

  it('pre-paint script applies app-dark using the same rules as ThemeService', () => {
    expect(script).toContain("'calmi-theme'");
    expect(run('dark', 12)).toBe(true);
    expect(run('light', 23)).toBe(false);
    expect(run(null, 19)).toBe(false);
    expect(run(null, 20)).toBe(true);
    expect(run(null, 5)).toBe(true);
    expect(run(null, 6)).toBe(false);
    expect(run('garbage', 21)).toBe(true);
  });

  it('pre-paint script never throws when storage is blocked', () => {
    expect(() => run(null, 'throws')).not.toThrow();
  });
});

describe('vercel.json and public files', () => {
  const config = JSON.parse(read('vercel.json')) as {
    rewrites: { source: string; destination: string }[];
    headers: { source: string; headers: { key: string; value: string }[] }[];
  };
  const headers = Object.fromEntries(config.headers[0].headers.map((h) => [h.key, h.value]));

  it('sets security headers on every route', () => {
    expect(config.headers[0].source).toBe('/(.*)');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Permissions-Policy']).toBe('microphone=(self), camera=(), geolocation=()');
    expect(headers['Strict-Transport-Security']).toBe('max-age=63072000; includeSubDomains');
  });

  it('ships the CSP report-only (not enforced) and allow-lists the inline theme script by hash', () => {
    expect(headers['Content-Security-Policy']).toBeUndefined();
    const csp = headers['Content-Security-Policy-Report-Only'];
    expect(csp).toContain("frame-ancestors 'none'");
    const script = /<script>([\s\S]*?)<\/script>/.exec(read('src/index.html'))![1];
    const hash = createHash('sha256').update(script).digest('base64');
    expect(csp).toContain(`'sha256-${hash}'`);
  });

  it('keeps the calmi-api rewrite and a SPA fallback that does not swallow missing assets', () => {
    expect(config.rewrites[0].source).toBe('/calmi-api/(.*)');
    const fallback = config.rewrites[1];
    expect(fallback.destination).toBe('/index.html');
    const matcher = new RegExp(`^${fallback.source}$`);
    expect(matcher.test('/experts/some-id')).toBe(true);
    expect(matcher.test('/')).toBe(true);
    expect(matcher.test('/assets/missing.png')).toBe(false);
    expect(matcher.test('/favicon.ico')).toBe(false);
    // Dotted deep links must still reach the SPA; hashed bundles must not.
    expect(matcher.test('/experts/dr.smith')).toBe(true);
    expect(matcher.test('/main-ABC123.js')).toBe(false);
    expect(matcher.test('/robots.txt')).toBe(false);
    expect(matcher.test('/X.PNG')).toBe(false);
    expect(matcher.test('/Photo.JpG')).toBe(false);
    expect(matcher.test('/sounds/a.mp3')).toBe(false);
    expect(matcher.test('/experts/abc')).toBe(true);
    expect(matcher.test('/manifest.webmanifest')).toBe(false);
  });

  it('provides a manifest and robots.txt', () => {
    const manifest = JSON.parse(read('public/manifest.webmanifest')) as { name: string; icons: { src: string; type: string }[] };
    expect(manifest.name).toBe('Calmi');
    expect(manifest.icons.some((i) => i.type === 'image/png')).toBe(true);
    expect(read('public/robots.txt')).toMatch(/User-agent: \*\s+Allow: \//);
  });
});
