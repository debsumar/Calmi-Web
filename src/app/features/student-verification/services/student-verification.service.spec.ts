import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Institution, StudentVerificationRequest } from '../models/student-verification.model';
import { FIXTURE_CHECK_DELAY_MS, OTP_TTL_SECONDS, RESEND_COOLDOWN_SECONDS, STUDENT_VERIFICATION_INSTITUTIONS } from './student-verification.fixtures';
import { INSTITUTION_DIRECTORY_LOADER, InstitutionDirectoryLoader } from './institution-directory.loader';

/**
 * The generated directory is injected rather than module-mocked: the Angular
 * unit-test system rejects `vi.mock()` on relative imports and points at TestBed.
 */
const directoryMock: { shouldFail: boolean; institutions: readonly Institution[] } = {
  shouldFail: false,
  institutions: [
    {
      id: 'jadavpur-university',
      name: 'Generated Jadavpur University',
      domains: ['jadavpur.edu'],
      rorId: 'ror-jadavpur',
    },
    {
      id: 'ror-only-university',
      name: 'ROR Only University',
      domains: [],
      rorId: 'ror-only',
    },
    {
      id: 'generated-only-university',
      name: 'Generated Only University',
      domains: ['generated.example'],
    },
    {
      id: 'generated-public-suffix',
      name: 'Generated Public Suffix',
      domains: ['ac.in'],
    },
  ],
};

const directoryLoaderStub: InstitutionDirectoryLoader = () => (
  directoryMock.shouldFail
    ? Promise.reject(new Error('generated directory unavailable'))
    : Promise.resolve({ GENERATED_INSTITUTIONS: directoryMock.institutions })
);

import { StudentVerificationService } from './student-verification.service';

describe('StudentVerificationService', () => {
  let service: StudentVerificationService;
  const emailRequest: StudentVerificationRequest = {
    institutionId: 'jadavpur-university',
    institutionName: 'Jadavpur University',
    method: 'email',
    institutionalEmail: 'student@jadavpuruniversity.in',
    consentAccepted: true,
  };
  const documentRequest: StudentVerificationRequest = {
    institutionId: 'iit-kharagpur',
    institutionName: 'IIT Kharagpur',
    method: 'document',
    documentName: 'student-id.pdf',
    consentAccepted: true,
  };

  beforeEach(() => {
    directoryMock.shouldFail = false;
    TestBed.configureTestingModule({
      providers: [
        StudentVerificationService,
        { provide: INSTITUTION_DIRECTORY_LOADER, useValue: directoryLoaderStub },
      ],
    });
    service = TestBed.inject(StudentVerificationService);
    vi.useFakeTimers();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('resolves institutions and checks exact and departmental institutional domains', () => {
    const institution = service.resolveInstitution(' jadavpur university ');

    expect(institution?.id).toBe('jadavpur-university');
    expect(service.isAllowedDomain('student@jadavpuruniversity.in', institution)).toBe(true);
    expect(service.isAllowedDomain('student@example.com', institution)).toBe(false);
    expect(service.isAllowedDomain('not-an-email', institution)).toBe(false);
    expect(service.isAllowedDomain('student@jadavpuruniversity.in', null)).toBe(false);

    const iitBombay = service.resolveInstitution('IIT Bombay');
    expect(service.supportsEmailVerification(iitBombay)).toBe(true);
    expect(service.supportsEmailVerification({ id: 'ror-only', name: 'ROR Only', domains: [] })).toBe(false);
    expect(service.supportsEmailVerification({ id: 'suffix', name: 'Suffix', domains: ['ac.in'] })).toBe(false);
    expect(service.isAllowedDomain('student@cse.iitb.ac.in', iitBombay)).toBe(true);
    expect(service.isAllowedDomain('student@iitb.ac.in', iitBombay)).toBe(true);
  });

  it('rejects malformed, lookalike, and sibling domains while normalizing uppercase independent of locale', () => {
    const iitBombay = service.resolveInstitution('IIT Bombay');

    const cases = [
      ['student@CSE.IITB.AC.IN', true],
      ['student@iitb.ac.in.', false],
      ['student@evil-iitb.ac.in', false],
      ['student@xn--iitb-9za.ac.in', false],
      ['student@cse.iіtb.ac.in', false],
      ['student@first@iitb.ac.in', false],
      ['student@@iitb.ac.in', false],
    ] as const;

    for (const [email, expected] of cases) {
      expect(service.isAllowedDomain(email, iitBombay)).toBe(expected);
    }
  });

  it('rejects bare public suffixes and malformed domain labels', () => {
    const institution = { id: 'suffix', name: 'Suffix University', domains: ['com', 'example..edu'] };

    expect(service.isAllowedDomain('student@com', institution)).toBe(false);
    expect(service.isAllowedDomain('student@university.com', institution)).toBe(false);
    expect(service.isAllowedDomain('student@example.edu', institution)).toBe(false);
    expect(service.isAllowedDomain('student@.example.edu', { ...institution, domains: ['example.edu'] })).toBe(false);
    expect(service.isAllowedDomain('student@dept..example.edu', { ...institution, domains: ['example.edu'] })).toBe(false);
    expect(service.isAllowedDomain('student@ac.in', { ...institution, domains: ['ac.in'] })).toBe(false);
    expect(service.isAllowedDomain('student@evil.ac.in', { ...institution, domains: ['ac.in'] })).toBe(false);
  });

  it('loads and merges the generated directory once, with fixture precedence and sorted names', async () => {
    const firstLoad = service.loadInstitutionDirectory();
    const secondLoad = service.loadInstitutionDirectory();

    expect(firstLoad).toBe(secondLoad);
    expect(service.institutionDirectoryStatus()).toBe('loading');
    await firstLoad;

    expect(service.institutionDirectoryStatus()).toBe('loaded');
    const jadavpur = service.resolveInstitution('Jadavpur University');
    expect(jadavpur?.name).toBe('Jadavpur University');
    expect(jadavpur?.rorId).toBe('ror-jadavpur');
    expect(jadavpur?.domains).toEqual(expect.arrayContaining(['jadavpur.edu', 'jadavpuruniversity.in']));
    expect(service.resolveInstitution('Generated Only University')?.domains).toEqual(['generated.example']);
    expect(service.resolveInstitution('Generated Public Suffix')?.domains).toEqual([]);
    expect(service.resolveInstitution('ROR Only University')?.domains).toEqual([]);
    expect(service.institutions().map(({ name }) => name)).toEqual(
      [...service.institutions()].map(({ name }) => name).sort((left, right) => left.localeCompare(right)),
    );
  });

  it('rejects email eligibility for a searchable institution without domains', async () => {
    await service.loadInstitutionDirectory();
    const institution = service.resolveInstitution('ROR Only University');

    expect(institution).not.toBeNull();
    expect(service.isAllowedDomain('student@ror-only.example', institution)).toBe(false);
  });

  it('falls back to fixtures and logs one import failure', async () => {
    directoryMock.shouldFail = true;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await service.loadInstitutionDirectory();
    await service.loadInstitutionDirectory();

    expect(service.institutionDirectoryStatus()).toBe('failed');
    expect(service.institutions()).toBe(STUDENT_VERIFICATION_INSTITUTIONS);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });

  it('sends email proof, checks a six-digit code, and resolves the fixture', () => {
    service.submit(emailRequest);

    expect(service.status()).toBe('emailSent');
    expect(service.otpTarget()).toBe(emailRequest.institutionalEmail);
    expect(service.resendIn()).toBe(RESEND_COOLDOWN_SECONDS);
    expect(service.canUseStudentPlan()).toBe(false);

    service.confirmCode('12345');
    expect(service.status()).toBe('emailSent');

    service.confirmCode('123456');
    expect(service.status()).toBe('checking');
    vi.advanceTimersByTime(FIXTURE_CHECK_DELAY_MS + emailRequest.institutionalEmail!.length);

    expect(service.status()).toBe('approved');
    expect(service.result()).toMatchObject({ status: 'approved' });
    expect(service.canUseStudentPlan()).toBe(true);
  });

  it('resolves document outcomes after a checking delay', () => {
    service.simulatedOutcome.set('failed');
    service.submit(documentRequest);

    expect(service.status()).toBe('checking');
    vi.advanceTimersByTime(FIXTURE_CHECK_DELAY_MS + documentRequest.documentName!.length);

    expect(service.status()).toBe('failed');
    expect(service.result()).toEqual({
      requestId: 'fixture-iit-kharagpur-1',
      status: 'rejected',
      reasonCode: 'not_enrolled',
    });
  });

  it('marks expired codes and allows resend after cooldown', () => {
    service.simulatedOutcome.set('otpExpired');
    service.submit(emailRequest);
    vi.advanceTimersByTime(RESEND_COOLDOWN_SECONDS * 1000);

    expect(service.canResend()).toBe(true);
    service.confirmCode('123456');

    expect(service.status()).toBe('otpExpired');
    expect(service.result()).toMatchObject({ status: 'rejected', reasonCode: 'otp_expired' });
    expect(service.canResend()).toBe(true);

    service.resendCode();
    expect(service.status()).toBe('emailSent');
    expect(service.simulatedOutcome()).toBe('approved');
    expect(service.resendIn()).toBe(RESEND_COOLDOWN_SECONDS);
  });

  it('maps already verified and service error fixture outcomes', () => {
    service.simulatedOutcome.set('alreadyVerified');
    service.submit(documentRequest);
    vi.advanceTimersByTime(FIXTURE_CHECK_DELAY_MS + documentRequest.documentName!.length);

    expect(service.status()).toBe('alreadyVerified');
    expect(service.canUseStudentPlan()).toBe(true);
    expect(service.result()).toMatchObject({ status: 'approved', reasonCode: 'already_verified' });

    service.simulatedOutcome.set('error');
    service.retry();
    vi.advanceTimersByTime(FIXTURE_CHECK_DELAY_MS + documentRequest.documentName!.length);
    expect(service.status()).toBe('error');
    expect(service.result()).toBeNull();
  });

  it('creates a manual review result and clears all state on reset', () => {
    service.submit(documentRequest);
    service.requestManualReview();

    expect(service.status()).toBe('manualPending');
    expect(service.result()).toMatchObject({
      status: 'pending',
      pendingKind: 'manual',
      supportTicketRef: 'SV-GPUR-1',
    });

    service.reset();
    expect(service.status()).toBe('idle');
    expect(service.request()).toBeNull();
    expect(service.result()).toBeNull();
    expect(service.resendIn()).toBe(0);
  });

  it('expires an email OTP automatically and clears its timer on reset', () => {
    service.submit(emailRequest);
    vi.advanceTimersByTime(OTP_TTL_SECONDS * 1000);

    expect(service.status()).toBe('otpExpired');

    service.submit(emailRequest);
    service.reset();
    vi.advanceTimersByTime(OTP_TTL_SECONDS * 1000);

    expect(service.status()).toBe('idle');
  });

  it('cleans the cooldown timer when reset is called', () => {
    service.submit(emailRequest);
    service.reset();
    vi.advanceTimersByTime(RESEND_COOLDOWN_SECONDS * 1000);

    expect(service.resendIn()).toBe(0);
    expect(service.canResend()).toBe(false);
  });

  it('tracks back and forward history while replacing transient checking with its outcome', () => {
    service.simulatedOutcome.set('failed');
    service.submit(documentRequest);
    expect(service.status()).toBe('checking');
    expect(service.canGoBack()).toBe(true);
    expect(service.canGoForward()).toBe(false);

    vi.advanceTimersByTime(FIXTURE_CHECK_DELAY_MS + documentRequest.documentName!.length);
    const failedResult = service.result();
    expect(service.status()).toBe('failed');
    expect(service.canGoBack()).toBe(true);

    service.goBack();
    expect(service.status()).toBe('collecting');
    expect(service.result()).toBeNull();
    expect(service.canGoBack()).toBe(false);
    expect(service.canGoForward()).toBe(true);

    service.goForward();
    expect(service.status()).toBe('failed');
    expect(service.result()).toEqual(failedResult);
    expect(service.canGoForward()).toBe(false);
  });

  it('cancels an in-flight check on Back and resumes it on Forward', () => {
    service.simulatedOutcome.set('failed');
    service.submit(documentRequest);

    expect(service.canGoBack()).toBe(true);
    service.goBack();
    expect(service.status()).toBe('collecting');
    vi.advanceTimersByTime(FIXTURE_CHECK_DELAY_MS + documentRequest.documentName!.length);
    expect(service.status()).toBe('collecting');

    service.goForward();
    expect(service.status()).toBe('checking');
    vi.advanceTimersByTime(FIXTURE_CHECK_DELAY_MS + documentRequest.documentName!.length);
    expect(service.status()).toBe('failed');
  });

  it('starts a fresh check after a paused check outlives its original deadline', () => {
    service.simulatedOutcome.set('failed');
    service.submit(documentRequest);
    service.goBack();

    // Browsing the earlier collecting step must cancel the old fixture timer.
    vi.advanceTimersByTime(FIXTURE_CHECK_DELAY_MS + documentRequest.documentName!.length + 5000);
    expect(service.status()).toBe('collecting');

    service.goForward();
    expect(service.status()).toBe('checking');
    vi.advanceTimersByTime(FIXTURE_CHECK_DELAY_MS + documentRequest.documentName!.length);
    expect(service.status()).toBe('failed');
  });

  it('truncates forward history after a new action', () => {
    service.simulatedOutcome.set('failed');
    service.submit(documentRequest);
    vi.advanceTimersByTime(FIXTURE_CHECK_DELAY_MS + documentRequest.documentName!.length);
    service.goBack();
    expect(service.canGoForward()).toBe(true);

    service.submit(emailRequest);
    expect(service.status()).toBe('emailSent');
    expect(service.canGoForward()).toBe(false);
  });

  it.each(['approved', 'alreadyVerified'] as const)('allows back and forward on committed %s outcome', (outcome) => {
    service.simulatedOutcome.set(outcome);
    service.submit(documentRequest);
    vi.advanceTimersByTime(FIXTURE_CHECK_DELAY_MS + documentRequest.documentName!.length);

    expect(service.canGoBack()).toBe(true);
    service.goBack();
    expect(service.status()).toBe('collecting');
    expect(service.canGoForward()).toBe(true);
    expect(service.canUseStudentPlan()).toBe(true);

    service.goForward();
    expect(service.status()).toBe(outcome);
    expect(service.canUseStudentPlan()).toBe(true);
  });

  it('restores request, OTP draft, target, and absolute resend and expiry deadlines', () => {
    service.submit(emailRequest);
    service.updateOtpDraft({ digits: ['1', '2', '3', '', '', ''], invalid: false });
    vi.advanceTimersByTime(5_000);
    const remainingResend = service.resendIn();

    service.goBack();
    expect(service.status()).toBe('collecting');
    expect(service.request()).toEqual(emailRequest);
    expect(service.otpTarget()).toBe(emailRequest.institutionalEmail);
    expect(service.otpDraft().digits).toEqual(['', '', '', '', '', '']);

    service.goForward();
    expect(service.status()).toBe('emailSent');
    expect(service.request()).toEqual(emailRequest);
    expect(service.otpTarget()).toBe(emailRequest.institutionalEmail);
    expect(service.otpDraft().digits).toEqual(['1', '2', '3', '', '', '']);
    expect(service.resendIn()).toBe(remainingResend);

    vi.advanceTimersByTime((OTP_TTL_SECONDS * 1000) - 5_000 - 1_000);
    expect(service.status()).toBe('emailSent');
    service.goBack();
    service.goForward();
    vi.advanceTimersByTime(1_000);
    expect(service.status()).toBe('otpExpired');
  });

  it('allows back from manual review and while checking', () => {
    service.submit(documentRequest);
    expect(service.status()).toBe('checking');
    expect(service.canGoBack()).toBe(true);

    service.goBack();
    expect(service.status()).toBe('collecting');
    service.goForward();
    expect(service.status()).toBe('checking');

    service.requestManualReview();
    expect(service.status()).toBe('manualPending');
    expect(service.canGoBack()).toBe(true);
  });

  it('clears OTP and resend timers on every history navigation path', () => {
    service.submit(emailRequest);
    expect(vi.getTimerCount()).toBe(2);

    service.goBack();
    expect(service.status()).toBe('collecting');
    expect(vi.getTimerCount()).toBe(0);

    service.goForward();
    expect(service.status()).toBe('emailSent');
    expect(service.resendIn()).toBe(RESEND_COOLDOWN_SECONDS);
    expect(vi.getTimerCount()).toBe(2);

    service.goBack();
    expect(vi.getTimerCount()).toBe(0);
    service.reset();
    expect(vi.getTimerCount()).toBe(0);
  });
});
