/** Absolute https URL or null; data:, javascript:, http: and blanks never reach an img src. */
function httpsUrlOrNull(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const parsed = new URL(raw.trim());
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Resolves an avatar from provider metadata to a safe https URL, or null when absent/unsafe.
 * Google and Apple expose the photo under `avatar_url` or `picture`. The first claim that is
 * a valid https URL wins, so an empty or unsafe `avatar_url` no longer hides a good `picture`.
 */
export function resolveHttpsAvatarUrl(metadata: Record<string, unknown> | undefined | null): string | null {
  return httpsUrlOrNull(metadata?.['avatar_url']) ?? httpsUrlOrNull(metadata?.['picture']);
}

/** Minimal user shape the avatar chain needs (matches the Supabase `User`). */
export interface AvatarSourceUser {
  readonly user_metadata?: Record<string, unknown> | null;
  readonly identities?: ReadonlyArray<{ readonly identity_data?: Record<string, unknown> | null }> | null;
}

/**
 * First valid https avatar across `user_metadata`, then each linked identity's
 * `identity_data` (`avatar_url`, then `picture`).
 */
export function resolveUserAvatarUrl(user: AvatarSourceUser | null | undefined): string | null {
  if (!user) return null;
  const direct = resolveHttpsAvatarUrl(user.user_metadata);
  if (direct) return direct;
  for (const identity of user.identities ?? []) {
    const url = resolveHttpsAvatarUrl(identity.identity_data);
    if (url) return url;
  }
  return null;
}
