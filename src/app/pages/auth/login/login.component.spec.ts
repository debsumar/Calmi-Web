import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '@/core/services/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  const login = vi.fn().mockResolvedValue({});
  const loginWithGoogle = vi.fn().mockResolvedValue(undefined);
  const loginWithApple = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    login.mockClear();
    loginWithGoogle.mockClear();
    loginWithApple.mockClear();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { login, loginWithGoogle, loginWithApple, selectedRole: () => null } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => '/home' } } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  it('renders copy, meditation image, and right image panel', () => {
    expect(fixture.nativeElement.textContent).toContain('Welcome Back!');
    expect(fixture.nativeElement.textContent).toContain('Ready to continue your healing journey?');
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe('/assets/meditation.svg');
    expect(fixture.nativeElement.querySelector('section > div').className).toContain('md:order-2');
  });

  it('keeps Proceed disabled until valid and calls AuthService.login', async () => {
    const submit = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fixture.componentInstance.loginForm.setValue({ email: 'person@example.com', password: 'correct horse' });
    fixture.detectChanges();
    expect(submit.disabled).toBe(false);
    submit.click();
    await fixture.whenStable();
    expect(login).toHaveBeenCalledWith('person@example.com', 'correct horse');
  });

  it('shows generic error and never provider error details', async () => {
    login.mockRejectedValueOnce(new Error('provider secret'));
    fixture.componentInstance.loginForm.setValue({ email: 'person@example.com', password: 'correct horse' });
    await fixture.componentInstance.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('We couldn’t sign you in. Check your email and password and try again.');
    expect(fixture.nativeElement.textContent).not.toContain('provider secret');
  });
});
