import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '@/core/services/auth.service';
import { SocialAuthButtonsComponent } from './social-auth-buttons.component';

describe('SocialAuthButtonsComponent', () => {
  let fixture: ComponentFixture<SocialAuthButtonsComponent>;
  const loginWithGoogle = vi.fn().mockResolvedValue(undefined);
  const loginWithApple = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    loginWithGoogle.mockClear();
    loginWithApple.mockClear();
    await TestBed.configureTestingModule({
      imports: [SocialAuthButtonsComponent],
      providers: [{ provide: AuthService, useValue: { loginWithGoogle, loginWithApple } }],
    }).compileComponents();
    fixture = TestBed.createComponent(SocialAuthButtonsComponent);
    fixture.detectChanges();
  });

  it('renders divider, neutral social buttons, and vendor icons', () => {
    expect(fixture.nativeElement.textContent).toContain('OR');
    expect(fixture.nativeElement.textContent).toContain('Login with Google');
    expect(fixture.nativeElement.textContent).toContain('Login with Apple');
    expect(fixture.nativeElement.querySelector('img[src="/assets/logos/google.svg"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('img[src="/assets/logos/apple.svg"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('button')).toHaveLength(2);
  });

  it('calls selected provider and disables both buttons while pending', async () => {
    let resolveGoogle!: () => void;
    loginWithGoogle.mockReturnValueOnce(new Promise<void>((resolve) => { resolveGoogle = resolve; }));
    const googleButton = fixture.nativeElement.querySelector('img[src="/assets/logos/google.svg"]').closest('button') as HTMLButtonElement;
    const appleButton = fixture.nativeElement.querySelector('img[src="/assets/logos/apple.svg"]').closest('button') as HTMLButtonElement;

    googleButton.click();
    fixture.detectChanges();
    expect(googleButton.disabled).toBe(true);
    expect(appleButton.disabled).toBe(true);
    expect(loginWithGoogle).toHaveBeenCalledTimes(1);
    expect(loginWithApple).not.toHaveBeenCalled();

    resolveGoogle();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(googleButton.disabled).toBe(false);
    expect(appleButton.disabled).toBe(false);
  });

  it('emits generic failure copy without provider details', async () => {
    loginWithGoogle.mockRejectedValueOnce(new Error('provider secret'));
    const failed = vi.fn();
    fixture.componentInstance.failed.subscribe(failed);
    const googleButton = fixture.nativeElement.querySelector('img[src="/assets/logos/google.svg"]').closest('button') as HTMLButtonElement;

    googleButton.click();
    await fixture.whenStable();

    expect(failed).toHaveBeenCalledWith('Social sign-in is unavailable right now. Please try again later.');
    expect(failed.mock.calls.flat().join(' ')).not.toContain('provider secret');
  });

  it('supports hiding divider and external disabling', () => {
    fixture.componentRef.setInput('showDivider', false);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('OR');
    const host = fixture.nativeElement as HTMLElement;
    expect(Array.from(host.querySelectorAll<HTMLButtonElement>('button')).every((button) => button.disabled)).toBe(true);
  });
});
