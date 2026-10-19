import { describe, expect, it } from 'vitest';
import { safeReturnUrl } from './safe-return-url';

describe('safeReturnUrl', () => {
  it.each(['/home', '/experts/123?tab=calm#details', '/home?next=%2Fprofile'])
    ('accepts internal URL %s', (value) => expect(safeReturnUrl(value)).toBe(value));

  it.each(['//evil.example', '/\\\\evil', '/%2f%2fevil', '/%5C%5Cevil', 'http://evil.example', 'javascript:alert(1)', '/%zz',
    '/auth/identify', '/auth/identify?returnUrl=%2Fhome', '/auth/login', '/auth/login/', '/auth/login#x', '/AUTH/Login', '/auth/%6Cogin'])
    ('rejects unsafe URL %s', (value) => expect(safeReturnUrl(value)).toBeNull());

  it.each(['/auth/loginx', '/authors', '/home?next=/auth/login'])
    ('still accepts non-auth-entry URL %s', (value) => expect(safeReturnUrl(value)).toBe(value));
});
