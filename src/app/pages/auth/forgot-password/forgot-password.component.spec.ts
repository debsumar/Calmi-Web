import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '@/core/services/auth.service';
import { ForgotPasswordComponent } from './forgot-password.component';

describe('ForgotPasswordComponent', () => {
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  const requestPasswordReset = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    requestPasswordReset.mockClear();
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [{ provide: AuthService, useValue: { requestPasswordReset } }],
    }).compileComponents();
    fixture = TestBed.createComponent(ForgotPasswordComponent);
    fixture.detectChanges();
  });

  it('renders copy, failed-login image, and left image panel', () => {
    expect(fixture.nativeElement.textContent).toContain('Trouble Logging In?');
    expect(fixture.nativeElement.textContent).toContain('Just enter your details and we’ll guide you back in.');
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe('/assets/failed_login.svg');
    expect(fixture.nativeElement.querySelector('section > div').className).toContain('md:order-1');
  });

  it('gates reset submit until valid and always shows generic confirmation', async () => {
    const submit = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fixture.componentInstance.forgotForm.controls.email.setValue('person@example.com');
    fixture.detectChanges();
    expect(submit.disabled).toBe(false);
    submit.click();
    await fixture.whenStable();
    expect(requestPasswordReset).toHaveBeenCalledWith('person@example.com');
    expect(fixture.nativeElement.textContent).toContain('If that email is registered, a reset link is on its way.');
  });
});
