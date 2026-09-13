import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { LucideDynamicIcon } from '@lucide/angular';
import { WaitlistService } from '@/core/services/waitlist.service';

type WaitlistStatus = 'idle' | 'submitting' | 'success' | 'error';

// Pragmatic client-side shape check only; the server remains the source of truth.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FALLBACK_ERROR = "We couldn't add you just now. Please try again.";
const INVALID_EMAIL_ERROR = 'Enter a valid email address, like you@example.com.';

@Component({
  selector: 'app-waitlist-card',
  imports: [LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section class="bg-surface border border-hairline rounded-2xl shadow-card p-6 text-center"
             aria-labelledby="waitlist-title">
      <h2 id="waitlist-title" class="text-lg font-bold text-brand-deep mb-1">
        Join the Waitlist
      </h2>
      <p class="text-base text-ink-soft mb-5 leading-relaxed sm:whitespace-nowrap">
        Be the first to experience personalized anxiety and sleep relief.
      </p>

      @if (status() === 'success') {
        <p class="inline-flex items-center justify-center gap-2 text-base font-semibold text-success"
           role="status">
          <svg [lucideIcon]="'mail-check'" [size]="20" aria-hidden="true"></svg>
          <span>You're on the list. We'll email you when Calmi opens up.</span>
        </p>
      } @else {
        <form class="flex flex-col sm:flex-row items-stretch gap-3" (submit)="onSubmit($event)" novalidate>
          <label class="sr-only" for="waitlist-email">Email address</label>
          <!--
            Honeypot: bots fill every field they find, humans never see this one.
            aria-hidden + tabindex="-1" keep it out of the accessibility tree and
            tab order. Positioned off-screen rather than display:none, which
            simple bots detect and skip.
          -->
          <div class="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
            <input type="text"
                   name="website"
                   tabindex="-1"
                   autocomplete="off"
                   [value]="honeypot()"
                   (input)="onHoneypotInput($event)">
          </div>
          <input id="waitlist-email"
                 type="email"
                 name="email"
                 autocomplete="email"
                 inputmode="email"
                 placeholder="Enter Your Email"
                 [value]="email()"
                 (input)="onEmailInput($event)"
                 [attr.aria-invalid]="isFieldInvalid() ? 'true' : null"
                 [attr.aria-describedby]="visibleError() ? 'waitlist-error' : null"
                 class="flex-1 min-w-0 rounded-full bg-sunken border border-hairline px-5 py-3 text-base text-ink placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
          <button type="submit"
                  [disabled]="status() === 'submitting'"
                  class="shrink-0 inline-flex items-center justify-center gap-2 rounded-full bg-brand-deep px-6 py-3 text-base font-semibold text-on-brand-deep transition-colors duration-200 motion-reduce:transition-none hover:bg-brand-dark disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
            @if (status() === 'submitting') {
              <svg [lucideIcon]="'loader-circle'" [size]="18" class="animate-spin motion-reduce:animate-none" aria-hidden="true"></svg>
            }
            <span>{{ status() === 'submitting' ? 'Adding you…' : 'Notify me' }}</span>
          </button>
        </form>

        @if (visibleError()) {
          <!--
            Submit failures assert immediately (role="alert"); the live typing
            hint is polite so a screen reader is not interrupted per keystroke.
          -->
          <p id="waitlist-error"
             [attr.role]="errorMessage() ? 'alert' : 'status'"
             aria-live="polite"
             class="mt-3 inline-flex items-center justify-center gap-2 text-xs font-semibold text-danger">
            <svg [lucideIcon]="'circle-alert'" [size]="16" aria-hidden="true"></svg>
            <span>{{ visibleError() }}</span>
          </p>
        }
      }
    </section>
  `,
})
export class WaitlistCardComponent {
  private waitlistService = inject(WaitlistService);
  private messageService = inject(MessageService, { optional: true });

  readonly email = signal('');
  /** Decoy field value. Stays empty for real users; forwarded to the server as-is. */
  readonly honeypot = signal('');
  readonly status = signal<WaitlistStatus>('idle');
  readonly errorMessage = signal('');
  /** True only when the email field itself is invalid, so aria-invalid never fires on a network failure. */
  readonly fieldError = signal(false);
  readonly isValidEmail = computed(() => EMAIL_PATTERN.test(this.email().trim()));
  /**
   * Live regex feedback: shown from the first character typed and cleared the
   * moment the address becomes valid. Stays silent while the field is empty so
   * an untouched form never looks broken.
   */
  readonly liveEmailError = computed(() =>
    this.email().trim().length === 0 || this.isValidEmail() ? '' : INVALID_EMAIL_ERROR,
  );
  /** Submit-time message wins; otherwise the live hint fills the same slot. */
  readonly visibleError = computed(() => this.errorMessage() || this.liveEmailError());
  readonly isFieldInvalid = computed(() => this.fieldError() || this.liveEmailError() !== '');

  onEmailInput(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
    if (this.status() === 'error') {
      this.status.set('idle');
      this.errorMessage.set('');
      this.fieldError.set(false);
    }
  }

  onHoneypotInput(event: Event): void {
    this.honeypot.set((event.target as HTMLInputElement).value);
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();

    if (this.status() === 'submitting') return;

    if (!this.isValidEmail()) {
      this.fieldError.set(true);
      this.errorMessage.set(INVALID_EMAIL_ERROR);
      this.status.set('error');
      return;
    }

    this.fieldError.set(false);
    this.errorMessage.set('');
    this.status.set('submitting');

    const result = await this.waitlistService.submit(this.email().trim(), this.honeypot());

    /*
     * Outcome matrix. The backend is the gate: 'created' is the only outcome
     * that triggered the Brevo call, so it is the only one that can affirm.
     * A Brevo failure after a successful create still counts as joined - the
     * sign-up is stored, only the welcome mail is missing.
     */
    switch (result.server.outcome) {
      case 'created':
        this.showSuccess(result.server.message ?? 'Added to waiting list successfully.');
        return;
      case 'duplicate':
        this.status.set('idle');
        this.messageService?.add({
          severity: 'warn',
          summary: 'Already on waitlist',
          detail: result.server.message ?? 'This email is already on the waiting list.',
        });
        return;
      case 'rate_limited':
        this.status.set('idle');
        this.messageService?.add({
          severity: 'warn',
          summary: 'Too many attempts',
          detail: 'Too many attempts. Please wait a minute and try again.',
        });
        return;
      case 'invalid':
      case 'failed':
        this.showError(result.server.message ?? FALLBACK_ERROR);
        return;
      case 'skipped':
        // Honeypot only: answer a bot exactly like a human, having called nothing.
        this.status.set('success');
        this.email.set('');
        return;
    }
  }

  private showSuccess(detail: string): void {
    this.status.set('success');
    this.email.set('');
    this.messageService?.add({ severity: 'success', summary: 'Waitlist updated', detail });
  }

  private showError(detail: string): void {
    this.errorMessage.set(detail);
    this.status.set('error');
    this.messageService?.add({ severity: 'error', summary: 'Waitlist unavailable', detail });
  }
}
