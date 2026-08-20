import { describe, expect, it } from 'vitest';
import { safeReturnUrl } from './safe-return-url';

describe('safeReturnUrl', () => {
  it.each(['/home', '/therapy/123?tab=calm#details', '/home?next=%2Fprofile'])
    ('accepts internal URL %s', (value) => expect(safeReturnUrl(value)).toBe(value));

  it.each(['//evil.example', '/\\\\evil', '/%2f%2fevil', '/%5C%5Cevil', 'http://evil.example', 'javascript:alert(1)', '/%zz'])
    ('rejects unsafe URL %s', (value) => expect(safeReturnUrl(value)).toBeNull());
});
