import {
  Institution,
  SimulatedOutcome,
  StudentVerificationResult,
} from '../models/student-verification.model';

export const STUDENT_VERIFICATION_INSTITUTIONS: readonly Institution[] = [
  {
    id: 'jadavpur-university',
    name: 'Jadavpur University',
    domains: ['jadavpuruniversity.in'],
  },
  {
    id: 'university-of-calcutta',
    name: 'University of Calcutta',
    domains: ['caluniv.ac.in'],
  },
  {
    id: 'iit-kharagpur',
    name: 'IIT Kharagpur',
    domains: ['iitkgp.ac.in'],
  },
  {
    id: 'presidency-university',
    name: 'Presidency University',
    domains: ['presiuniv.ac.in'],
  },
] as const;

export const FIXTURE_OTP = '123456';
export const FIXTURE_CHECK_DELAY_MS = 240;
export const OTP_TTL_SECONDS = 10 * 60;
export const RESEND_COOLDOWN_SECONDS = 45;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
] as const;

export const MAX_DOCUMENT_SIZE_BYTES = 3 * 1024 * 1024;

export function isAllowedDocumentMimeType(mimeType: string): boolean {
  return (ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(mimeType.toLowerCase());
}

export function isAllowedDocumentSize(size: number): boolean {
  return Number.isFinite(size) && size >= 0 && size <= MAX_DOCUMENT_SIZE_BYTES;
}

export function isValidDocument(file: Pick<File, 'type' | 'size'>): boolean {
  return isAllowedDocumentMimeType(file.type) && isAllowedDocumentSize(file.size);
}

/** Fixture response factory. Replace this seam with the API response mapper. */
export function createFixtureResult(
  outcome: SimulatedOutcome,
  requestId: string,
  now = new Date(),
): StudentVerificationResult | null {
  switch (outcome) {
    case 'approved':
      return {
        requestId,
        status: 'approved',
        verifiedUntil: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      };
    case 'alreadyVerified':
      return {
        requestId,
        status: 'approved',
        verifiedUntil: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString(),
        reasonCode: 'already_verified',
      };
    case 'failed':
      return { requestId, status: 'rejected', reasonCode: 'not_enrolled' };
    case 'otpExpired':
      return { requestId, status: 'rejected', reasonCode: 'otp_expired' };
    case 'error':
      return null;
  }
}
