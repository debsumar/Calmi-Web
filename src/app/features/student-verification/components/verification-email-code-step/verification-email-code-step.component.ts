import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { VerificationOtpDraft } from '../../models/student-verification.model';

@Component({
  selector: 'app-verification-email-code-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './verification-email-code-step.component.html',
  styles: [`
    :host { display: block; color: var(--color-ink-soft); }
    .code-pane { display: grid; gap: 1.1rem; }
    .lead { margin: 0; font-size: 1rem; line-height: 1.55; }
    .lead strong { color: var(--color-ink); overflow-wrap: anywhere; }
    .field { display: grid; gap: .45rem; }
    .otp { display: flex; gap: .5rem; }
    .otp-input { width: 2.75rem; border: 1px solid var(--color-hairline); border-radius: .75rem; background: var(--color-sunken); color: var(--color-ink); padding: .5rem 0; text-align: center; font: inherit; font-size: 1.25rem; font-weight: 700; outline: none; transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-spring); }
    .otp-input:focus-visible { outline: 2px solid var(--color-brand-light); outline-offset: 2px; box-shadow: 0 0 0 .2rem var(--color-hairline); transform: translateY(-.12rem) scale(1.03); }
    .otp-input[aria-invalid="true"] { border-color: var(--color-danger); }
    .otp-input.is-filled { animation: otp-pop var(--dur-fast) var(--ease-spring) both; background: var(--color-sunken-alt); }
    .otp.is-invalid { animation: shake var(--dur-base) var(--ease-out) both; }
    .hint { margin: 0; color: var(--color-ink-muted); font-size: .75rem; }
    .error { margin: 0; color: var(--color-danger); font-size: .75rem; animation: error-in var(--dur-base) var(--ease-out) both; }
    .actions { display: flex; flex-wrap: wrap; gap: .6rem; }
    .button { display: inline-flex; align-items: center; justify-content: center; border: 1px solid transparent; border-radius: 9999px; padding: .7rem 1.4rem; font: inherit; font-size: 1rem; font-weight: 600; cursor: pointer; transition: transform var(--dur-fast) var(--ease-out), background-color var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out), opacity var(--dur-base) var(--ease-out); }
    .button:hover:not(:disabled) { transform: translateY(-.08rem); }
    .button:active:not(:disabled) { transform: scale(.96); }
    .button-primary { background: var(--color-brand); color: var(--color-on-brand); }
    .button-outline { border-color: var(--color-brand); background: transparent; color: var(--color-ink); }
    .button-quiet { border-color: var(--color-hairline); background: transparent; color: var(--color-ink-muted); }
    .button:disabled { cursor: not-allowed; opacity: .5; }
    @keyframes otp-pop { 0% { transform: scale(.9); } 70% { transform: scale(1.08); } 100% { transform: scale(1); } }
    @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-.35rem); } 75% { transform: translateX(.35rem); } }
    @keyframes error-in { from { opacity: 0; transform: translateX(-.5rem); } to { opacity: 1; transform: translateX(0); } }
    @media (max-width: 480px) { .otp { gap: .35rem; } .otp-input { width: 2.25rem; font-size: 1rem; } .actions .button { flex: 1 1 100%; } }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation: none !important; transition-duration: var(--dur-instant) !important; }
    }
  `],
})
export class VerificationEmailCodeStepComponent {
  readonly email = input.required<string>();
  readonly resendIn = input(0);
  readonly canResend = input(false);
  readonly otpDraft = input<VerificationOtpDraft | null>(null);
  readonly codeSubmitted = output<string>();
  readonly draftChanged = output<VerificationOtpDraft>();
  readonly resend = output<void>();
  readonly changeEmail = output<void>();

  readonly digits = signal<string[]>(['', '', '', '', '', '']);
  readonly invalid = signal(false);
  readonly code = computed(() => this.digits().join(''));
  readonly complete = computed(() => /^\d{6}$/.test(this.code()));
  readonly resendCopy = computed(() => this.resendIn() > 0
    ? `Resend available in ${this.resendIn()} seconds.`
    : 'You can request a new code now.');

  constructor() {
    effect(() => {
      const draft = this.otpDraft();
      if (!draft || this.matchesDraft(draft)) return;
      this.digits.set([...draft.digits].slice(0, 6).concat(['', '', '', '', '', '']).slice(0, 6));
      this.invalid.set(draft.invalid);
    });
  }

  valueAt(index: number): string {
    return this.digits()[index] ?? '';
  }

  onInput(event: Event, index: number): void {
    const input = event.currentTarget as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(-1);
    this.updateDigit(index, value);
    if (value && index < 5) this.focusInput(event, index + 1);
  }

  onKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.valueAt(index) && index > 0) {
      event.preventDefault();
      this.focusInput(event, index - 1);
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6) ?? '';
    if (!pasted) return;
    this.digits.set(Array.from({ length: 6 }, (_, index) => pasted[index] ?? ''));
    this.invalid.set(false);
    this.emitDraft();
    const target = event.currentTarget as HTMLElement;
    const inputs = this.inputsFor(target);
    inputs[Math.min(pasted.length, 6) - 1]?.focus();
  }

  confirm(): void {
    if (!this.complete()) {
      this.invalid.set(true);
      this.emitDraft();
      return;
    }
    this.invalid.set(false);
    this.emitDraft();
    this.codeSubmitted.emit(this.code());
  }

  requestResend(): void {
    if (this.canResend()) this.resend.emit();
  }

  private updateDigit(index: number, value: string): void {
    this.digits.update((digits) => digits.map((digit, current) => current === index ? value : digit));
    this.invalid.set(false);
    this.emitDraft();
  }

  private matchesDraft(draft: VerificationOtpDraft): boolean {
    return this.invalid() === draft.invalid && this.digits().every((digit, index) => digit === (draft.digits[index] ?? ''));
  }

  private emitDraft(): void {
    this.draftChanged.emit({ digits: [...this.digits()], invalid: this.invalid() });
  }

  private focusInput(event: Event, index: number): void {
    const inputs = this.inputsFor(event.currentTarget as HTMLElement);
    inputs[index]?.focus();
  }

  private inputsFor(element: HTMLElement): HTMLInputElement[] {
    return Array.from(element.closest('.code-pane')?.querySelectorAll<HTMLInputElement>('.otp-input') ?? []);
  }
}
