import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {
  StudentVerificationResult,
  VerificationPendingManual,
  VerificationStatus,
} from '../../models/student-verification.model';

@Component({
  selector: 'app-verification-result-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './verification-result-step.component.html',
  styles: [`
    :host { display: block; color: var(--color-ink-soft); }
    .result { display: grid; gap: .8rem; justify-items: start; }
    .result-icon { display: grid; place-items: center; width: 2.75rem; height: 2.75rem; border-radius: 9999px; animation: result-pop var(--dur-base) var(--ease-spring) both; }
    .result-icon.approved { background: var(--color-sunken-alt); color: var(--color-success); }
    .result-icon.approved svg path { stroke-dasharray: 40; stroke-dashoffset: 40; animation: draw var(--dur-slow) var(--ease-out) both; }
    .result-icon.failed { background: var(--color-sunken-alt); color: var(--color-danger); animation: shake var(--dur-base) var(--ease-out) both; }
    .result-icon.pending { background: var(--color-sunken-alt); color: var(--color-accent-gold); animation: breathe var(--dur-loop) var(--ease-out) infinite; }
    h3 { margin: 0; color: var(--color-ink); font-size: 1rem; font-weight: 700; line-height: 1.25; }
    p { margin: 0; line-height: 1.55; }
    .receipt { display: grid; width: 100%; gap: .35rem; border: 1px solid var(--color-hairline); border-radius: .75rem; background: var(--color-sunken); padding: .9rem; font-size: .875rem; }
    .receipt-row { display: flex; justify-content: space-between; gap: 1rem; animation: row-in var(--dur-base) var(--ease-out) both; }
    .receipt-row:nth-child(2) { animation-delay: calc(var(--stagger-step) * 1); }
    .receipt-row:nth-child(3) { animation-delay: calc(var(--stagger-step) * 2); }
    .receipt-row:nth-child(4) { animation-delay: calc(var(--stagger-step) * 3); }
    .receipt-row strong { color: var(--color-ink); text-align: right; overflow-wrap: anywhere; }
    .strike { position: relative; color: var(--color-ink-muted); text-decoration: none; }
    .strike::after { position: absolute; top: 50%; right: 0; left: 0; height: .1rem; background: currentColor; content: ''; transform: scaleX(0); transform-origin: left center; animation: strike-draw var(--dur-base) var(--ease-out) both; }
    .actions { display: flex; flex-wrap: wrap; gap: .6rem; }
    .button { display: inline-flex; align-items: center; justify-content: center; border: 1px solid transparent; border-radius: 9999px; padding: .7rem 1.4rem; font: inherit; font-size: 1rem; font-weight: 600; cursor: pointer; transition: transform var(--dur-fast) var(--ease-out), background-color var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out); }
    .button:hover { transform: translateY(-.08rem); }
    .button:active { transform: scale(.96); }
    .button:focus-visible { outline: 2px solid var(--color-brand-light); outline-offset: 2px; }
    .button-primary { background: var(--color-brand); color: var(--color-on-brand); }
    .button-outline { border-color: var(--color-brand); background: transparent; color: var(--color-ink); }
    .button-quiet { border-color: var(--color-hairline); background: transparent; color: var(--color-ink-muted); }
    .hint { color: var(--color-ink-muted); font-size: .75rem; }
    @keyframes row-in { from { opacity: 0; transform: translateY(.5rem); } to { opacity: 1; transform: translateY(0); } }
    @keyframes result-pop { from { opacity: 0; transform: scale(.7); } 70% { opacity: 1; transform: scale(1.08); } to { opacity: 1; transform: scale(1); } }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-.35rem); } 75% { transform: translateX(.35rem); } }
    @keyframes breathe { 0%, 100% { transform: scale(1); opacity: .72; } 50% { transform: scale(1.08); opacity: 1; } }
    @keyframes strike-draw { to { transform: scaleX(1); } }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation: none !important; transition-duration: var(--dur-instant) !important; }
      .strike::after { transform: scaleX(1); }
    }
  `],
})
export class VerificationResultStepComponent {
  readonly result = input<StudentVerificationResult | null>(null);
  readonly status = input.required<VerificationStatus>();
  readonly retry = output<void>();
  readonly changeMethod = output<void>();
  readonly escalate = output<void>();
  readonly continued = output<void>();
  readonly requestNewCode = output<void>();

  readonly approvedResult = computed(() => {
    const value = this.result();
    return value?.status === 'approved' ? value : null;
  });
  readonly manualResult = computed(() => {
    const value = this.result();
    return value?.status === 'pending' && value.pendingKind === 'manual' ? value : null;
  });
  readonly reasonCopy = computed(() => {
    const value = this.result();
    if (value?.status !== 'rejected') return 'Your details remain on this screen. You can try again.';
    switch (value.reasonCode) {
      case 'not_enrolled': return "Your institution didn't confirm an active enrolment for those details. This happens often when a college doesn't issue student email.";
      case 'domain_mismatch': return 'The email domain did not match your selected institution.';
      case 'unreadable_document': return 'We could not read that document. Try another clear image or PDF.';
      default: return 'We could not verify those details automatically. You can try again or request manual review.';
    }
  });

  formatDate(value: string | undefined, withTime = false): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-IN', withTime
      ? { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }
      : { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }

  manualReview(): VerificationPendingManual | null {
    return this.manualResult();
  }
}
