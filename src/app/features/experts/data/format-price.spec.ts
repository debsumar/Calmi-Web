import { describe, expect, it } from 'vitest';
import { formatRupees } from './format-price';

describe('formatRupees', () => {
  it.each([
    [0, '₹0'],
    [999, '₹999'],
    [2000, '₹2,000'],
    [125000, '₹1,25,000'],
  ])('formats %i as %s', (amount, expected) => {
    expect(formatRupees(amount)).toBe(expected);
  });

  it('never prints NaN', () => {
    expect(formatRupees(Number.NaN)).toBe('₹0');
  });
});
