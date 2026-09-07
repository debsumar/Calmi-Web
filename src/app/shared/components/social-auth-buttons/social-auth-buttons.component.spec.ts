import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '@/core/services/auth.service';
import { SocialAuthButtonsComponent } from './social-auth-buttons.component';

describe('SocialAuthButtonsComponent', () => {
  let fixture: ComponentFixture<SocialAuthButtonsComponent>;
  const loginWithGoogle = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    loginWithGoogle.mockClear();
    await TestBed.configureTestingModule({
      imports: [SocialAuthButtonsComponent],
      providers: [{ provide: AuthService, useValue: { loginWithGoogle } }],
    }).compileComponents();
    fixture = TestBed.createComponent(SocialAuthButtonsComponent);
    fixture.detectChanges();
  });

  it('renders divider, one full-width Google button, and vendor icon', () => {
    expect(fixture.nativeElement.textContent).toContain('OR');
    expect(fixture.nativeElement.textContent).toContain('Continue with Google');
    expect(fixture.nativeElement.textContent).not.toContain('Apple');
    expect(fixture.nativeElement.querySelector('img[src="/assets/logos/google.svg"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('img[src="/assets/logos/apple.svg"]')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('button')).toHaveLength(1);
  });

  it('calls Google and disables button while pending', async () => {
    let resolveGoogle!: () => void;
    loginWithGoogle.mockReturnValueOnce(new Promise<void>((resolve) => { resolveGoogle = resolve; }));
    const googleButton = fixture.nativeElement.querySelector('img[src="/assets/logos/google.svg"]').closest('button') as HTMLButtonElement;

    googleButton.click();
    fixture.detectChanges();
    expect(googleButton.disabled).toBe(true);
    expect(loginWithGoogle).toHaveBeenCalledTimes(1);

    resolveGoogle();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(googleButton.disabled).toBe(false);
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
    const googleButton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(googleButton.disabled).toBe(true);
  });
});
