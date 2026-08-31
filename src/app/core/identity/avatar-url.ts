/**
 * Resolves the signed-in identity's avatar to a safe https URL, or null when absent/unsafe.
 * Google and Apple expose the photo under `avatar_url` or `picture`; anything that is not
 * an absolute https URL (data:, javascript:, http:) is rejected so it never reaches an img src.
 */
export function resolveHttpsAvatarUrl(metadata: Record<string, unknown> | undefined | null): string | null {
  const raw = metadata?.['avatar_url'] ?? metadata?.['picture'];
  if (typeof raw !== 'string' || !raw.trim()) return null;

  try {
    const parsed = new URL(raw.trim());
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}
