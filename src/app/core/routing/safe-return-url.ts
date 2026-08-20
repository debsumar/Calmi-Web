const APP_ORIGIN = 'https://calmi.invalid';
const MAX_RETURN_URL_LENGTH = 2048;

/**
 * Returns a canonical same-origin app path, or null for any unsafe/malformed value.
 * Query strings and fragments are retained; external/protocol-relative URLs are not.
 */
export function safeReturnUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_RETURN_URL_LENGTH) return null;
  if (/\s|[\u0000-\u001f\u007f]/.test(value) || value.includes('\\')) return null;
  if (/%(?![\da-fA-F]{2})/.test(value) || !value.startsWith('/') || value.startsWith('//')) return null;

  let parsed: URL;
  try {
    parsed = new URL(value, APP_ORIGIN);
  } catch {
    return null;
  }

  if (parsed.origin !== APP_ORIGIN || parsed.username || parsed.password || parsed.host !== 'calmi.invalid') return null;
  if (parsed.protocol !== 'https:') return null;

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(parsed.pathname);
  } catch {
    return null;
  }

  // Reject encoded slash/backslash, traversal, and protocol-relative bypasses in the path.
  if (decodedPath.includes('\\') || decodedPath.startsWith('//') || decodedPath.includes('//')) return null;
  if (decodedPath.split('/').some((segment) => segment === '..')) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(decodedPath)) return null;

  const normalizedPath = parsed.pathname;
  if (!normalizedPath.startsWith('/') || normalizedPath.startsWith('//')) return null;
  return normalizedPath + parsed.search + parsed.hash;
}

export function safeReturnUrlOrHome(value: unknown): string {
  return safeReturnUrl(value) ?? '/home';
}
