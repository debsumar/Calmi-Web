import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '@/core/services/auth.service';
import { LucideX, provideLucideIcons } from '@lucide/angular';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  const loginWithGoogle = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    loginWithGoogle.mockClear();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        provideLucideIcons(LucideX),
        { provide: AuthService, useValue: { loginWithGoogle } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  it('renders copy, meditation image, right image panel, and Google sign-in', () => {
    expect(fixture.nativeElement.textContent).toContain('Welcome Back!');
    expect(fixture.nativeElement.textContent).toContain('Ready to continue your healing journey?');
    expect(fixture.nativeElement.textContent).toContain('Continue with Google');
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe('/assets/meditation.svg');
    expect(fixture.nativeElement.querySelector('section > div').className).toContain('md:order-2');
  });

  it('does not render password auth inputs or removed auth links', () => {
    expect(fixture.nativeElement.querySelector('input[type="email"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[type="password"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/auth/forgot"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/auth/signup"]')).toBeNull();
  });

  it('shows generic provider failure without provider details', async () => {
    loginWithGoogle.mockRejectedValueOnce(new Error('provider secret'));
    const googleButton = fixture.nativeElement.querySelector('img[src="/assets/logos/google.svg"]').closest('button') as HTMLButtonElement;

    googleButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.textContent).toContain('Social sign-in is unavailable right now. Please try again later.');
    expect(alert.textContent).not.toContain('provider secret');
  });
});
