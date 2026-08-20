import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthRole, AuthService } from '@/core/services/auth.service';
import { SignupComponent } from './signup.component';

describe('SignupComponent', () => {
  let fixture: ComponentFixture<SignupComponent>;
  const signup = vi.fn().mockResolvedValue({});
  const loginWithGoogle = vi.fn().mockRejectedValue(new Error('provider secret'));
  const loginWithApple = vi.fn().mockRejectedValue(new Error('provider secret'));
  const selectedRole = signal<AuthRole | null>('specialist');
  const isAuthenticated = signal(false);

  beforeEach(async () => {
    signup.mockClear();
    loginWithGoogle.mockClear();
    loginWithApple.mockClear();
    isAuthenticated.set(false);
    await TestBed.configureTestingModule({
      imports: [SignupComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => '/home' } } } },
        { provide: AuthService, useValue: { signup, loginWithGoogle, loginWithApple, selectedRole, isAuthenticated } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SignupComponent);
    fixture.detectChanges();
  });

  it('renders copy, meditation image, right image panel, and legal links', () => {
    expect(fixture.nativeElement.textContent).toContain('Join Calmi Today!');
    expect(fixture.nativeElement.textContent).toContain('Together, let’s build a supportive wellness community.');
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe('/assets/meditation.svg');
    expect(fixture.nativeElement.querySelector('section > div').className).toContain('md:order-2');
    expect(fixture.nativeElement.querySelector('a[href="/terms"], a[routerlink="/terms"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/privacy"], a[routerlink="/privacy"]')).not.toBeNull();
  });

  it('gates Sign Up on fields and consent, then passes selected role', async () => {
    const submit = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fixture.componentInstance.signupForm.setValue({ fullName: 'Calmi Person', email: 'person@example.com', password: 'correct horse', terms: true });
    fixture.detectChanges();
    expect(submit.disabled).toBe(false);
    submit.click();
    await fixture.whenStable();
    expect(signup).toHaveBeenCalledWith('Calmi Person', 'person@example.com', 'correct horse', 'specialist');
  });

  it('navigates authenticated users after successful signup', async () => {
    isAuthenticated.set(true);
    const navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    fixture.componentInstance.signupForm.setValue({ fullName: 'Calmi Person', email: 'person@example.com', password: 'correct horse', terms: true });
    await fixture.componentInstance.submit();
    expect(navigateByUrl).toHaveBeenCalledWith('/home');
  });

  it('shows generic OAuth failure copy without provider details', async () => {
    const googleButton = fixture.nativeElement.querySelector('img[src="/assets/logos/google.svg"]').closest('button') as HTMLButtonElement;
    googleButton.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Social sign-in is unavailable right now. Please try again later.');
    expect(fixture.nativeElement.textContent).not.toContain('provider secret');
    expect(loginWithGoogle).toHaveBeenCalledTimes(1);
  });
});
