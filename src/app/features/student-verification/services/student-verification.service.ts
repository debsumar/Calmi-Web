import {
  DestroyRef,
  Injectable,
  Signal,
  WritableSignal,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  Institution,
  SimulatedOutcome,
  StudentVerificationRequest,
  StudentVerificationResult,
  VerificationMethod,
  VerificationStatus,
} from '../models/student-verification.model';
import {
  FIXTURE_CHECK_DELAY_MS,
  FIXTURE_OTP,
  OTP_TTL_SECONDS,
  RESEND_COOLDOWN_SECONDS,
  STUDENT_VERIFICATION_INSTITUTIONS,
  createFixtureResult,
} from './student-verification.fixtures';

interface VerificationHistorySnapshot {
  status: VerificationStatus;
  result: StudentVerificationResult | null;
}

@Injectable({ providedIn: 'root' })
export class StudentVerificationService {
  private readonly destroyRef = inject(DestroyRef);

  private readonly _status = signal<VerificationStatus>('idle');
  private readonly _result = signal<StudentVerificationResult | null>(null);
  private readonly _request = signal<StudentVerificationRequest | null>(null);
  private readonly _resendIn = signal(0);
  private readonly _otpTarget = signal('');
  private readonly _institutions = signal<readonly Institution[]>(STUDENT_VERIFICATION_INSTITUTIONS);

  readonly status: Signal<VerificationStatus> = this._status.asReadonly();
  readonly result: Signal<StudentVerificationResult | null> = this._result.asReadonly();
  readonly institutions: Signal<readonly Institution[]> = this._institutions.asReadonly();
  readonly resendIn: Signal<number> = this._resendIn.asReadonly();
  readonly canResend: Signal<boolean> = computed(() => (
    this._resendIn() === 0
    && (this._status() === 'emailSent' || this._status() === 'otpExpired')
    && this._request()?.method === 'email'
  ));
  readonly canGoBack: Signal<boolean> = computed(() => (
    this.historyCursor() > 0
    && this._status() !== 'checking'
    && !this.isCommittedOutcome(this._status())
  ));
  readonly canGoForward: Signal<boolean> = computed(() => (
    this.historyCursor() >= 0 && this.historyCursor() < this.history().length - 1
  ));
  readonly request: Signal<StudentVerificationRequest | null> = this._request.asReadonly();
  readonly otpTarget: Signal<string> = this._otpTarget.asReadonly();
  readonly institutionLabel: Signal<string> = computed(() => this._request()?.institutionName ?? '');
  readonly canUseStudentPlan: Signal<boolean> = computed(() => (
    this._status() === 'approved' || this._status() === 'alreadyVerified'
  ));
  readonly simulatedOutcome: WritableSignal<SimulatedOutcome> = signal<SimulatedOutcome>('approved');

  private otpExpiresAt: number | null = null;
  private otpTimer: ReturnType<typeof setTimeout> | null = null;
  private resendTimer: ReturnType<typeof setInterval> | null = null;
  private checkTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly history = signal<VerificationHistorySnapshot[]>([]);
  private readonly historyCursor = signal(-1);
  private requestSequence = 0;
  private activeRequestId: string | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.clearResendTimer();
      this.clearCheckTimer();
      this.clearOtpTimer();
    });
  }

  resolveInstitution(name: string): Institution | null {
    // TODO(api): bind institution lookup to GET /api/institutions?q=.
    const normalizedName = name.trim().toLocaleLowerCase();
    return this.institutions().find((institution) => (
      institution.name.toLocaleLowerCase() === normalizedName
    )) ?? null;
  }

  isAllowedDomain(email: string, institution: Institution | null): boolean {
    // TODO(api): revalidate the institution domain on POST /api/student-verification.
    if (!institution) return false;
    const atIndex = email.lastIndexOf('@');
    if (atIndex < 1 || atIndex === email.length - 1) return false;
    const domain = email.slice(atIndex + 1).trim().toLocaleLowerCase();
    return institution.domains.some((allowedDomain) => (
      domain === allowedDomain.trim().toLocaleLowerCase()
    ));
  }

  submit(request: StudentVerificationRequest): void {
    // TODO(api): bind submission to POST /api/student-verification; document uploads use POST /api/student-verification/upload-url first.
    this.clearCheckTimer();
    this.clearResendTimer();
    this.clearOtpTimer();
    this._resendIn.set(0);
    if (this.history().length === 0) this.navigate('collecting', null);
    this._request.set(request);
    this.activeRequestId = this.createRequestId();
    this._otpTarget.set(request.institutionalEmail ?? '');

    if (request.method === 'email') {
      this.navigate('emailSent', null);
      this.startOtpWindow();
      return;
    }

    this.navigate('checking', null);
    this.scheduleFixtureResolution(request.method);
  }

  confirmCode(code: string): void {
    // TODO(api): bind code confirmation to POST /api/student-verification/confirm.
    if (this._status() !== 'emailSent' || !/^\d{6}$/.test(code)) return;

    if (this.simulatedOutcome() === 'otpExpired' || this.isOtpExpired()) {
      this.markOtpExpired();
      return;
    }

    this.clearOtpTimer();
    this.clearResendTimer();
    this.navigate('checking', null);
    this.scheduleFixtureResolution('email');
  }

  resendCode(): void {
    // TODO(api): bind OTP resend to POST /api/student-verification/confirm.
    if (!this.canResend()) return;

    this.clearOtpTimer();
    if (this.simulatedOutcome() === 'otpExpired') {
      this.simulatedOutcome.set('approved');
    }
    this.navigate('emailSent', null);
    this.startOtpWindow();
  }

  requestManualReview(): void {
    // TODO(api): bind manual escalation to POST /api/student-verification/review.
    const request = this.request();
    if (!request) return;

    this.clearCheckTimer();
    this.clearResendTimer();
    this.clearOtpTimer();
    this.otpExpiresAt = null;
    const requestId = this.currentRequestId();
    const submittedAt = new Date().toISOString();
    const expectedBy = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const result: StudentVerificationResult = {
      requestId,
      status: 'pending',
      pendingKind: 'manual',
      supportTicketRef: `SV-${requestId.slice(-6).toUpperCase()}`,
      submittedAt,
      expectedBy,
    };
    this.navigate('manualPending', result);
  }

  retry(): void {
    // TODO(api): bind retry to GET /api/student-verification/status and POST /api/student-verification.
    const request = this.request();
    if (!request) return;

    this.clearCheckTimer();
    this.clearResendTimer();
    this.clearOtpTimer();
    if (request.method === 'email') {
      this.navigate('emailSent', null);
      this.startOtpWindow();
      return;
    }

    this.navigate('checking', null);
    this.scheduleFixtureResolution(request.method);
  }

  reset(): void {
    // TODO(api): bind restored verification state to GET /api/student-verification/status.
    this.clearCheckTimer();
    this.clearResendTimer();
    this.clearOtpTimer();
    this.otpExpiresAt = null;
    this.history.set([]);
    this.historyCursor.set(-1);
    this.navigate('idle', null);
    this._request.set(null);
    this.activeRequestId = null;
    this._resendIn.set(0);
    this._otpTarget.set('');
  }

  goToCollecting(): void {
    // TODO(api): bind draft restoration to GET /api/student-verification/status.
    this.clearCheckTimer();
    this.clearResendTimer();
    this.clearOtpTimer();
    this.otpExpiresAt = null;
    this.navigate('collecting', null);
  }

  goBack(): void {
    if (!this.canGoBack()) return;
    const nextCursor = this.historyCursor() - 1;
    this.historyCursor.set(nextCursor);
    this.restoreSnapshot(this.history()[nextCursor]);
  }

  goForward(): void {
    if (!this.canGoForward()) return;
    const nextCursor = this.historyCursor() + 1;
    this.historyCursor.set(nextCursor);
    this.restoreSnapshot(this.history()[nextCursor]);
  }

  private navigate(status: VerificationStatus, result: StudentVerificationResult | null): void {
    this._status.set(status);
    this._result.set(result);
    if (status === 'checking' || status === 'idle') {
      this.history.set(this.history().slice(0, this.historyCursor() + 1));
      return;
    }

    const nextHistory = this.history().slice(0, this.historyCursor() + 1);
    nextHistory.push({ status, result });
    this.history.set(nextHistory);
    this.historyCursor.set(this.history().length - 1);
  }

  private restoreSnapshot(snapshot: VerificationHistorySnapshot): void {
    this.clearCheckTimer();
    this.clearResendTimer();
    this.clearOtpTimer();
    this.otpExpiresAt = null;
    this._resendIn.set(0);

    if (snapshot.status === 'collecting') {
      this._status.set('collecting');
      this._result.set(null);
      return;
    }

    if (snapshot.status === 'emailSent') {
      this._status.set('emailSent');
      this._result.set(snapshot.result);
      // TODO(api): re-read OTP state from GET /api/student-verification/status instead of minting a new window.
      this.startOtpWindow();
      return;
    }

    this._status.set(snapshot.status);
    this._result.set(snapshot.result);
  }

  private isCommittedOutcome(status: VerificationStatus): boolean {
    return status === 'approved' || status === 'alreadyVerified' || status === 'manualPending';
  }

  private currentRequestId(): string {
    if (this.activeRequestId !== null) return this.activeRequestId;
    this.activeRequestId = this.createRequestId();
    return this.activeRequestId;
  }

  private createRequestId(): string {
    const request = this.request();
    const institutionPart = request?.institutionId ?? 'unknown';
    return `fixture-${institutionPart}-${++this.requestSequence}`;
  }

  private scheduleFixtureResolution(method: VerificationMethod): void {
    this.clearCheckTimer();
    const request = this.request();
    if (!request) return;

    const tokenLength = method === 'email'
      ? (request.institutionalEmail?.length ?? 0)
      : (request.documentName?.length ?? 0);
    const delay = FIXTURE_CHECK_DELAY_MS + (tokenLength % 60);
    this.checkTimer = setTimeout(() => {
      this.checkTimer = null;
      const requestId = this.currentRequestId();
      const result = createFixtureResult(this.simulatedOutcome(), requestId);
      if (!result) {
        this.navigate('error', null);
        return;
      }

      this.navigate(this.statusForResult(result), result);
    }, delay);
  }

  private statusForResult(result: StudentVerificationResult): VerificationStatus {
    if (result.status === 'approved') {
      return result.reasonCode === 'already_verified' ? 'alreadyVerified' : 'approved';
    }
    if (result.status === 'rejected') {
      return result.reasonCode === 'otp_expired' ? 'otpExpired' : 'failed';
    }
    return result.pendingKind === 'manual' ? 'manualPending' : 'checking';
  }

  private startOtpWindow(): void {
    this.clearOtpTimer();
    this.otpExpiresAt = Date.now() + OTP_TTL_SECONDS * 1000;
    this.otpTimer = setTimeout(() => {
      this.otpTimer = null;
      this.markOtpExpired();
    }, OTP_TTL_SECONDS * 1000);
    this.startResendCooldown();
  }

  private isOtpExpired(): boolean {
    return this.otpExpiresAt !== null && Date.now() >= this.otpExpiresAt;
  }

  private markOtpExpired(): void {
    this.clearCheckTimer();
    this.clearResendTimer();
    this.clearOtpTimer();
    this._resendIn.set(0);
    const requestId = this.currentRequestId();
    const result = createFixtureResult('otpExpired', requestId);
    this.navigate('otpExpired', result);
  }

  private startResendCooldown(): void {
    this.clearResendTimer();
    this._resendIn.set(RESEND_COOLDOWN_SECONDS);
    this.resendTimer = setInterval(() => {
      const remaining = this._resendIn();
      if (remaining <= 1) {
        this._resendIn.set(0);
        this.clearResendTimer();
        return;
      }
      this._resendIn.set(remaining - 1);
    }, 1000);
  }

  private clearOtpTimer(): void {
    if (this.otpTimer !== null) {
      clearTimeout(this.otpTimer);
      this.otpTimer = null;
    }
  }

  private clearResendTimer(): void {
    if (this.resendTimer !== null) {
      clearInterval(this.resendTimer);
      this.resendTimer = null;
    }
  }

  private clearCheckTimer(): void {
    if (this.checkTimer !== null) {
      clearTimeout(this.checkTimer);
      this.checkTimer = null;
    }
  }
}
