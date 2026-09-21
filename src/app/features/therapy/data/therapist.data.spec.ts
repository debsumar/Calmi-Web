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
    expect(LANGUAGE_OPTIONS).toContain('Punjabi');
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

  it('includes supplied therapist profiles with real weekday availability', () => {
    const addedTherapists = THERAPISTS.filter((therapist) => ['pavneet-kaur', 'neena-pareek', 'rini-rao'].includes(therapist.id));
    const pavneet = addedTherapists.find((therapist) => therapist.id === 'pavneet-kaur');
    const neena = addedTherapists.find((therapist) => therapist.id === 'neena-pareek');
    const availableWeekdays = (therapist: typeof pavneet) => (therapist?.availability ?? [])
      .filter((day) => day.state === 'available')
      .map((day) => new Date(`${day.date}T00:00:00`).getDay());

    expect(addedTherapists.map(({ id, image }) => ({ id, image }))).toEqual([
      { id: 'pavneet-kaur', image: 'assets/users/pavneet.avif' },
      { id: 'neena-pareek', image: 'assets/users/neena.avif' },
      { id: 'rini-rao', image: 'assets/users/rini.avif' },
    ]);
    expect(pavneet?.bio.startsWith('I am a Counselling Psychologist')).toBe(true);
    expect(neena?.bio.startsWith('I am a Reiki Healer')).toBe(true);
    expect(addedTherapists.find((therapist) => therapist.id === 'rini-rao')?.bio.startsWith('I help couples')).toBe(true);
    expect(THERAPISTS.find((therapist) => therapist.id === 'gargi-yadav')?.bio.startsWith('Gargi Yadav creates a calm')).toBe(true);
    expect(availableWeekdays(pavneet).filter((weekday) => weekday === 0 || weekday === 6)).toHaveLength(0);
    expect(availableWeekdays(neena).filter((weekday) => weekday === 0)).toHaveLength(0);
    expect(availableWeekdays(neena).filter((weekday) => weekday === 6).length).toBeGreaterThan(0);
  });

  it('lists the newly added therapists first and keeps their booking fields', () => {
    expect(THERAPISTS.slice(0, 4).map((therapist) => therapist.id)).toEqual(['pavneet-kaur', 'neena-pareek', 'rini-rao', 'isha-attri']);
    expect(THERAPISTS[4]?.id).toBe('gargi-yadav');
    expect(THERAPISTS.slice(0, 4).map(({ price, experienceYears, duration, sessionModes, languages }) => ({ price, experienceYears, duration, sessionModes, languages }))).toEqual([
      { price: 1500, experienceYears: 2, duration: '45 mins', sessionModes: ['Video'], languages: ['English', 'Hindi', 'Punjabi'] },
      { price: 1000, experienceYears: 15, duration: '45 mins', sessionModes: ['Video'], languages: ['Hindi'] },
      { price: 1500, experienceYears: 6, duration: '45 mins', sessionModes: ['Video'], languages: ['English', 'Hindi'] },
      { price: 1500, experienceYears: 1, duration: '60 mins', sessionModes: ['Video'], languages: ['English', 'Hindi'] },
    ]);
  });

  it('keeps today bookable for the new therapists when today is one of their working days', () => {
    const today = new Date();
    const todayKey = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
    const workingDays: Record<string, readonly number[]> = {
      'pavneet-kaur': [1, 2, 3, 4, 5],
      'neena-pareek': [1, 2, 3, 4, 5, 6],
      'rini-rao': [1, 2, 3, 4, 5, 6],
      'isha-attri': [1, 2, 3, 4, 5],
    };

    THERAPISTS.slice(0, 4).forEach((therapist) => {
      const todayEntry = therapist.availability.find((day) => day.date === todayKey);
      const expected = workingDays[therapist.id]?.includes(today.getDay()) ? 'available' : 'unavailable';
      expect(todayEntry?.state).toBe(expected);
    });
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

    expect(languages.map((therapist) => therapist.id)).toEqual(expect.arrayContaining(['meera-sen', 'vishal-naik', 'kavya-reddy']));
    expect(languages.map((therapist) => therapist.id)).not.toContain('yukta-bansal');
    // Yukta does not speak Bengali, so the language must be absent at the source too.
    expect(THERAPISTS.find((therapist) => therapist.id === 'yukta-bansal')?.languages).toEqual(['English', 'Hindi']);
    expect(combined.map((therapist) => therapist.id)).toEqual(['meera-sen']);
  });
});
