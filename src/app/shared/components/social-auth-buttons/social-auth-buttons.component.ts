import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { AuthService } from '@/core/services/auth.service';

const SOCIAL_SIGN_IN_ERROR = 'Social sign-in is unavailable right now. Please try again later.';

type SocialProvider = 'google' | 'apple';

@Component({
  selector: 'app-social-auth-buttons',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showDivider()) {
      <div class="my-7 flex items-center gap-4 text-sm font-medium tracking-wide text-ink-muted" aria-hidden="true"><span class="h-px flex-1 bg-hairline"></span><span>OR</span><span class="h-px flex-1 bg-hairline"></span></div>
    }
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <button type="button" [disabled]="disabled() || pending()" (click)="login('google')" class="flex items-center justify-center gap-3 rounded-xl border border-hairline bg-surface px-4 py-3 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-60">
        <img src="/assets/logos/google.svg" alt="" aria-hidden="true" class="h-5 w-5 shrink-0" />
        Login with Google
      </button>
      <button type="button" [disabled]="disabled() || pending()" (click)="login('apple')" class="flex items-center justify-center gap-3 rounded-xl border border-hairline bg-surface px-4 py-3 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-60">
        <img src="/assets/logos/apple.svg" alt="" aria-hidden="true" class="h-5 w-5 shrink-0" />
        Login with Apple
      </button>
    </div>
  `,
})
export class SocialAuthButtonsComponent {
  private readonly authService = inject(AuthService);

  readonly disabled = input(false);
  readonly showDivider = input(true);
  readonly failed = output<string>();
  readonly pending = signal(false);

  async login(provider: SocialProvider): Promise<void> {
    if (this.disabled() || this.pending()) return;

    this.pending.set(true);
    try {
      if (provider === 'google') await this.authService.loginWithGoogle();
      else await this.authService.loginWithApple();
    } catch {
      this.failed.emit(SOCIAL_SIGN_IN_ERROR);
    } finally {
      this.pending.set(false);
    }
  }
}
