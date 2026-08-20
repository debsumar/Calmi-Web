import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../services/auth.service';
import { authGuard, guestGuard } from './auth.guard';

function runGuard(guard: typeof authGuard, auth: Partial<AuthService>, router: Partial<Router>, stateUrl: string) {
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: auth },
      { provide: Router, useValue: router },
    ],
  });
  return TestBed.runInInjectionContext(() => guard({} as any, { url: stateUrl } as any));
}

describe('auth guards', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it.each(['/home', '/therapy', '/therapy/123', '/sleep', '/about', '/pricing', '/sounds'])
    ('redirects unauthenticated users from %s to identify with a safe return URL', async (url) => {
      const auth = { restoreSession: vi.fn().mockResolvedValue(undefined), isAuthenticated: () => false } as any;
      const createUrlTree = vi.fn((commands, extras) => ({ commands, extras }));
      const result = await runGuard(authGuard, auth, { createUrlTree } as any, `${url}?tab=calm#top`);

      expect(createUrlTree).toHaveBeenCalledWith(['/auth/identify'], {
        queryParams: { returnUrl: `${url}?tab=calm#top` },
      });
      expect(result).toEqual(expect.objectContaining({ commands: ['/auth/identify'] }));
    });

  it('rejects protocol-relative return URL data instead of propagating it', async () => {
    const auth = { restoreSession: vi.fn().mockResolvedValue(undefined), isAuthenticated: () => false } as any;
    const createUrlTree = vi.fn((commands, extras) => ({ commands, extras }));
    await runGuard(authGuard, auth, { createUrlTree } as any, '//evil.example/path');

    expect(createUrlTree).toHaveBeenCalledWith(['/auth/identify'], {
      queryParams: { returnUrl: '/home' },
    });
  });

  it('waits for one shared restoration promise before deciding access', async () => {
    let resolveRestore!: () => void;
    const sharedRestore = new Promise<void>((resolve) => { resolveRestore = resolve; });
    const restoreSession = vi.fn(() => sharedRestore);
    const auth = { restoreSession, isAuthenticated: () => true } as any;
    const router = { createUrlTree: vi.fn() } as any;

    const first = runGuard(authGuard, auth, router, '/home');
    const second = runGuard(authGuard, auth, router, '/sleep');
    expect(restoreSession).toHaveBeenCalledTimes(2);
    resolveRestore();
    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
  });

  it('redirects authenticated users away from guest auth routes', async () => {
    const auth = { restoreSession: vi.fn().mockResolvedValue(undefined), isAuthenticated: () => true } as any;
    const createUrlTree = vi.fn((commands) => ({ commands }));
    const result = await runGuard(guestGuard, auth, { createUrlTree } as any, '/auth/login');

    expect(result).toEqual({ commands: ['/home'] });
  });

  it('allows unauthenticated users into guest auth routes', async () => {
    const auth = { restoreSession: vi.fn().mockResolvedValue(undefined), isAuthenticated: () => false } as any;
    const result = await runGuard(guestGuard, auth, {} as any, '/auth/identify');
    expect(result).toBe(true);
  });
});
