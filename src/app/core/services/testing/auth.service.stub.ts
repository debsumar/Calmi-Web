import { Provider, signal } from '@angular/core';
import { vi } from 'vitest';
import { AuthRole, AuthService } from '../auth.service';
import type { User } from '@supabase/supabase-js';

export function createAuthServiceStub(): Partial<AuthService> {
  return {
    currentUser: signal<User | null>(null),
    isAuthenticated: signal(false),
    accessToken: signal<string | null>(null),
    selectedRole: signal<AuthRole | null>(null),
    restoreSession: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    login: vi.fn().mockResolvedValue(undefined),
    signup: vi.fn().mockResolvedValue(undefined),
    loginWithGoogle: vi.fn().mockResolvedValue(undefined),
    loginWithApple: vi.fn().mockResolvedValue(undefined),
    requestPasswordReset: vi.fn().mockResolvedValue(undefined),
    updatePassword: vi.fn().mockResolvedValue(undefined),
  } as Partial<AuthService>;
}

export function provideAuthServiceStub(): Provider {
  return { provide: AuthService, useValue: createAuthServiceStub() };
}
