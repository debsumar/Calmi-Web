import { Injectable } from '@angular/core';

const SESSION_STORAGE_KEY = 'calmi-chat-session-id';
const SESSION_ID_PATTERN = /^web-[a-z0-9]{8}$/;
const SESSION_ID_LENGTH = 8;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

@Injectable({ providedIn: 'root' })
export class ChatSessionIdService {
  private ephemeralId: string | undefined;

  get sessionId(): string {
    if (this.ephemeralId) return this.ephemeralId;

    const storage = this.getSessionStorage();
    let storedId: string | null = null;
    try {
      storedId = storage?.getItem(SESSION_STORAGE_KEY) ?? null;
    } catch {
      // Session storage methods can be unavailable even when the object exists.
    }
    if (storedId && SESSION_ID_PATTERN.test(storedId)) {
      this.ephemeralId = storedId;
      return storedId;
    }

    const generatedId = this.generateSessionId();
    this.ephemeralId = generatedId;
    try {
      storage?.setItem(SESSION_STORAGE_KEY, generatedId);
    } catch {
      // Session storage can be unavailable in private browsing or restricted frames.
    }
    return generatedId;
  }

  private getSessionStorage(): Storage | null {
    try {
      if (typeof sessionStorage === 'undefined') return null;
      return sessionStorage;
    } catch {
      return null;
    }
  }

  /**
   * Generates a session id from a cryptographically secure source only.
   *
   * `crypto.getRandomValues` is available on insecure origins too (unlike
   * `crypto.subtle` / `randomUUID`), so this has no realistic fallback path.
   * A predictable id would let one browser read another user's server-side
   * conversation history, so we fail loudly instead of degrading to a
   * non-cryptographic pseudo-random source.
   */
  private generateSessionId(): string {
    const cryptoApi: Crypto | undefined = globalThis.crypto;
    if (!cryptoApi || typeof cryptoApi.getRandomValues !== 'function') {
      throw new Error('ChatSessionIdService: no cryptographically secure random source available.');
    }

    // Rejection sampling keeps the distribution uniform across the alphabet.
    const limit = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
    let result = '';
    while (result.length < SESSION_ID_LENGTH) {
      const bytes = new Uint8Array(SESSION_ID_LENGTH * 2);
      cryptoApi.getRandomValues(bytes);
      for (const byte of bytes) {
        if (byte >= limit) continue;
        result += ALPHABET[byte % ALPHABET.length] ?? '0';
        if (result.length === SESSION_ID_LENGTH) break;
      }
    }
    return `web-${result}`;
  }
}
