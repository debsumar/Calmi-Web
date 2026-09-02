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
  it('contains the preserved institutions and a broad Indian institution dataset', () => {
    const names = STUDENT_VERIFICATION_INSTITUTIONS.map(({ name }) => name);
    expect(names).toEqual(expect.arrayContaining([
      'Jadavpur University',
      'University of Calcutta',
      'IIT Kharagpur',
      'IIT (ISM) Dhanbad',
      'Presidency University',
      'IIT Bombay',
      'NIT Warangal',
      'BITS Pilani',
      'Indian Institute of Science',
      'University of Delhi',
      'Vellore Institute of Technology',
    ]));
    expect(STUDENT_VERIFICATION_INSTITUTIONS.length).toBeGreaterThan(80);
  });

  it('keeps institution ids unique and academic domains non-empty and lowercase', () => {
    const ids = STUDENT_VERIFICATION_INSTITUTIONS.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const institution of STUDENT_VERIFICATION_INSTITUTIONS) {
      expect(institution.id).not.toBe('');
      expect(institution.domains.length).toBeGreaterThan(0);
      for (const domain of institution.domains) {
        expect(domain).toMatch(/^[a-z0-9.-]+$/);
        expect(domain).toBe(domain.toLowerCase());
      }
    }

    expect(STUDENT_VERIFICATION_INSTITUTIONS.find(({ id }) => id === 'iit-ism-dhanbad')?.domains).toEqual(['iitism.ac.in']);
    expect(STUDENT_VERIFICATION_INSTITUTIONS.find(({ id }) => id === 'bits-pilani')?.domains).toEqual(expect.arrayContaining([
      'bits-pilani.ac.in',
      'pilani.bits-pilani.ac.in',
      'goa.bits-pilani.ac.in',
      'hyderabad.bits-pilani.ac.in',
    ]));
  });

  it('validates supported document MIME types and the three MB limit', () => {
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
