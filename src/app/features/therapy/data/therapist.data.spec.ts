import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTER_CRITERIA,
  filterTherapists,
  firstAvailableDay,
  GENDER_OPTIONS,
  hasAvailability,
  LANGUAGE_OPTIONS,
  THERAPISTS,
} from './therapist.data';

describe('therapist filtering data', () => {
  it('provides complete filter-ready data and derived options', () => {
    expect(THERAPISTS.length).toBeGreaterThanOrEqual(10);
    THERAPISTS.forEach((therapist) => {
      expect(therapist.gender).toBeTruthy();
      expect(therapist.sessionModes.length).toBeGreaterThan(0);
      expect(firstAvailableDay(therapist)).toBeDefined();
    });
    expect(LANGUAGE_OPTIONS).toContain('Bengali');
    expect(LANGUAGE_OPTIONS).toContain('Tamil');
    expect(LANGUAGE_OPTIONS).toContain('Kannada');
    expect(GENDER_OPTIONS.map((option) => option.value)).toEqual(['female', 'male', 'non-binary']);
  });

  it('narrows by availability, gender, and language', () => {
    const today = new Date();
    const availability = filterTherapists(THERAPISTS, { ...DEFAULT_FILTER_CRITERIA, availability: 'today' }, today);
    const gender = filterTherapists(THERAPISTS, { ...DEFAULT_FILTER_CRITERIA, genders: ['non-binary'] }, today);
    const language = filterTherapists(THERAPISTS, { ...DEFAULT_FILTER_CRITERIA, languages: ['Kannada'] }, today);

    expect(availability.length).toBeGreaterThan(0);
    expect(availability.length).toBeLessThan(THERAPISTS.length);
    expect(availability.every((therapist) => hasAvailability(therapist, 'today', today))).toBe(true);
    expect(gender.length).toBeGreaterThan(0);
    expect(gender.length).toBeLessThan(THERAPISTS.length);
    expect(gender.every((therapist) => therapist.gender === 'non-binary')).toBe(true);
    expect(language.map((therapist) => therapist.id)).toEqual(['vishal-naik', 'kavya-reddy']);
  });

  it('normalizes supplied dates and narrows week and weekend availability', () => {
    const todayWithTime = new Date();
    todayWithTime.setHours(18, 45, 0, 0);
    const today = filterTherapists(THERAPISTS, { ...DEFAULT_FILTER_CRITERIA, availability: 'today' }, todayWithTime);
    const week = filterTherapists(THERAPISTS, { ...DEFAULT_FILTER_CRITERIA, availability: 'week' }, todayWithTime);
    const weekend = filterTherapists(THERAPISTS, { ...DEFAULT_FILTER_CRITERIA, availability: 'weekend' }, todayWithTime);

    expect(today.map((therapist) => therapist.id)).toContain('gargi-yadav');
    expect(week.length).toBeLessThan(THERAPISTS.length);
    expect(week.every((therapist) => hasAvailability(therapist, 'week', todayWithTime))).toBe(true);
    expect(weekend.length).toBeGreaterThan(0);
    expect(weekend.length).toBeLessThan(THERAPISTS.length);
  });

  it('uses OR logic for selected languages and AND logic across criteria', () => {
    const languages = filterTherapists(THERAPISTS, { ...DEFAULT_FILTER_CRITERIA, languages: ['Bengali', 'Kannada'] });
    const combined = filterTherapists(THERAPISTS, {
      ...DEFAULT_FILTER_CRITERIA,
      genders: ['female'],
      languages: ['Bengali'],
      minRating: 4.5,
      sessionMode: 'Chat',
    });

    expect(languages.map((therapist) => therapist.id)).toEqual(expect.arrayContaining(['yukta-bansal', 'meera-sen', 'vishal-naik', 'kavya-reddy']));
    expect(combined.map((therapist) => therapist.id)).toEqual(['meera-sen']);
  });
});
