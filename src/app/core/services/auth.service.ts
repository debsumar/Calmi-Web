import { Injectable, effect, signal } from '@angular/core';
import { createClient, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { safeReturnUrl } from '../routing/safe-return-url';

export type AuthRole = 'specialist' | 'user';

type SafeStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const ROLE_STORAGE_KEY = 'calmi-auth-role';

/** Persisted role, bound to the user id once known. `uid: null` = chosen before sign-in. */
interface StoredRole {
  uid: string | null;
  role: AuthRole;
}

function isAuthRole(value: unknown): value is AuthRole {
  return value === 'specialist' || value === 'user';
}

function createSafeStorage(): SafeStorage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {
    // Storage can be unavailable in SSR, privacy mode, or a sandboxed iframe.
  }

  const memory = new Map<string, string>();
  return {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => void memory.set(key, value),
    removeItem: (key) => void memory.delete(key),
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storage = createSafeStorage();
  private readonly supabase: SupabaseClient;
  private restorePromise: Promise<void> | null = null;

  readonly currentUser = signal<User | null>(null);
  readonly accessToken = signal<string | null>(null);
  readonly isAuthenticated = signal(false);
  private readonly initialStoredRole = this.readStoredRole();
  readonly selectedRole = signal<AuthRole | null>(
    this.initialStoredRole && this.initialStoredRole.uid === null ? this.initialStoredRole.role : null,
  );
  /**
   * A role stored for a specific user must not be rewritten/cleared before the session shows
   * who is signed in; otherwise a reload would wipe it before it can be re-adopted.
   */
  private readonly roleSyncReady = signal(!this.initialStoredRole || this.initialStoredRole.uid === null);

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: {
        // Browser tokens live in localStorage for PKCE verifier recovery and refresh survival.
        // They are reachable by XSS; server-managed HttpOnly cookie sessions are the hardening path.
        persistSession: true,
        storage: this.storage,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    this.supabase.auth.onAuthStateChange((event, session) => {
      this.applySession(session);
      if (event === 'SIGNED_OUT') this.clearRole();
    });

    effect(() => {
      if (!this.roleSyncReady()) return;
      const role = this.selectedRole();
      const uid = this.currentUser()?.id ?? null;
      if (role) this.writeStoredRole({ uid, role });
      else this.removeStoredRole();
    });
  }

  /**
   * One shared restore operation prevents concurrent guards racing Supabase.
   * getSession() awaits Supabase auth initialization, including OAuth URL-fragment processing,
   * before this promise applies the resulting session to guard-visible signals.
   * Failed restores clear the shared promise so later callers can retry transient provider errors.
   */
  restoreSession(): Promise<void> {
    if (!this.restorePromise) {
      this.restorePromise = this.supabase.auth.getSession()
        .then(({ data }) => this.applySession(data.session))
        .catch(() => {
          // Fail closed. Provider errors must never leave a stale authenticated state.
          this.applySession(null);
          this.restorePromise = null;
        });
    }
    return this.restorePromise;
  }

  private async signInWithProvider(): Promise<void> {
    if (typeof window === 'undefined') throw new Error('Social sign-in is unavailable right now.');

    let redirectTo = window.location.origin;
    const returnUrl = safeReturnUrl(new URLSearchParams(window.location.search).get('returnUrl'));
    if (returnUrl) {
      const redirectTarget = new URL(redirectTo);
      redirectTarget.searchParams.set('returnUrl', returnUrl);
      redirectTo = redirectTarget.toString();
    }

    try {
      const { error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (error) throw new Error('Social sign-in is unavailable right now.');
    } catch {
      throw new Error('Social sign-in is unavailable right now.');
    }
  }

  async loginWithGoogle(): Promise<void> {
    return this.signInWithProvider();
  }

  async logout(): Promise<void> {
    try {
      await this.supabase.auth.signOut();
    } finally {
      this.applySession(null);
      this.clearRole();
    }
  }

  private clearRole(): void {
    this.selectedRole.set(null);
    this.removeStoredRole();
  }

  private applySession(session: Session | null): void {
    this.currentUser.set(session?.user ?? null);
    this.accessToken.set(session?.access_token ?? null);
    this.isAuthenticated.set(session?.user != null);

    const uid = session?.user?.id ?? null;
    if (uid) {
      const stored = this.readStoredRole();
      if (stored?.uid === uid) this.selectedRole.set(stored.role);
      else if (stored && stored.uid !== null) this.selectedRole.set(null); // another user's role: ignore
    }
    this.roleSyncReady.set(true);
  }

  private readStoredRole(): StoredRole | null {
    let raw: string | null;
    try {
      raw = this.storage.getItem(ROLE_STORAGE_KEY);
    } catch {
      return null;
    }
    if (!raw) return null;
    // Legacy format: bare role string, not yet bound to a user.
    if (isAuthRole(raw)) return { uid: null, role: raw };
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const { uid, role } = parsed as { uid?: unknown; role?: unknown };
        if (isAuthRole(role) && (uid === null || typeof uid === 'string')) return { uid, role };
      }
    } catch {
      // Corrupt value: treat as absent.
    }
    return null;
  }

  private writeStoredRole(value: StoredRole): void {
    try {
      this.storage.setItem(ROLE_STORAGE_KEY, JSON.stringify(value));
    } catch {
      // Quota exceeded / storage blocked: role simply is not persisted.
    }
  }

  private removeStoredRole(): void {
    try {
      this.storage.removeItem(ROLE_STORAGE_KEY);
    } catch {
      // Storage unavailable.
    }
  }
}
