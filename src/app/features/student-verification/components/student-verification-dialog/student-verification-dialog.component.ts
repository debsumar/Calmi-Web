import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  effect,
  ElementRef,
  HostListener,
  inject,
  Injector,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { LucideArrowLeft, LucideArrowRight } from '@lucide/angular';
import {
  Institution,
  StudentVerificationRequest,
  StudentVerificationResult,
  VerificationStatus,
} from '../../models/student-verification.model';
import { StudentVerificationService } from '../../services/student-verification.service';
import { VerificationCheckingStepComponent } from '../verification-checking-step/verification-checking-step.component';
import { VerificationEmailCodeStepComponent } from '../verification-email-code-step/verification-email-code-step.component';
import { VerificationMethodStepComponent } from '../verification-method-step/verification-method-step.component';
import { VerificationResultStepComponent } from '../verification-result-step/verification-result-step.component';
import {
  VerificationStepperComponent,
  VerificationStep,
} from '../verification-stepper/verification-stepper.component';

type Pane = 'collecting' | 'code' | 'checking' | 'result';
type Direction = 'forward' | 'backward';

const PANE_RANK: Record<Pane, number> = {
  collecting: 0,
  code: 1,
  checking: 2,
  result: 3,
};

const STATUS_ANNOUNCEMENTS: Record<VerificationStatus, string> = {
  idle: 'Enter your institution and proof of enrolment.',
  collecting: 'Enter your institution and proof of enrolment.',
  emailSent: 'Enter the 6-digit code sent to your institutional email.',
  checking: 'Checking your enrolment. Please wait.',
  approved: 'Verified. Student Premium is unlocked.',
  failed: 'We could not verify you automatically.',
  manualPending: 'Sent for manual review. We will email a decision.',
  error: 'Verification service unavailable. Try again.',
  otpExpired: 'Your verification code expired. Request a new code.',
  alreadyVerified: 'Already verified. Student Premium is unlocked.',
};

@Component({
  selector: 'app-student-verification-dialog',
  imports: [
    LucideArrowLeft,
    LucideArrowRight,
    VerificationStepperComponent,
    VerificationMethodStepComponent,
    VerificationEmailCodeStepComponent,
    VerificationCheckingStepComponent,
    VerificationResultStepComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './student-verification-dialog.component.html',
  styleUrl: './student-verification-dialog.component.scss',
  host: { class: 'font-sans' },
})
export class StudentVerificationDialogComponent implements OnDestroy {
  readonly open = input.required<boolean>();
  readonly closed = output<void>();
  readonly verified = output<StudentVerificationResult>();

  readonly service = inject(StudentVerificationService);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly dialogRef = viewChild<ElementRef<HTMLElement>>('dialog');
  private readonly headingRef = viewChild<ElementRef<HTMLElement>>('heading');

  readonly isVisible = signal(false);
  readonly isClosing = signal(false);
  readonly activePane = signal<Pane>('collecting');
  readonly exitingPane = signal<Pane | null>(null);
  readonly enteringPane = signal<Pane | null>(null);
  readonly direction = signal<Direction>('forward');
  readonly statusAnnouncement = () => STATUS_ANNOUNCEMENTS[this.service.status()];
  readonly currentStep = (): VerificationStep => {
    switch (this.service.status()) {
      case 'checking':
      case 'error':
        return 'check';
      case 'approved':
      case 'failed':
      case 'manualPending':
      case 'alreadyVerified':
        return 'result';
      case 'idle':
      case 'collecting':
      case 'emailSent':
      case 'otpExpired':
      default:
        return 'details';
    }
  };

  private opener: HTMLElement | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  private enterTimer: ReturnType<typeof setTimeout> | null = null;
  private exitTimer: ReturnType<typeof setTimeout> | null = null;
  private closeRequested = false;
  private emittedVerificationId: string | null = null;

  constructor() {
    effect(() => {
      const requestedOpen = this.open();
      if (requestedOpen) {
        if (this.closeRequested || this.isVisible()) return;
        this.opener = this.activeElementAsHTMLElement();
        this.isClosing.set(false);
        this.isVisible.set(true);
        this.emittedVerificationId = null;
        if (this.service.status() === 'idle') this.service.goToCollecting();
        afterNextRender({ write: () => this.focusHeading() }, { injector: this.injector });
        return;
      }

      if (this.isVisible() && !this.isClosing()) this.beginClose(false);
    });

    effect(() => {
      if (!this.isVisible() || this.isClosing()) return;
      const nextPane = this.paneForStatus(this.service.status());
      if (nextPane !== this.activePane()) this.transitionTo(nextPane);

      const result = this.service.result();
      const status = this.service.status();
      if ((status === 'approved' || status === 'alreadyVerified') && result?.status === 'approved') {
        this.emitVerifiedOnce(result);
      }
    });
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  isPaneVisible(pane: Pane): boolean {
    return this.activePane() === pane || this.exitingPane() === pane;
  }

  isPaneHidden(pane: Pane): boolean {
    return this.activePane() !== pane;
  }

  isEntering(pane: Pane): boolean {
    return this.enteringPane() === pane;
  }

  isExiting(pane: Pane): boolean {
    return this.exitingPane() === pane;
  }

  isChecking(): boolean {
    return this.service.status() === 'checking';
  }

  onMethodSubmitted(request: StudentVerificationRequest): void {
    this.service.submit(request);
  }

  onCodeSubmitted(code: string): void {
    this.service.confirmCode(code);
  }

  onResend(): void {
    this.service.resendCode();
  }

  onChangeEmail(): void {
    this.service.goToCollecting();
  }

  onChangeMethod(): void {
    this.service.goToCollecting();
  }

  onRetry(): void {
    this.service.retry();
  }

  onEscalate(): void {
    this.service.requestManualReview();
  }

  onRequestNewCode(): void {
    this.service.resendCode();
  }

  onContinue(): void {
    const result = this.service.result();
    if (result?.status === 'approved') this.emitVerifiedOnce(result);
    this.requestClose();
  }

  onGoBack(): void {
    if (this.isChecking() || !this.service.canGoBack()) return;
    this.focusHeading();
    this.direction.set('backward');
    this.service.goBack();
  }

  onGoForward(): void {
    if (this.isChecking() || !this.service.canGoForward()) return;
    this.focusHeading();
    this.direction.set('forward');
    this.service.goForward();
  }

  onScrimClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.requestClose();
  }

  onPaneAnimationSettled(event: AnimationEvent, pane: Pane): void {
    if (event.target !== event.currentTarget) return;
    if (this.exitingPane() === pane) this.exitingPane.set(null);
    if (this.enteringPane() === pane) this.enteringPane.set(null);
  }

  onScrimAnimationSettled(event: AnimationEvent): void {
    if (event.target === event.currentTarget && this.isClosing()) this.finishClose();
  }

  requestClose(): void {
    if (!this.isVisible() || this.isClosing()) return;
    this.closed.emit();
    this.beginClose(true);
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.isVisible() || this.isClosing()) return;

    if (event.altKey && event.key === 'ArrowLeft') {
      if (this.service.canGoBack()) {
        event.preventDefault();
        this.onGoBack();
      }
      return;
    }

    if (event.altKey && event.key === 'ArrowRight') {
      if (this.service.canGoForward()) {
        event.preventDefault();
        this.onGoForward();
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.requestClose();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = this.focusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      this.focusHeading();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = this.document.activeElement;
    const heading = this.headingRef()?.nativeElement;
    const outsideDialog = !this.dialogRef()?.nativeElement.contains(active);
    if (event.shiftKey && (active === heading || active === first || outsideDialog)) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && (active === last || outsideDialog)) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  private paneForStatus(status: VerificationStatus): Pane {
    switch (status) {
      case 'emailSent':
        return 'code';
      case 'checking':
        return 'checking';
      case 'error':
      case 'approved':
      case 'failed':
      case 'manualPending':
      case 'otpExpired':
      case 'alreadyVerified':
        return 'result';
      case 'idle':
      case 'collecting':
      default:
        return 'collecting';
    }
  }

  private transitionTo(nextPane: Pane): void {
    const previousPane = this.activePane();
    if (this.focusIsInsidePane(previousPane)) this.focusHeading();

    this.clearPaneTimers();
    this.direction.set(PANE_RANK[nextPane] < PANE_RANK[previousPane] ? 'backward' : 'forward');
    this.exitingPane.set(previousPane);
    this.enteringPane.set(nextPane);
    this.activePane.set(nextPane);

    if (this.prefersReducedMotion()) {
      this.exitingPane.set(null);
      this.enteringPane.set(null);
      return;
    }

    const duration = this.motionDuration('--dur-base') + this.motionDuration('--motion-grace');
    this.exitTimer = setTimeout(() => this.exitingPane.set(null), duration);
    this.enterTimer = setTimeout(() => this.enteringPane.set(null), duration);
  }

  private beginClose(explicit: boolean): void {
    if (!this.isVisible() || this.isClosing()) return;

    // Restore focus before marking the dialog inert or letting its scrim leave.
    const returnTarget = this.opener?.isConnected ? this.opener : null;
    returnTarget?.focus({ preventScroll: true });
    this.closeRequested = explicit;
    this.isClosing.set(true);

    if (this.prefersReducedMotion()) {
      this.finishClose();
      return;
    }

    this.closeTimer = setTimeout(
      () => this.finishClose(),
      this.motionDuration('--dur-base') + this.motionDuration('--motion-grace'),
    );
  }

  private finishClose(): void {
    this.clearTimers();
    this.isVisible.set(false);
    this.isClosing.set(false);
    this.exitingPane.set(null);
    this.enteringPane.set(null);
    this.activePane.set('collecting');
    // Keep approved fixture state after close so pricing can retain its unlocked copy.
    // Transient drafts still reset; reopening an approved state renders the result pane.
    if (!this.service.canUseStudentPlan()) this.service.reset();
    if (!this.open()) this.closeRequested = false;
  }

  private emitVerifiedOnce(result: StudentVerificationResult): void {
    if (result.status !== 'approved' || this.emittedVerificationId === result.requestId) return;
    this.emittedVerificationId = result.requestId;
    this.verified.emit(result);
  }

  private focusIsInsidePane(pane: Pane): boolean {
    const dialog = this.dialogRef()?.nativeElement;
    const active = this.document.activeElement;
    const paneElement = dialog?.querySelector<HTMLElement>(`[data-pane="${pane}"]`);
    return Boolean(paneElement?.contains(active));
  }

  private focusHeading(): void {
    this.headingRef()?.nativeElement.focus({ preventScroll: true });
  }

  private focusableElements(): HTMLElement[] {
    const dialog = this.dialogRef()?.nativeElement;
    if (!dialog) return [];
    const selector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(dialog.querySelectorAll<HTMLElement>(selector)).filter((element) => (
      !element.hidden && !element.closest('[inert]')
    ));
  }

  private activeElementAsHTMLElement(): HTMLElement | null {
    const active = this.document.activeElement;
    return active && typeof (active as HTMLElement).focus === 'function'
      ? active as HTMLElement
      : null;
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private motionDuration(token: string): number {
    const root = this.document.documentElement;
    const value = this.document.defaultView?.getComputedStyle(root).getPropertyValue(token).trim() ?? '';
    const amount = Number.parseFloat(value);
    if (!Number.isFinite(amount)) return token === '--motion-grace' ? 40 : 320;
    return value.endsWith('ms') ? amount : amount * 1000;
  }

  private clearPaneTimers(): void {
    if (this.enterTimer !== null) clearTimeout(this.enterTimer);
    if (this.exitTimer !== null) clearTimeout(this.exitTimer);
    this.enterTimer = null;
    this.exitTimer = null;
  }

  private clearTimers(): void {
    this.clearPaneTimers();
    if (this.closeTimer !== null) clearTimeout(this.closeTimer);
    this.closeTimer = null;
  }
}
