import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { WaitlistService } from '@/core/services/waitlist.service';

type WaitlistStatus = 'idle' | 'submitting' | 'success' | 'error';

// Pragmatic client-side shape check only; the server remains the source of truth.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

@Component({
  selector: 'app-waitlist-card',
  imports: [LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section class="bg-surface border border-hairline rounded-2xl shadow-card p-6 text-center"
             aria-labelledby="waitlist-title">
      <h2 id="waitlist-title" class="text-lg font-bold text-brand-deep dark:text-brand-light mb-1">
        Join the Waitlist
      </h2>
      <p class="text-base text-gray-600 dark:text-gray-300 mb-5 leading-relaxed">
        Be the first to experience personalized anxiety and sleep relief.
      </p>

      @if (status() === 'success') {
        <p class="inline-flex items-center justify-center gap-2 text-base font-semibold text-brand-deep dark:text-brand-light"
           role="status">
          <svg [lucideIcon]="'mail-check'" [size]="20" aria-hidden="true"></svg>
          <span>You're on the list. We'll email you when Calmi opens up.</span>
        </p>
      } @else {
        <form class="flex flex-col sm:flex-row items-stretch gap-3" (submit)="onSubmit($event)" novalidate>
          <label class="sr-only" for="waitlist-email">Email address</label>
          <input id="waitlist-email"
                 type="email"
                 name="email"
                 autocomplete="email"
                 inputmode="email"
                 placeholder="Enter Your Email"
                 [value]="email()"
                 (input)="onEmailInput($event)"
                 [attr.aria-invalid]="fieldError() ? 'true' : null"
                 [attr.aria-describedby]="errorMessage() ? 'waitlist-error' : null"
                 class="flex-1 min-w-0 rounded-full bg-sunken border border-hairline px-5 py-3 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
          <button type="submit"
                  [disabled]="status() === 'submitting'"
                  class="shrink-0 inline-flex items-center justify-center gap-2 rounded-full bg-brand-deep px-6 py-3 text-base font-semibold text-white transition-colors duration-200 motion-reduce:transition-none hover:bg-brand-dark disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
            @if (status() === 'submitting') {
              <svg [lucideIcon]="'loader-circle'" [size]="18" class="animate-spin motion-reduce:animate-none" aria-hidden="true"></svg>
            }
            <span>{{ status() === 'submitting' ? 'Adding you…' : 'Notify me' }}</span>
          </button>
        </form>

        @if (errorMessage()) {
          <p id="waitlist-error"
             role="alert"
             class="mt-3 inline-flex items-center justify-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
            <svg [lucideIcon]="'circle-alert'" [size]="16" aria-hidden="true"></svg>
            <span>{{ errorMessage() }}</span>
          </p>
        }
      }
    </section>
  `,
})
export class WaitlistCardComponent {
  private waitlistService = inject(WaitlistService);

  readonly email = signal('');
  readonly status = signal<WaitlistStatus>('idle');
  readonly errorMessage = signal('');
  /** True only when the email field itself is invalid, so aria-invalid never fires on a network failure. */
  readonly fieldError = signal(false);
  readonly isValidEmail = computed(() => EMAIL_PATTERN.test(this.email().trim()));

  onEmailInput(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
    if (this.status() === 'error') {
      this.status.set('idle');
      this.errorMessage.set('');
      this.fieldError.set(false);
    }
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();

    if (this.status() === 'submitting') return;

    if (!this.isValidEmail()) {
      this.fieldError.set(true);
      this.errorMessage.set('Enter a valid email address, like you@example.com.');
      this.status.set('error');
      return;
    }

    this.fieldError.set(false);
    this.errorMessage.set('');
    this.status.set('submitting');

    try {
      const response = await this.waitlistService.join(this.email().trim());

      // A 200 response can still carry a server-side rejection; only affirm on success.
      if (response?.success === false) {
        this.errorMessage.set(response.message ?? "We couldn't add you just now. Please try again.");
        this.status.set('error');
        return;
      }

      this.status.set('success');
      this.email.set('');
    } catch {
      this.errorMessage.set("We couldn't add you just now. Please try again.");
      this.status.set('error');
    }
  }
}
