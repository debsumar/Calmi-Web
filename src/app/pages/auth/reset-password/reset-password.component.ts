import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@/core/services/auth.service';
import { AuthSplitCardComponent } from '@/shared/components/auth-split-card/auth-split-card.component';
import { AnimateOnScrollDirective } from '@/shared/directives/animate-on-scroll.directive';

const matchingPasswords: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const form = control as { get: (name: string) => AbstractControl | null };
  return form.get('password')?.value === form.get('confirmPassword')?.value ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, AuthSplitCardComponent, AnimateOnScrollDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-split-card
      imageSrc="/assets/meditation.svg"
      imageAlt="Two people seated calmly together in meditation"
      imageSide="right">
      <div class="mx-auto flex w-full max-w-md flex-col">
        <h1 appAnimateOnScroll style="--index:0" class="text-3xl font-bold leading-tight tracking-tight text-ink md:text-5xl">Create a New Password</h1>
        <p appAnimateOnScroll style="--index:1" class="mt-3 text-base leading-relaxed text-ink-soft">Choose a new password to secure your Calmi account.</p>

        @if (!authService.isAuthenticated()) {
          <div appAnimateOnScroll style="--index:2" class="mt-6 rounded-xl border border-danger bg-surface px-4 py-3 text-sm text-danger" role="alert" aria-live="assertive">This reset link is invalid or expired. Request a new link and try again.</div>
        }
        @if (errorMessage()) {
          <div appAnimateOnScroll style="--index:3" class="mt-6 rounded-xl border border-danger bg-surface px-4 py-3 text-sm text-danger" role="alert" aria-live="assertive">{{ errorMessage() }}</div>
        }
        @if (successMessage()) {
          <div appAnimateOnScroll style="--index:4" class="mt-6 rounded-xl border border-brand bg-brand-soft/10 px-4 py-3 text-sm text-brand-deep" role="status" aria-live="polite">{{ successMessage() }}</div>
        }

        <form appAnimateOnScroll style="--index:5" class="mt-8 space-y-5" [formGroup]="resetForm" (ngSubmit)="submit()" novalidate>
          <div>
            <label for="reset-password" class="mb-2 block text-sm font-semibold text-ink">New Password</label>
            <input id="reset-password" type="password" autocomplete="new-password" formControlName="password" aria-describedby="reset-password-error" [attr.aria-invalid]="resetForm.controls.password.touched && resetForm.controls.password.invalid" class="w-full rounded-xl border border-hairline bg-elevated px-4 py-3 text-base text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20" />
            <div id="reset-password-error" class="mt-1 text-sm text-danger" aria-live="polite">
              @if (resetForm.controls.password.touched && resetForm.controls.password.hasError('required')) { Password is required. }
              @else if (resetForm.controls.password.touched && resetForm.controls.password.hasError('minlength')) { Password must be at least 8 characters. }
            </div>
          </div>
          <div>
            <label for="reset-confirm-password" class="mb-2 block text-sm font-semibold text-ink">Confirm Password</label>
            <input id="reset-confirm-password" type="password" autocomplete="new-password" formControlName="confirmPassword" aria-describedby="reset-confirm-password-error" [attr.aria-invalid]="resetForm.controls.confirmPassword.touched && (resetForm.controls.confirmPassword.invalid || resetForm.hasError('passwordMismatch'))" class="w-full rounded-xl border border-hairline bg-elevated px-4 py-3 text-base text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20" />
            <div id="reset-confirm-password-error" class="mt-1 text-sm text-danger" aria-live="polite">
              @if (resetForm.controls.confirmPassword.touched && resetForm.controls.confirmPassword.hasError('required')) { Please confirm your password. }
              @else if (resetForm.controls.confirmPassword.touched && resetForm.hasError('passwordMismatch')) { Passwords must match. }
            </div>
          </div>
          <button type="submit" [disabled]="resetForm.invalid || pending() || !authService.isAuthenticated()" [attr.aria-busy]="pending()" class="flex w-full items-center justify-center gap-3 rounded-full bg-brand-deep px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-muted">
            @if (pending()) { <span class="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span><span>Saving...</span> } @else { <span>Save Password</span> }
          </button>
        </form>

        <p appAnimateOnScroll style="--index:6" class="mt-8 text-center text-sm text-ink-soft"><a routerLink="/auth/login" class="font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">Back to Login</a></p>
      </div>
    </app-auth-split-card>
  `,
})
export class ResetPasswordComponent {
  readonly authService = inject(AuthService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);

  readonly resetForm = this.formBuilder.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  }, { validators: matchingPasswords });
  readonly pending = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  async submit(): Promise<void> {
    if (this.resetForm.invalid || this.pending() || !this.authService.isAuthenticated()) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.pending.set(true);
    this.errorMessage.set('');
    const { password } = this.resetForm.getRawValue();
    try {
      await this.authService.updatePassword(password);
      this.successMessage.set('Password updated. Redirecting you to Calmi.');
      await this.router.navigateByUrl('/home');
    } catch {
      this.errorMessage.set('We couldn’t update your password. Request a new reset link and try again.');
    } finally {
      this.pending.set(false);
    }
  }
}
