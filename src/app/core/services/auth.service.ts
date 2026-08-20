import { Injectable, effect, signal } from '@angular/core';
import { createClient, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { safeReturnUrl } from '../routing/safe-return-url';

export type AuthRole = 'specialist' | 'user';

export interface SignupOptions {
  fullName?: string;
  role?: AuthRole;
}

type SafeStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const ROLE_STORAGE_KEY = 'calmi-auth-role';

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
  readonly selectedRole = signal<AuthRole | null>(this.readRole());

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

    this.supabase.auth.onAuthStateChange((_event, session) => this.applySession(session));

    effect(() => {
      const role = this.selectedRole();
      if (role) this.storage.setItem(ROLE_STORAGE_KEY, role);
      else this.storage.removeItem(ROLE_STORAGE_KEY);
    });
  }

  /**
   * One shared restore operation prevents concurrent guards racing Supabase.
   * getSession() awaits Supabase auth initialization, including OAuth URL-fragment processing,
   * before this promise applies the resulting session to guard-visible signals.
   */
  restoreSession(): Promise<void> {
    if (!this.restorePromise) {
      this.restorePromise = this.supabase.auth.getSession()
        .then(({ data }) => this.applySession(data.session))
        .catch(() => {
          // Fail closed. Provider errors must never leave a stale authenticated state.
          this.applySession(null);
        });
    }
    return this.restorePromise;
  }

  async login(email: string, password: string): Promise<User> {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) throw error ?? new Error('Unable to sign in.');
    this.applySession(data.session);
    return data.user;
  }

  async signup(fullName: string, email: string, password: string, role?: AuthRole): Promise<User>;
  async signup(email: string, password: string, options?: SignupOptions): Promise<User>;
  async signup(
    first: string,
    second: string,
    third: string | SignupOptions = {},
    fourth?: AuthRole,
  ): Promise<User> {
    const fullName = typeof third === 'string' ? first : third.fullName ?? '';
    const email = typeof third === 'string' ? second : first;
    const password = typeof third === 'string' ? third : second;
    const role = fourth ?? (typeof third === 'string' ? undefined : third.role);
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, ...(role ? { role } : {}) } },
    });
    if (error || !data.user) throw error ?? new Error('Unable to create account.');
    this.applySession(data.session);
    if (role) this.selectedRole.set(role);
    return data.user;
  }

  /** Always resolves with a generic outcome to prevent account enumeration. */
  async requestPasswordReset(email: string): Promise<void> {
    const redirectTo = this.browserOrigin() + '/auth/reset';
    try {
      await this.supabase.auth.resetPasswordForEmail(email, { redirectTo });
    } catch {
      // Deliberately indistinguishable from an unknown account/provider response.
    }
  }

  private async signInWithProvider(provider: 'google' | 'apple'): Promise<void> {
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
        provider,
        options: { redirectTo },
      });
      if (error) throw new Error('Social sign-in is unavailable right now.');
    } catch {
      throw new Error('Social sign-in is unavailable right now.');
    }
  }

  async loginWithGoogle(): Promise<void> {
    return this.signInWithProvider('google');
  }

  async loginWithApple(): Promise<void> {
    return this.signInWithProvider('apple');
  }

  async updatePassword(password: string): Promise<void> {
    const { error } = await this.supabase.auth.updateUser({ password });
    if (error) throw error;
  }

  async logout(): Promise<void> {
    try {
      await this.supabase.auth.signOut();
    } finally {
      this.applySession(null);
      this.selectedRole.set(null);
    }
  }


  private applySession(session: Session | null): void {
    this.currentUser.set(session?.user ?? null);
    this.accessToken.set(session?.access_token ?? null);
    this.isAuthenticated.set(session?.user != null);
  }

  private readRole(): AuthRole | null {
    const role = this.storage.getItem(ROLE_STORAGE_KEY);
    return role === 'specialist' || role === 'user' ? role : null;
  }

  private browserOrigin(): string {
    return typeof window === 'undefined' ? '' : window.location.origin;
  }
}
