export type VerificationMethod = 'email' | 'document';

export type VerificationStatus =
  | 'idle' | 'collecting' | 'emailSent' | 'checking'
  | 'approved' | 'failed' | 'manualPending' | 'error'
  | 'otpExpired' | 'alreadyVerified';

export type VerificationReasonCode =
  | 'domain_mismatch' | 'unreadable_document' | 'not_enrolled' | 'provider_unavailable'
  | 'otp_expired' | 'already_verified' | 'conflict' | 'rate_limited';

export interface Institution {
  id: string;
  name: string;
  domains: readonly string[];
}

export interface StudentVerificationRequest {
  institutionId: string;
  institutionName: string;
  method: VerificationMethod;
  institutionalEmail?: string;
  documentName?: string;
  consentAccepted: boolean;
}

export interface VerificationMethodDraft {
  institutionName: string;
  method: VerificationMethod;
  institutionalEmail: string;
  document: File | null;
  consentAccepted: boolean;
  submittedAttempt: boolean;
  touched: Record<'institutionName' | 'method' | 'institutionalEmail' | 'document' | 'consentAccepted', boolean>;
  dirty: Record<'institutionName' | 'method' | 'institutionalEmail' | 'document' | 'consentAccepted', boolean>;
}

export interface VerificationOtpDraft {
  digits: string[];
  invalid: boolean;
}

export interface VerificationApproved {
  requestId: string;
  status: 'approved';
  verifiedUntil: string;
  reasonCode?: 'already_verified';
}

export interface VerificationRejected {
  requestId: string;
  status: 'rejected';
  reasonCode: VerificationReasonCode;
}

export interface VerificationPendingAutomated {
  requestId: string;
  status: 'pending';
  pendingKind: 'automated';
}

export interface VerificationPendingManual {
  requestId: string;
  status: 'pending';
  pendingKind: 'manual';
  supportTicketRef: string;
  submittedAt: string;
  expectedBy: string;
}

export type StudentVerificationResult =
  | VerificationApproved
  | VerificationRejected
  | VerificationPendingAutomated
  | VerificationPendingManual;

export type SimulatedOutcome = 'approved' | 'failed' | 'error' | 'otpExpired' | 'alreadyVerified';
