import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '@/core/services/auth.service';
import { AuthSplitCardComponent } from '@/shared/components/auth-split-card/auth-split-card.component';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, AuthSplitCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-split-card
      imageSrc="/assets/failed_login.svg"
      imageAlt="Person sitting calmly with their head in their hand"
      imageSide="left">
      <div class="mx-auto flex w-full max-w-md flex-col">
        <h1 class="text-3xl font-bold leading-tight tracking-tight text-ink md:text-5xl">Trouble Logging In?</h1>
        <p class="mt-3 text-base leading-relaxed text-ink-soft">Just enter your details and we’ll guide you back in.</p>

        @if (confirmationMessage()) {
          <div class="mt-6 rounded-xl border border-brand bg-brand-soft/10 px-4 py-3 text-sm text-brand-deep" role="status" aria-live="polite">{{ confirmationMessage() }}</div>
        }

        <form class="mt-8 space-y-5" [formGroup]="forgotForm" (ngSubmit)="submit()" novalidate>
          <div>
            <label for="forgot-email" class="sr-only">Email</label>
            <input id="forgot-email" type="email" autocomplete="email" placeholder="Email" formControlName="email" aria-label="Email" aria-describedby="forgot-email-error" [attr.aria-invalid]="forgotForm.controls.email.touched && forgotForm.controls.email.invalid" class="w-full rounded-xl border border-hairline bg-elevated px-4 py-3 text-base text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/20" />
            <div id="forgot-email-error" class="mt-1 text-sm text-danger" aria-live="polite">
              @if (forgotForm.controls.email.touched && forgotForm.controls.email.hasError('required')) { Email is required. }
              @else if (forgotForm.controls.email.touched && forgotForm.controls.email.hasError('email')) { Enter a valid email address. }
            </div>
          </div>
          <button type="submit" [disabled]="forgotForm.invalid || pending()" [attr.aria-busy]="pending()" class="flex w-full items-center justify-center gap-3 rounded-full bg-brand-deep px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-muted">
            @if (pending()) { <span class="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span><span>Sending...</span> } @else { <span>Send Reset Link</span> }
          </button>
        </form>

        <p class="mt-8 text-center text-sm text-ink-soft"><a routerLink="/auth/login" class="font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">Back to Login</a></p>
      </div>
    </app-auth-split-card>
  `,
})
export class ForgotPasswordComponent {
  readonly authService = inject(AuthService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly forgotForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
  });
  readonly pending = signal(false);
  readonly confirmationMessage = signal('');

  async submit(): Promise<void> {
    if (this.forgotForm.invalid || this.pending()) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.pending.set(true);
    const { email } = this.forgotForm.getRawValue();
    try {
      await this.authService.requestPasswordReset(email);
    } catch {
      // Keep provider/account outcome indistinguishable.
    } finally {
      this.confirmationMessage.set('If that email is registered, a reset link is on its way.');
      this.pending.set(false);
    }
  }
}
