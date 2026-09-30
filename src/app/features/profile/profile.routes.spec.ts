// @vitest-environment jsdom
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  LucideArrowRight,
  LucideCircleAlert,
  LucideCircleCheck,
  LucideLock,
  LucideMinus,
  LucideMoon,
  LucideNotebookPen,
  LucideShieldCheck,
  LucideSparkles,
  LucideTrendingDown,
  LucideTrendingUp,
  LucideTriangleAlert,
  provideLucideIcons,
} from '@lucide/angular';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthRole, AuthService } from '@/core/services/auth.service';
import { ProfileDashboardService } from './services/profile-dashboard.service';
import { ProfileComponent } from './pages/profile/profile.component';
import { SpecialistProfileComponent } from './pages/specialist-profile/specialist-profile.component';
import { profileRoutes } from './profile.routes';

const authStub = {
  currentUser: signal(null),
  isAuthenticated: signal(true),
  selectedRole: signal<AuthRole | null>(null),
  restoreSession: vi.fn().mockResolvedValue(undefined),
};

const icons = () =>
  provideLucideIcons(
    LucideArrowRight,
    LucideCircleAlert,
    LucideTriangleAlert,
    LucideCircleCheck,
    LucideLock,
    LucideMinus,
    LucideMoon,
    LucideNotebookPen,
    LucideShieldCheck,
    LucideSparkles,
    LucideTrendingDown,
    LucideTrendingUp,
  );

describe('profileRoutes', () => {
  beforeEach(() => {
    authStub.isAuthenticated.set(true);
    authStub.selectedRole.set(null);
    authStub.restoreSession.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(profileRoutes),
        ProfileDashboardService,
        icons(),
        { provide: AuthService, useValue: authStub },
      ],
    });
  });

  it('renders SpecialistProfileComponent for specialists', async () => {
    authStub.selectedRole.set('specialist');
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/', SpecialistProfileComponent);

    expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).toBe('Specialist Profile');
  });

  it.each<AuthRole | null>(['user', null])('renders ProfileComponent for role %s', async (role) => {
    authStub.selectedRole.set(role);
    const harness = await RouterTestingHarness.create();

    const component = await harness.navigateByUrl('/', ProfileComponent);

    expect(component).toBeInstanceOf(ProfileComponent);
    expect(harness.routeNativeElement?.matches('app-profile')).toBe(true);
    expect(harness.fixture.nativeElement.querySelector('app-specialist-profile')).toBeNull();
  });
});
