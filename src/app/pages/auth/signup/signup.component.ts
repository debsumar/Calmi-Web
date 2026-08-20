import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { safeReturnUrl } from '@/core/routing/safe-return-url';
import { AuthService } from '@/core/services/auth.service';
import { AuthSplitCardComponent } from '@/shared/components/auth-split-card/auth-split-card.component';
import { SocialAuthButtonsComponent } from '@/shared/components/social-auth-buttons/social-auth-buttons.component';

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink, AuthSplitCardComponent, SocialAuthButtonsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-split-card
      imageSrc="/assets/meditation.svg"
      imageAlt="Two people seated calmly together in meditation"
      imageSide="right">
      <div class="mx-auto flex w-full max-w-md flex-col">

        @if (successMessage()) {
          <div class="mt-6 rounded-xl border border-brand bg-brand-soft/10 px-4 py-3 text-sm text-brand-deep" role="status" aria-live="polite">{{ successMessage() }}</div>
        }

        <h1 class="text-3xl font-bold leading-tight tracking-tight text-ink md:text-5xl">Join Calmi Today!</h1>
        <p class="mt-3 text-base leading-relaxed text-ink-soft">Together, let’s build a supportive wellness community.</p>

        @if (errorMessage()) {
          <div class="mt-6 rounded-xl border border-danger bg-surface px-4 py-3 text-sm text-danger" role="alert" aria-live="assertive">{{ errorMessage() }}</div>
        }

        <form class="mt-8 space-y-5" [formGroup]="signupForm" (ngSubmit)="submit()" novalidate>
          <div>
            <label for="signup-name" class="mb-2 block text-sm font-semibold text-ink">Full Name</label>
            <input id="signup-name" type="text" autocomplete="name" formControlName="fullName" aria-describedby="signup-name-error" [attr.aria-invalid]="signupForm.controls.fullName.touched && signupForm.controls.fullName.invalid" class="w-full rounded-xl border border-hairline bg-elevated px-4 py-3 text-base text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/20" />
            <div id="signup-name-error" class="mt-1 text-sm text-danger" aria-live="polite">@if (signupForm.controls.fullName.touched && signupForm.controls.fullName.hasError('required')) { Full Name is required. }</div>
          </div>

          <div>
            <label for="signup-email" class="mb-2 block text-sm font-semibold text-ink">Email</label>
            <input id="signup-email" type="email" autocomplete="email" formControlName="email" aria-describedby="signup-email-error" [attr.aria-invalid]="signupForm.controls.email.touched && signupForm.controls.email.invalid" class="w-full rounded-xl border border-hairline bg-elevated px-4 py-3 text-base text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/20" />
            <div id="signup-email-error" class="mt-1 text-sm text-danger" aria-live="polite">
              @if (signupForm.controls.email.touched && signupForm.controls.email.hasError('required')) { Email is required. }
              @else if (signupForm.controls.email.touched && signupForm.controls.email.hasError('email')) { Enter a valid email address. }
            </div>
          </div>

          <div>
            <label for="signup-password" class="mb-2 block text-sm font-semibold text-ink">Password</label>
            <div class="relative">
              <input id="signup-password" [type]="showPassword() ? 'text' : 'password'" autocomplete="new-password" formControlName="password" aria-describedby="signup-password-error" [attr.aria-invalid]="signupForm.controls.password.touched && signupForm.controls.password.invalid" class="w-full rounded-xl border border-hairline bg-elevated px-4 py-3 pr-12 text-base text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/20" />
              <button type="button" class="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'" [attr.aria-pressed]="showPassword()" (click)="showPassword.update((visible) => !visible)">
                @if (showPassword()) { <svg viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current" stroke-width="1.8" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 5.2A10.7 10.7 0 0 1 12 5c5.2 0 8.7 4.4 9.8 7-.4 1-1.3 2.4-2.6 3.6M6.6 6.6C4.7 7.8 3.4 9.7 2.2 12c1.1 2.6 4.6 7 9.8 7 1.1 0 2.1-.2 3-.5"/></svg> } @else { <svg viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current" stroke-width="1.8" aria-hidden="true"><path d="M2.2 12c1.1-2.6 4.6-7 9.8-7s8.7 4.4 9.8 7c-1.1 2.6-4.6 7-9.8 7S3.3 14.6 2.2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg> }
              </button>
            </div>
            <div id="signup-password-error" class="mt-1 text-sm text-danger" aria-live="polite">
              @if (signupForm.controls.password.touched && signupForm.controls.password.hasError('required')) { Password is required. }
              @else if (signupForm.controls.password.touched && signupForm.controls.password.hasError('minlength')) { Password must be at least 8 characters. }
            </div>
          </div>

          <div class="flex items-start gap-3 pt-1">
            <input id="signup-terms" type="checkbox" formControlName="terms" aria-describedby="signup-terms-error" [attr.aria-invalid]="signupForm.controls.terms.touched && signupForm.controls.terms.invalid" class="mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 border-ink accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2" />
            <label for="signup-terms" class="text-sm leading-relaxed text-ink-soft">I agree to Calmi’s <a routerLink="/terms" class="text-brand underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">Terms of Service</a> and <a routerLink="/privacy" class="text-brand underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">Privacy Policy.</a></label>
            <div id="signup-terms-error" class="sr-only" aria-live="polite">@if (signupForm.controls.terms.touched && signupForm.controls.terms.invalid) { Please accept the Terms of Service and Privacy Policy. }</div>
          </div>

          <button type="submit" [disabled]="signupForm.invalid || pending()" [attr.aria-busy]="pending()" class="mt-2 flex w-full items-center justify-center gap-3 rounded-2xl bg-brand-deep px-8 py-4 text-lg font-bold text-white transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-muted">
            @if (pending()) { <span class="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span><span>Signing up...</span> } @else { <span>Sign Up</span> }
          </button>
        </form>

        <app-social-auth-buttons [disabled]="pending()" (failed)="errorMessage.set($event)"></app-social-auth-buttons>

        <p class="mt-8 text-center text-sm text-ink-soft">Already have an account? <a routerLink="/auth/login" class="font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">Login here</a></p>
      </div>
    </app-auth-split-card>
  `,
})
export class SignupComponent {
  readonly authService = inject(AuthService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly signupForm = this.formBuilder.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    terms: [false, Validators.requiredTrue],
  });
  readonly showPassword = signal(false);
  readonly pending = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);


  async submit(): Promise<void> {
    if (this.signupForm.invalid || this.pending()) {
      this.signupForm.markAllAsTouched();
      return;
    }

    this.pending.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    const { fullName, email, password } = this.signupForm.getRawValue();
    try {
      await this.authService.signup(fullName, email, password, this.authService.selectedRole() ?? undefined);
      if (this.authService.isAuthenticated()) {
        const returnUrl = safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')) ?? '/home';
        await this.router.navigateByUrl(returnUrl);
      } else {
        this.successMessage.set('Your account was created. Check your email to verify your account before signing in.');
      }
    } catch {
      this.errorMessage.set('We couldn’t create your account. Check your details and try again.');
    } finally {
      this.pending.set(false);
    }
  }
}
