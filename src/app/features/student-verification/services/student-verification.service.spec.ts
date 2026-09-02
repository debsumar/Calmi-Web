import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentVerificationRequest } from '../models/student-verification.model';
import { FIXTURE_CHECK_DELAY_MS, OTP_TTL_SECONDS, RESEND_COOLDOWN_SECONDS } from './student-verification.fixtures';
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
    TestBed.configureTestingModule({ providers: [StudentVerificationService] });
    service = TestBed.inject(StudentVerificationService);
    vi.useFakeTimers();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('resolves institutions and checks exact institutional domains', () => {
    const institution = service.resolveInstitution(' jadavpur university ');

    expect(institution?.id).toBe('jadavpur-university');
    expect(service.isAllowedDomain('student@jadavpuruniversity.in', institution)).toBe(true);
    expect(service.isAllowedDomain('student@example.com', institution)).toBe(false);
    expect(service.isAllowedDomain('not-an-email', institution)).toBe(false);
    expect(service.isAllowedDomain('student@jadavpuruniversity.in', null)).toBe(false);
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
