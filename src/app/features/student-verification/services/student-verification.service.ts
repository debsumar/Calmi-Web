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
  VerificationMethodDraft,
  VerificationOtpDraft,
} from '../models/student-verification.model';
import { INSTITUTION_DIRECTORY_LOADER } from './institution-directory.loader';
import {
  FIXTURE_CHECK_DELAY_MS,
  OTP_TTL_SECONDS,
  RESEND_COOLDOWN_SECONDS,
  STUDENT_VERIFICATION_INSTITUTIONS,
  createFixtureResult,
} from './student-verification.fixtures';

// Maintained India PSL policy for the offline directory. One-label public
// suffixes are rejected by the dot guard below; these are the multi-label
// effective suffixes that must never become institution-owned domains.
const INDIA_PUBLIC_SUFFIXES = new Set([
  'ac.in',
  'co.in',
  'ernet.in',
  'firm.in',
  'gen.in',
  'gov.in',
  'ind.in',
  'mil.in',
  'net.in',
  'org.in',
  'res.in',
]);

interface VerificationHistorySnapshot {
  status: VerificationStatus;
  result: StudentVerificationResult | null;
  request: StudentVerificationRequest | null;
  methodDraft: VerificationMethodDraft;
  otpDraft: VerificationOtpDraft;
  otpTarget: string;
  otpExpiresAt: number | null;
  resendAvailableAt: number | null;
  checkDeadline: number | null;
  checkPhase: 'pending' | 'paused' | 'settled' | null;
  checkMethod: VerificationMethod | null;
  requestId: string | null;
  simulatedOutcome: SimulatedOutcome;
}

@Injectable({ providedIn: 'root' })
export class StudentVerificationService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly institutionDirectoryLoader = inject(INSTITUTION_DIRECTORY_LOADER);

  private readonly _status = signal<VerificationStatus>('idle');
  private readonly _result = signal<StudentVerificationResult | null>(null);
  private readonly _request = signal<StudentVerificationRequest | null>(null);
  private readonly _resendIn = signal(0);
  private readonly _otpTarget = signal('');
  private readonly _institutions = signal<readonly Institution[]>(STUDENT_VERIFICATION_INSTITUTIONS);
  private readonly _institutionDirectoryStatus = signal<'fixtures' | 'loading' | 'loaded' | 'failed'>('fixtures');
  private institutionDirectoryLoad: Promise<void> | null = null;
  private institutionDirectoryLoaded = false;
  private institutionDirectoryFailureLogged = false;

  readonly status: Signal<VerificationStatus> = this._status.asReadonly();
  readonly result: Signal<StudentVerificationResult | null> = this._result.asReadonly();
  readonly institutions: Signal<readonly Institution[]> = this._institutions.asReadonly();
  readonly institutionDirectoryStatus: Signal<'fixtures' | 'loading' | 'loaded' | 'failed'> = this._institutionDirectoryStatus.asReadonly();
  readonly resendIn: Signal<number> = this._resendIn.asReadonly();
  readonly canResend: Signal<boolean> = computed(() => (
    this._resendIn() === 0
    && (this._status() === 'emailSent' || this._status() === 'otpExpired')
    && this._request()?.method === 'email'
  ));
  readonly canGoBack: Signal<boolean> = computed(() => this.historyCursor() > 0);
  readonly canGoForward: Signal<boolean> = computed(() => (
    this.historyCursor() >= 0 && this.historyCursor() < this.history().length - 1
  ));
  readonly request: Signal<StudentVerificationRequest | null> = this._request.asReadonly();
  readonly otpTarget: Signal<string> = this._otpTarget.asReadonly();
  readonly institutionLabel: Signal<string> = computed(() => this._request()?.institutionName ?? '');
  readonly simulatedOutcome: WritableSignal<SimulatedOutcome> = signal<SimulatedOutcome>('approved');

  private otpExpiresAt: number | null = null;
  private resendAvailableAt: number | null = null;
  private checkDeadline: number | null = null;
  private checkPhase: 'pending' | 'paused' | 'settled' | null = null;
  private checkMethod: VerificationMethod | null = null;
  private otpTimer: ReturnType<typeof setTimeout> | null = null;
  private resendTimer: ReturnType<typeof setInterval> | null = null;
  private checkTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly history = signal<VerificationHistorySnapshot[]>([]);
  private readonly historyCursor = signal(-1);
  private readonly _methodDraft = signal<VerificationMethodDraft>(this.emptyMethodDraft());
  private readonly _otpDraft = signal<VerificationOtpDraft>({ digits: ['', '', '', '', '', ''], invalid: false });
  private readonly _verifiedResult = signal<StudentVerificationResult | null>(null);
  private requestSequence = 0;
  private activeRequestId: string | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.clearResendTimer();
      this.clearCheckTimer();
      this.clearOtpTimer();
    });
  }


  readonly methodDraft: Signal<VerificationMethodDraft> = this._methodDraft.asReadonly();
  readonly otpDraft: Signal<VerificationOtpDraft> = this._otpDraft.asReadonly();
  readonly canUseStudentPlan: Signal<boolean> = computed(() => this._verifiedResult() !== null);

  loadInstitutionDirectory(): Promise<void> {
    if (this.institutionDirectoryLoaded) return Promise.resolve();
    if (this.institutionDirectoryLoad) return this.institutionDirectoryLoad;

    this._institutionDirectoryStatus.set('loading');
    const load = this.institutionDirectoryLoader()
      .then(({ GENERATED_INSTITUTIONS }) => {
        this._institutions.set(this.mergeInstitutions(GENERATED_INSTITUTIONS));
        this.institutionDirectoryLoaded = true;
        this._institutionDirectoryStatus.set('loaded');
      })
      .catch((error: unknown) => {
        this.institutionDirectoryLoaded = true;
        this._institutionDirectoryStatus.set('failed');
        if (!this.institutionDirectoryFailureLogged) {
          this.institutionDirectoryFailureLogged = true;
          console.error('Unable to load the generated institution directory; using fixtures.', error);
        }
      })
      .finally(() => {
        this.institutionDirectoryLoad = null;
      });

    this.institutionDirectoryLoad = load;
    return load;
  }

  resolveInstitution(name: string): Institution | null {
    // TODO(api): bind institution lookup to GET /api/institutions?q=.
    const normalizedName = name.trim().toLowerCase();
    return this.institutions().find((institution) => (
      institution.name.toLowerCase() === normalizedName
    )) ?? null;
  }

  supportsEmailVerification(institution: Institution | null): boolean {
    return institution?.domains.some((domain) => this.isInstitutionDomain(domain.trim().toLowerCase())) ?? false;
  }

  isAllowedDomain(email: string, institution: Institution | null): boolean {
    // Departmental/campus subdomains such as @pilani.bits-pilani.ac.in and
    // @cse.iitb.ac.in are why this accepts descendants. This is a UX affordance;
    // the server must re-check the domain before approving verification.
    if (!institution || !this.supportsEmailVerification(institution)) return false;
    const normalizedEmail = email.trim();
    if (/\s/.test(normalizedEmail)) return false;
    const atIndex = normalizedEmail.lastIndexOf('@');
    if (
      atIndex < 1
      || atIndex !== normalizedEmail.indexOf('@')
      || atIndex === normalizedEmail.length - 1
    ) return false;

    const domain = normalizedEmail.slice(atIndex + 1).trim().toLowerCase();
    if (this.hasInvalidDomain(domain)) return false;

    return institution.domains.some((allowedDomain) => {
      const allowed = allowedDomain.trim().toLowerCase();
      if (!this.isInstitutionDomain(allowed)) return false;
      return domain === allowed || domain.endsWith(`.${allowed}`);
    });
  }

  private mergeInstitutions(generated: readonly Institution[]): readonly Institution[] {
    const byId = new Map<string, Institution>();
    for (const institution of generated) {
      byId.set(institution.id, {
        ...institution,
        domains: this.normalizeDomains(institution.domains),
      });
    }

    // Fixtures are the compatibility layer: they win the collision's name and
    // retain their known fields, while domains and generated rorId are unioned.
    for (const fixture of STUDENT_VERIFICATION_INSTITUTIONS) {
      const generatedInstitution = byId.get(fixture.id);
      byId.set(fixture.id, generatedInstitution
        ? {
          ...generatedInstitution,
          ...fixture,
          domains: this.unionDomains(generatedInstitution.domains, fixture.domains),
        }
        : {
          ...fixture,
          domains: this.normalizeDomains(fixture.domains),
        });
    }

    return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name));
  }

  private normalizeDomains(domains: readonly string[]): readonly string[] {
    return this.unionDomains(domains, []);
  }

  private unionDomains(first: readonly string[], second: readonly string[]): readonly string[] {
    const unique = new Set<string>();
    for (const domain of [...first, ...second]) {
      const normalized = domain.trim().toLowerCase();
      if (this.isInstitutionDomain(normalized)) unique.add(normalized);
    }
    return [...unique];
  }

  private isInstitutionDomain(domain: string): boolean {
    return domain.includes('.')
      && !this.hasInvalidDomain(domain)
      && !INDIA_PUBLIC_SUFFIXES.has(domain);
  }

  private hasInvalidDomain(domain: string): boolean {
    return domain.split('.').some((label) => (
      label.length === 0
      || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
    ));
  }

  updateMethodDraft(draft: VerificationMethodDraft): void {
    this._methodDraft.set(this.cloneMethodDraft(draft));
    this.replaceCurrentSnapshot();
  }

  updateOtpDraft(draft: VerificationOtpDraft): void {
    this._otpDraft.set({ digits: [...draft.digits], invalid: draft.invalid });
    this.replaceCurrentSnapshot();
  }

  submit(request: StudentVerificationRequest): void {
    // TODO(api): bind submission to POST /api/student-verification; document uploads use POST /api/student-verification/upload-url first.
    this.clearCheckTimer();
    this.clearResendTimer();
    this.clearOtpTimer();
    this.clearCheckState();
    this._resendIn.set(0);
    this.resendAvailableAt = null;
    if (this.history().length === 0) this.navigate('collecting', null);
    this._request.set({ ...request });
    if (this.isEmptyMethodDraft(this._methodDraft())) {
      this._methodDraft.set(this.methodDraftFromRequest(request));
    }
    this.activeRequestId = this.createRequestId();
    this._otpTarget.set(request.institutionalEmail ?? '');
    this._otpDraft.set({ digits: ['', '', '', '', '', ''], invalid: false });
    this.replaceCurrentSnapshot();

    if (request.method === 'email') {
      this.navigate('emailSent', null);
      this.startOtpWindow();
      this.replaceCurrentSnapshot();
      return;
    }

    this.prepareCheck(request.method);
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

    this._otpDraft.set({ digits: Array.from(code), invalid: false });
    this.clearOtpTimer();
    this.clearResendTimer();
    this.prepareCheck('email');
    this.navigate('checking', null);
    this.scheduleFixtureResolution('email');
  }

  resendCode(): void {
    // TODO(api): bind OTP resend to POST /api/student-verification/confirm.
    if (!this.canResend()) return;

    this.clearCheckTimer();
    this.clearCheckState();
    this.clearOtpTimer();
    if (this.simulatedOutcome() === 'otpExpired') this.simulatedOutcome.set('approved');
    this.navigate('emailSent', null);
    this.startOtpWindow();
    this.replaceCurrentSnapshot();
  }

  requestManualReview(): void {
    // TODO(api): bind manual escalation to POST /api/student-verification/review.
    const request = this.request();
    if (!request) return;

    this.clearCheckTimer();
    this.clearResendTimer();
    this.clearOtpTimer();
    this.clearCheckState();
    this.otpExpiresAt = null;
    this.resendAvailableAt = null;
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
    this.clearCheckState();
    if (request.method === 'email') {
      this.navigate('emailSent', null);
      this.startOtpWindow();
      this.replaceCurrentSnapshot();
      return;
    }

    this.prepareCheck(request.method);
    this.navigate('checking', null);
    this.scheduleFixtureResolution(request.method);
  }

  reset(): void {
    // TODO(api): bind restored verification state to GET /api/student-verification/status.
    this.clearCheckTimer();
    this.clearResendTimer();
    this.clearOtpTimer();
    this.clearCheckState();
    this.otpExpiresAt = null;
    this.resendAvailableAt = null;
    this.checkDeadline = null;
    this.checkPhase = null;
    this.checkMethod = null;
    this.history.set([]);
    this.historyCursor.set(-1);
    this._status.set('idle');
    this._result.set(null);
    this._request.set(null);
    this.activeRequestId = null;
    this._verifiedResult.set(null);
    this._methodDraft.set(this.emptyMethodDraft());
    this._otpDraft.set({ digits: ['', '', '', '', '', ''], invalid: false });
    this._resendIn.set(0);
    this._otpTarget.set('');
  }

  goToCollecting(): void {
    // TODO(api): bind draft restoration to GET /api/student-verification/status.
    this.clearCheckTimer();
    this.clearResendTimer();
    this.clearOtpTimer();
    this.clearCheckState();
    this.otpExpiresAt = null;
    this.resendAvailableAt = null;
    this.checkDeadline = null;
    this.checkPhase = null;
    this.checkMethod = null;
    this.navigate('collecting', null);
  }

  goBack(): void {
    if (!this.canGoBack()) return;
    if (this._status() === 'checking') this.pauseCurrentCheck();
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
    if (result?.status === 'approved') this._verifiedResult.set(result);

    const nextHistory = this.history().slice(0, this.historyCursor() + 1);
    nextHistory.push(this.captureSnapshot());
    this.history.set(nextHistory);
    this.historyCursor.set(nextHistory.length - 1);
  }

  private replaceCurrentSnapshot(): void {
    const cursor = this.historyCursor();
    if (cursor < 0 || cursor >= this.history().length) return;
    const entries = [...this.history()];
    entries[cursor] = this.captureSnapshot();
    this.history.set(entries);
  }

  private captureSnapshot(): VerificationHistorySnapshot {
    return {
      status: this._status(),
      result: this._result(),
      request: this._request() ? { ...this._request()! } : null,
      methodDraft: this.cloneMethodDraft(this._methodDraft()),
      otpDraft: { digits: [...this._otpDraft().digits], invalid: this._otpDraft().invalid },
      otpTarget: this._otpTarget(),
      otpExpiresAt: this.otpExpiresAt,
      resendAvailableAt: this.resendAvailableAt,
      checkDeadline: this.checkDeadline,
      checkPhase: this.checkPhase,
      checkMethod: this.checkMethod,
      requestId: this.activeRequestId,
      simulatedOutcome: this.simulatedOutcome(),
    };
  }

  private restoreSnapshot(snapshot: VerificationHistorySnapshot): void {
    this.clearCheckTimer();
    this.clearResendTimer();
    this.clearOtpTimer();
    this._status.set(snapshot.status);
    this._result.set(snapshot.result);
    if (snapshot.result?.status === 'approved') this._verifiedResult.set(snapshot.result);
    this._request.set(snapshot.request ? { ...snapshot.request } : null);
    this._methodDraft.set(this.cloneMethodDraft(snapshot.methodDraft));
    this._otpDraft.set({ digits: [...snapshot.otpDraft.digits], invalid: snapshot.otpDraft.invalid });
    this._otpTarget.set(snapshot.otpTarget);
    this.activeRequestId = snapshot.requestId;
    this.simulatedOutcome.set(snapshot.simulatedOutcome);
    this.otpExpiresAt = snapshot.otpExpiresAt;
    this.resendAvailableAt = snapshot.resendAvailableAt;
    this.checkDeadline = snapshot.checkDeadline;
    this.checkPhase = snapshot.checkPhase;
    this.checkMethod = snapshot.checkMethod;
    this._resendIn.set(this.remainingResend());

    if (snapshot.status === 'emailSent') this.restoreOtpTimers();
    if (snapshot.status === 'checking' && snapshot.checkPhase !== 'settled') {
      // A check paused by Back starts a new local fixture attempt on Forward.
      // The old deadline is intentionally discarded so time spent browsing
      // history cannot resolve the restored check immediately.
      if (snapshot.checkPhase === 'paused' && this.checkMethod !== null) {
        this.prepareCheck(this.checkMethod);
      } else {
        this.checkPhase = 'pending';
      }
      this.restoreCheckTimer();
    }
  }

  private pauseCurrentCheck(): void {
    if (this.checkPhase !== 'pending') return;
    this.checkPhase = 'paused';
    this.checkDeadline = null;
    this.clearCheckTimer();
    this.replaceCurrentSnapshot();
  }

  private prepareCheck(method: VerificationMethod): void {
    const request = this.request();
    if (!request) return;
    const tokenLength = method === 'email'
      ? (request.institutionalEmail?.length ?? 0)
      : (request.documentName?.length ?? 0);
    this.checkMethod = method;
    this.checkDeadline = Date.now() + FIXTURE_CHECK_DELAY_MS + (tokenLength % 60);
    this.checkPhase = 'pending';
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
    if (!request || this.checkDeadline === null) return;
    const expectedCursor = this.historyCursor();
    const expectedRequestId = this.activeRequestId;
    const delay = Math.max(0, this.checkDeadline - Date.now());
    this.checkTimer = setTimeout(() => {
      this.checkTimer = null;
      if (this.historyCursor() !== expectedCursor || this._status() !== 'checking' || this.activeRequestId !== expectedRequestId) return;
      this.checkPhase = 'settled';
      const requestId = this.currentRequestId();
      const result = createFixtureResult(this.simulatedOutcome(), requestId);
      if (!result) {
        // Resolution replaces checking entry. This keeps Back useful without
        // leaving a settled checking snapshot that can only show a spinner.
        this._status.set('error');
        this._result.set(null);
        this.replaceCurrentSnapshot();
        return;
      }

      this._status.set(this.statusForResult(result));
      this._result.set(result);
      if (result.status === 'approved') this._verifiedResult.set(result);
      // Keep one history entry for this attempt. Back returns to its prior
      // editable step; Forward restores this committed outcome exactly.
      this.replaceCurrentSnapshot();
    }, delay);
  }

  private restoreCheckTimer(): void {
    if (this.checkPhase === 'settled' || this.checkDeadline === null || this.checkMethod === null) return;
    this.scheduleFixtureResolution(this.checkMethod);
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

  private restoreOtpTimers(): void {
    const otpRemaining = this.otpExpiresAt === null ? 0 : Math.max(0, this.otpExpiresAt - Date.now());
    if (otpRemaining > 0) {
      this.otpTimer = setTimeout(() => {
        this.otpTimer = null;
        this.markOtpExpired();
      }, otpRemaining);
    } else {
      // Historical expiry must update current entry in place. Navigating would
      // append an entry and destroy any forward branch being browsed.
      this.expireRestoredOtp();
      return;
    }
    const resendRemaining = this.remainingResend();
    this._resendIn.set(resendRemaining);
    if (resendRemaining > 0) {
      this.resendTimer = setInterval(() => {
        const remaining = this.remainingResend();
        this._resendIn.set(remaining);
        if (remaining <= 0) this.clearResendTimer();
      }, 1000);
    }
  }

  private isOtpExpired(): boolean {
    return this.otpExpiresAt !== null && Date.now() >= this.otpExpiresAt;
  }

  private markOtpExpired(): void {
    this.clearCheckTimer();
    this.clearResendTimer();
    this.clearOtpTimer();
    this.clearCheckState();
    this._resendIn.set(0);
    this.resendAvailableAt = null;
    this.otpExpiresAt = null;
    const requestId = this.currentRequestId();
    const result = createFixtureResult('otpExpired', requestId);
    this.navigate('otpExpired', result);
  }

  private expireRestoredOtp(): void {
    this.clearCheckState();
    this._resendIn.set(0);
    this.resendAvailableAt = null;
    this.otpExpiresAt = null;
    const requestId = this.currentRequestId();
    const result = createFixtureResult('otpExpired', requestId);
    this._status.set('otpExpired');
    this._result.set(result);
    this.replaceCurrentSnapshot();
  }

  private startResendCooldown(): void {
    this.clearResendTimer();
    this.resendAvailableAt = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
    this._resendIn.set(RESEND_COOLDOWN_SECONDS);
    this.resendTimer = setInterval(() => {
      const remaining = this.remainingResend();
      this._resendIn.set(remaining);
      if (remaining <= 0) this.clearResendTimer();
    }, 1000);
  }

  private remainingResend(): number {
    if (this.resendAvailableAt === null) return 0;
    return Math.max(0, Math.ceil((this.resendAvailableAt - Date.now()) / 1000));
  }

  private emptyMethodDraft(): VerificationMethodDraft {
    return {
      institutionName: '',
      method: 'email',
      institutionalEmail: '',
      document: null,
      consentAccepted: false,
      submittedAttempt: false,
      touched: { institutionName: false, method: false, institutionalEmail: false, document: false, consentAccepted: false },
      dirty: { institutionName: false, method: false, institutionalEmail: false, document: false, consentAccepted: false },
    };
  }

  private methodDraftFromRequest(request: StudentVerificationRequest): VerificationMethodDraft {
    const draft = this.emptyMethodDraft();
    return {
      ...draft,
      institutionName: request.institutionName,
      method: request.method,
      institutionalEmail: request.institutionalEmail ?? '',
      consentAccepted: request.consentAccepted,
    };
  }

  private isEmptyMethodDraft(draft: VerificationMethodDraft): boolean {
    return draft.institutionName === ''
      && draft.institutionalEmail === ''
      && draft.document === null
      && draft.consentAccepted === false
      && draft.submittedAttempt === false
      && !Object.values(draft.touched).some(Boolean)
      && !Object.values(draft.dirty).some(Boolean);
  }

  private cloneMethodDraft(draft: VerificationMethodDraft): VerificationMethodDraft {
    return {
      ...draft,
      touched: { ...draft.touched },
      dirty: { ...draft.dirty },
    };
  }

  private clearCheckState(): void {
    this.checkDeadline = null;
    this.checkPhase = null;
    this.checkMethod = null;
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
