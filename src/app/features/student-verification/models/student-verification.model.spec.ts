import { describe, expect, it } from 'vitest';
import type {
  Institution,
  StudentVerificationRequest,
  StudentVerificationResult,
  VerificationApproved,
  VerificationPendingManual,
  VerificationRejected,
} from './student-verification.model';

describe('student verification model contract', () => {
  it('supports the frozen request and discriminated result shapes', () => {
    const institution: Institution = {
      id: 'jadavpur-university',
      name: 'Jadavpur University',
      domains: ['jadavpuruniversity.in'],
    };
    const request: StudentVerificationRequest = {
      institutionId: institution.id,
      institutionName: institution.name,
      method: 'email',
      institutionalEmail: 'student@jadavpuruniversity.in',
      consentAccepted: true,
    };
    const approved: VerificationApproved = {
      requestId: 'fixture-1',
      status: 'approved',
      verifiedUntil: '2027-09-01T00:00:00.000Z',
    };
    const rejected: VerificationRejected = {
      requestId: 'fixture-2',
      status: 'rejected',
      reasonCode: 'not_enrolled',
    };
    const manual: VerificationPendingManual = {
      requestId: 'fixture-3',
      status: 'pending',
      pendingKind: 'manual',
      supportTicketRef: 'SV-000003',
      submittedAt: '2026-09-01T00:00:00.000Z',
      expectedBy: '2026-09-03T00:00:00.000Z',
    };

    const results: StudentVerificationResult[] = [approved, rejected, manual];
    expect(request.method).toBe('email');
    expect(results.map((result) => result.status)).toEqual(['approved', 'rejected', 'pending']);
  });
});
