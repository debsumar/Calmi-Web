import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '@/core/services/auth.service';
import { safeReturnUrl } from '@/core/routing/safe-return-url';
import { AuthSplitCardComponent } from '@/shared/components/auth-split-card/auth-split-card.component';
import { AnimateOnScrollDirective } from '@/shared/directives/animate-on-scroll.directive';
import { SocialAuthButtonsComponent } from '@/shared/components/social-auth-buttons/social-auth-buttons.component';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AuthSplitCardComponent, AnimateOnScrollDirective, SocialAuthButtonsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-split-card
      imageSrc="/assets/meditation.svg"
      imageAlt="Two people seated calmly together in meditation"
      imageSide="right">
      <div class="mx-auto flex w-full max-w-md flex-col">
        <h1 appAnimateOnScroll style="--index:0" class="text-3xl font-bold leading-tight tracking-tight text-ink md:text-5xl">Welcome Back!</h1>
        <p appAnimateOnScroll style="--index:1" class="mt-3 text-base leading-relaxed text-ink-soft">Ready to continue your healing journey?</p>

        @if (errorMessage()) {
          <div appAnimateOnScroll style="--index:2" class="mt-6 rounded-xl border border-danger bg-surface px-4 py-3 text-sm text-danger" role="alert" aria-live="assertive">{{ errorMessage() }}</div>
        }

        <form appAnimateOnScroll style="--index:3" class="mt-8 space-y-5" [formGroup]="loginForm" (ngSubmit)="submit()" novalidate>
          <div>
            <label for="login-email" class="mb-2 block text-sm font-semibold text-ink">Email</label>
            <input id="login-email" type="email" autocomplete="email" formControlName="email" aria-describedby="login-email-error" [attr.aria-invalid]="loginForm.controls.email.touched && loginForm.controls.email.invalid" class="w-full rounded-xl border border-hairline bg-elevated px-4 py-3 text-base text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/20" />
            <div id="login-email-error" class="mt-1 text-sm text-danger" aria-live="polite">
              @if (loginForm.controls.email.touched && loginForm.controls.email.hasError('required')) { Email is required. }
              @else if (loginForm.controls.email.touched && loginForm.controls.email.hasError('email')) { Enter a valid email address. }
            </div>
          </div>

          <div>
            <label for="login-password" class="mb-2 block text-sm font-semibold text-ink">Password</label>
            <div class="relative">
              <input id="login-password" [type]="showPassword() ? 'text' : 'password'" autocomplete="current-password" formControlName="password" aria-describedby="login-password-error" [attr.aria-invalid]="loginForm.controls.password.touched && loginForm.controls.password.invalid" class="w-full rounded-xl border border-hairline bg-elevated px-4 py-3 pr-12 text-base text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/20" />
              <button type="button" class="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'" [attr.aria-pressed]="showPassword()" (click)="showPassword.update((visible) => !visible)">
                @if (showPassword()) {
                  <svg viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current" stroke-width="1.8" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 5.2A10.7 10.7 0 0 1 12 5c5.2 0 8.7 4.4 9.8 7-.4 1-1.3 2.4-2.6 3.6M6.6 6.6C4.7 7.8 3.4 9.7 2.2 12c1.1 2.6 4.6 7 9.8 7 1.1 0 2.1-.2 3-.5"/></svg>
                } @else {
                  <svg viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current" stroke-width="1.8" aria-hidden="true"><path d="M2.2 12c1.1-2.6 4.6-7 9.8-7s8.7 4.4 9.8 7c-1.1 2.6-4.6 7-9.8 7S3.3 14.6 2.2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>
                }
              </button>
            </div>
            <div id="login-password-error" class="mt-1 text-sm text-danger" aria-live="polite">
              @if (loginForm.controls.password.touched && loginForm.controls.password.hasError('required')) { Password is required. }
              @else if (loginForm.controls.password.touched && loginForm.controls.password.hasError('minlength')) { Password must be at least 8 characters. }
            </div>
          </div>

          <div class="flex justify-end">
            <a routerLink="/auth/forgot" class="text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">Forgot Password?</a>
          </div>

          <button type="submit" [disabled]="loginForm.invalid || pending()" [attr.aria-busy]="pending()" class="flex w-full items-center justify-center gap-3 rounded-full bg-brand-deep px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-muted">
            @if (pending()) { <span class="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span><span>Signing in...</span> } @else { <span>Proceed</span><span class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-current" aria-hidden="true"><svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="2"><path d="M5 12h13M13 6l6 6-6 6"/></svg></span> }
          </button>
        </form>

        <app-social-auth-buttons appAnimateOnScroll style="--index:4" [disabled]="pending()" (failed)="errorMessage.set($event)"></app-social-auth-buttons>

        <p appAnimateOnScroll style="--index:5" class="mt-8 text-center text-sm text-ink-soft">Don’t have an account? <a routerLink="/auth/signup" class="font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">Sign up</a></p>
      </div>
    </app-auth-split-card>
  `,
})
export class LoginComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly loginForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });
  readonly showPassword = signal(false);
  readonly pending = signal(false);
  readonly errorMessage = signal('');

  async submit(): Promise<void> {
    if (this.loginForm.invalid || this.pending()) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.pending.set(true);
    this.errorMessage.set('');
    const { email, password } = this.loginForm.getRawValue();
    try {
      await this.authService.login(email, password);
      const returnUrl = safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')) ?? '/home';
      await this.router.navigateByUrl(returnUrl);
    } catch {
      this.errorMessage.set('We couldn’t sign you in. Check your email and password and try again.');
    } finally {
      this.pending.set(false);
    }
  }
}
