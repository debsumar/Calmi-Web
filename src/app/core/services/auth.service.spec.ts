import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  signInWithOAuth: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}));

import { AuthService } from './auth.service';

const user = { id: 'user-1', email: 'person@example.com', user_metadata: {} } as any;
const session = { user, access_token: 'test-token' } as any;

function setAuthDefaults(): void {
  mocks.getSession.mockResolvedValue({ data: { session: null } });
  mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  mocks.signInWithPassword.mockResolvedValue({ data: { user, session }, error: null });
  mocks.signUp.mockResolvedValue({ data: { user, session }, error: null });
  mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
  mocks.updateUser.mockResolvedValue({ error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.signInWithOAuth.mockResolvedValue({ data: { provider: 'google', url: null }, error: null });
  mocks.createClient.mockReturnValue({ auth: {
    getSession: mocks.getSession,
    onAuthStateChange: mocks.onAuthStateChange,
    signInWithPassword: mocks.signInWithPassword,
    signUp: mocks.signUp,
    resetPasswordForEmail: mocks.resetPasswordForEmail,
    updateUser: mocks.updateUser,
    signOut: mocks.signOut,
    signInWithOAuth: mocks.signInWithOAuth,
  } });
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    setAuthDefaults();
    TestBed.configureTestingModule({ providers: [AuthService] });
    service = TestBed.inject(AuthService);
  });

  it('shares one session restore operation across concurrent callers', async () => {
    let resolveRestore!: (value: any) => void;
    mocks.getSession.mockReturnValue(new Promise((resolve) => { resolveRestore = resolve; }));

    const first = service.restoreSession();
    const second = service.restoreSession();
    expect(first).toBe(second);
    expect(mocks.getSession).toHaveBeenCalledTimes(1);

    resolveRestore({ data: { session } });
    await first;
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()).toBe(user);
    expect(service.accessToken()).toBe('test-token');
  });

  it('fails closed when session restoration fails', async () => {
    mocks.getSession.mockRejectedValue(new Error('provider unavailable'));
    await service.restoreSession();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
  });

  it('passes login credentials to Supabase without logging them', async () => {
    const errorSpy = vi.spyOn(console, 'error');
    await service.login('person@example.com', 'correct horse battery staple');

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'person@example.com',
      password: 'correct horse battery staple',
    });
    expect(service.isAuthenticated()).toBe(true);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('persists the selected role and clears it on logout', async () => {
    service.selectedRole.set('specialist');
    expect(localStorage.getItem('calmi-auth-role')).toBe('specialist');

    await service.logout();
    expect(service.selectedRole()).toBeNull();
    expect(localStorage.getItem('calmi-auth-role')).toBeNull();
  });

  it('uses a browser-safe reset destination and swallows provider errors', async () => {
    mocks.resetPasswordForEmail.mockRejectedValue(new Error('unknown account'));
    await expect(service.requestPasswordReset('person@example.com')).resolves.toBeUndefined();
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith('person@example.com', {
      redirectTo: expect.stringContaining('/auth/reset'),
    });
  });

  it('updates password through the active recovery session', async () => {
    await service.updatePassword('correct horse battery staple');
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'correct horse battery staple' });
  });

  it('configures persistent storage for OAuth PKCE and refresh survival', () => {
    const authConfig = mocks.createClient.mock.calls[0][2].auth;
    expect(authConfig.persistSession).toBe(true);
    expect(authConfig.storage).toBe(localStorage);
    expect(authConfig.autoRefreshToken).toBe(true);
    expect(authConfig.detectSessionInUrl).toBe(true);
  });

  it.each([
    ['google', 'loginWithGoogle'],
    ['apple', 'loginWithApple'],
  ] as const)('starts %s OAuth with a validated same-origin redirect', async (provider, method) => {
    window.history.pushState({}, '', '/auth/login?returnUrl=%2Fhome%3Ftab%3Dcalm');

    await service[method]();

    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider,
      options: { redirectTo: `${window.location.origin}/?returnUrl=%2Fhome%3Ftab%3Dcalm` },
    });
    window.history.pushState({}, '', '/');
  });

  it('does not append an unsafe absolute return URL', async () => {
    window.history.pushState({}, '', '/auth/login?returnUrl=https%3A%2F%2Fevil.example');

    await service.loginWithGoogle();

    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    window.history.pushState({}, '', '/');
  });

  it('throws generic OAuth errors without exposing provider details', async () => {
    mocks.signInWithOAuth.mockResolvedValueOnce({ data: { provider: 'google', url: null }, error: new Error('provider secret') });

    await expect(service.loginWithGoogle()).rejects.toEqual(new Error('Social sign-in is unavailable right now.'));
    expect(mocks.signInWithOAuth).toHaveBeenCalledTimes(1);
  });
});
