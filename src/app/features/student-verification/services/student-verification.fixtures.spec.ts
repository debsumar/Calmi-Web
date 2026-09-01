import { describe, expect, it } from 'vitest';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
  STUDENT_VERIFICATION_INSTITUTIONS,
  createFixtureResult,
  isAllowedDocumentMimeType,
  isAllowedDocumentSize,
  isValidDocument,
} from './student-verification.fixtures';

describe('student verification fixtures', () => {
  it('contains the four supported institutions and domains', () => {
    expect(STUDENT_VERIFICATION_INSTITUTIONS.map(({ name }) => name)).toEqual([
      'Jadavpur University',
      'University of Calcutta',
      'IIT Kharagpur',
      'Presidency University',
    ]);
    expect(STUDENT_VERIFICATION_INSTITUTIONS.map(({ domains }) => domains[0])).toEqual([
      'jadavpuruniversity.in',
      'caluniv.ac.in',
      'iitkgp.ac.in',
      'presiuniv.ac.in',
    ]);
  });

  it('validates supported document MIME types and the five MB limit', () => {
    expect(ALLOWED_DOCUMENT_MIME_TYPES).toEqual(['image/jpeg', 'image/png', 'application/pdf']);
    expect(isAllowedDocumentMimeType('IMAGE/PNG')).toBe(true);
    expect(isAllowedDocumentMimeType('text/plain')).toBe(false);
    expect(isAllowedDocumentSize(MAX_DOCUMENT_SIZE_BYTES)).toBe(true);
    expect(isAllowedDocumentSize(MAX_DOCUMENT_SIZE_BYTES + 1)).toBe(false);
    expect(isValidDocument({ type: 'application/pdf', size: MAX_DOCUMENT_SIZE_BYTES })).toBe(true);
    expect(isValidDocument({ type: 'application/pdf', size: MAX_DOCUMENT_SIZE_BYTES + 1 })).toBe(false);
  });

  it('creates the fixture result variants', () => {
    const now = new Date('2026-09-01T00:00:00.000Z');
    expect(createFixtureResult('approved', 'fixture-1', now)?.status).toBe('approved');
    expect(createFixtureResult('alreadyVerified', 'fixture-2', now)).toMatchObject({
      status: 'approved',
      reasonCode: 'already_verified',
    });
    expect(createFixtureResult('failed', 'fixture-3', now)).toEqual({
      requestId: 'fixture-3',
      status: 'rejected',
      reasonCode: 'not_enrolled',
    });
    expect(createFixtureResult('error', 'fixture-4', now)).toBeNull();
  });
});
