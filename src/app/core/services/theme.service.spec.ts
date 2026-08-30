// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { isDarkHour } from './theme.service';

describe('auto theme schedule', () => {
  it('uses light mode from 06:00 to 19:59 local time', () => {
    for (const hour of [6, 7, 12, 18, 19]) {
      expect(isDarkHour(hour)).toBe(false);
    }
  });

  it('uses dark mode from 20:00 to 05:59 local time', () => {
    for (const hour of [20, 21, 23, 0, 3, 5]) {
      expect(isDarkHour(hour)).toBe(true);
    }
  });

  it('switches exactly at the boundary hours', () => {
    expect(isDarkHour(5)).toBe(true);
    expect(isDarkHour(6)).toBe(false);
    expect(isDarkHour(19)).toBe(false);
    expect(isDarkHour(20)).toBe(true);
  });
});
