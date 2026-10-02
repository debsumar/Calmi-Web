import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTER_CRITERIA,
  filterExperts,
  firstAvailableDay,
  GENDER_OPTIONS,
  hasAvailability,
  LANGUAGE_OPTIONS,
  EXPERTS,
} from './expert.data';

describe('expert filtering data', () => {
  it('provides complete filter-ready data and derived options', () => {
    expect(EXPERTS.length).toBeGreaterThanOrEqual(10);
    EXPERTS.forEach((expert) => {
      expect(expert.gender).toBeTruthy();
      expect(expert.sessionModes.length).toBeGreaterThan(0);
      expect(firstAvailableDay(expert)).toBeDefined();
    });
    expect(LANGUAGE_OPTIONS).toContain('Tamil');
    expect(LANGUAGE_OPTIONS).toContain('Kannada');
    expect(LANGUAGE_OPTIONS).toContain('Punjabi');
    expect(GENDER_OPTIONS.map((option) => option.value)).toEqual(['female', 'male', 'non-binary']);
  });

  it('narrows by availability, gender, and language', () => {
    const today = new Date();
    const availability = filterExperts(EXPERTS, { ...DEFAULT_FILTER_CRITERIA, availability: 'today' }, today);
    const nonBinary = filterExperts(EXPERTS, { ...DEFAULT_FILTER_CRITERIA, genders: ['non-binary'] }, today);
    const female = filterExperts(EXPERTS, { ...DEFAULT_FILTER_CRITERIA, genders: ['female'] }, today);
    const language = filterExperts(EXPERTS, { ...DEFAULT_FILTER_CRITERIA, languages: ['Punjabi'] }, today);

    expect(availability.length).toBeGreaterThan(0);
    expect(availability.length).toBeLessThan(EXPERTS.length);
    expect(availability.every((expert) => hasAvailability(expert, 'today', today))).toBe(true);
    expect(nonBinary).toEqual([]);
    expect(female).toHaveLength(EXPERTS.length);
    expect(female.every((expert) => expert.gender === 'female')).toBe(true);
    expect(language.map((expert) => expert.id)).toEqual(['pavneet-kaur', 'manheer-kaur']);
  });

  it('normalizes supplied dates and excludes experts without week slots', () => {
    const todayWithTime = new Date();
    todayWithTime.setHours(18, 45, 0, 0);
    const noWeekSlots = {
      ...EXPERTS[0]!,
      id: 'no-week-slots',
      availability: EXPERTS[0]!.availability.map((day) => ({ ...day, state: 'unavailable' as const, slots: [] })),
    };
    const expertsWithNoWeekSlots = [...EXPERTS, noWeekSlots];
    const today = filterExperts(EXPERTS, { ...DEFAULT_FILTER_CRITERIA, availability: 'today' }, todayWithTime);
    const week = filterExperts(expertsWithNoWeekSlots, { ...DEFAULT_FILTER_CRITERIA, availability: 'week' }, todayWithTime);
    const weekend = filterExperts(EXPERTS, { ...DEFAULT_FILTER_CRITERIA, availability: 'weekend' }, todayWithTime);

    expect(today.map((expert) => expert.id)).toContain('gargi-yadav');
    expect(week.map((expert) => expert.id)).toEqual(EXPERTS.map((expert) => expert.id));
    expect(week.map((expert) => expert.id)).not.toContain('no-week-slots');
    expect(week.every((expert) => hasAvailability(expert, 'week', todayWithTime))).toBe(true);
    expect(weekend.length).toBeGreaterThan(0);
    expect(weekend.length).toBeLessThan(EXPERTS.length);
  });

  it('includes supplied expert profiles with real weekday availability', () => {
    const addedExperts = EXPERTS.filter((expert) => ['pavneet-kaur', 'neena-pareek', 'rini-rao'].includes(expert.id));
    const pavneet = addedExperts.find((expert) => expert.id === 'pavneet-kaur');
    const neena = addedExperts.find((expert) => expert.id === 'neena-pareek');
    const availableWeekdays = (expert: typeof pavneet) => (expert?.availability ?? [])
      .filter((day) => day.state === 'available')
      .map((day) => new Date(`${day.date}T00:00:00`).getDay());

    expect(addedExperts.map(({ id, image }) => ({ id, image }))).toEqual([
      { id: 'pavneet-kaur', image: 'assets/users/pavneet.avif' },
      { id: 'neena-pareek', image: 'assets/users/neena.avif' },
      { id: 'rini-rao', image: 'assets/users/rini.avif' },
    ]);
    expect(pavneet?.bio.startsWith('I am a Counselling Psychologist')).toBe(true);
    expect(neena?.bio.startsWith('I am a Reiki Healer')).toBe(true);
    expect(addedExperts.find((expert) => expert.id === 'rini-rao')?.bio.startsWith('I help couples')).toBe(true);
    expect(EXPERTS.find((expert) => expert.id === 'gargi-yadav')?.bio.startsWith('Gargi Yadav creates a calm')).toBe(true);
    expect(availableWeekdays(pavneet).filter((weekday) => weekday === 0 || weekday === 6)).toHaveLength(0);
    expect(availableWeekdays(neena).filter((weekday) => weekday === 0)).toHaveLength(0);
    expect(availableWeekdays(neena).filter((weekday) => weekday === 6).length).toBeGreaterThan(0);
  });

  it('lists the newly added experts first and keeps their booking fields', () => {
    expect(EXPERTS.slice(0, 4).map((expert) => expert.id)).toEqual(['pavneet-kaur', 'neena-pareek', 'rini-rao', 'isha-attri']);
    expect(EXPERTS.slice(4, 7).map((expert) => expert.id)).toEqual(['divyanshi-tolani', 'param-sambodhi', 'florentina-martin']);
    expect(EXPERTS.findIndex((expert) => expert.id === 'gargi-yadav')).toBe(11);
    expect(EXPERTS.slice(0, 4).map(({ price, experienceYears, duration, sessionModes, languages }) => ({ price, experienceYears, duration, sessionModes, languages }))).toEqual([
      { price: 1500, experienceYears: 2, duration: '45 mins', sessionModes: ['Video'], languages: ['English', 'Hindi', 'Punjabi'] },
      { price: 1000, experienceYears: 15, duration: '45 mins', sessionModes: ['Video'], languages: ['Hindi'] },
      { price: 1500, experienceYears: 6, duration: '45 mins', sessionModes: ['Video'], languages: ['English', 'Hindi'] },
      { price: 1500, experienceYears: 1, duration: '60 mins', sessionModes: ['Video'], languages: ['English', 'Hindi'] },
    ]);
  });

  it('keeps today bookable for the new experts when today is one of their working days', () => {
    const today = new Date();
    const todayKey = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
    const workingDays: Record<string, readonly number[]> = {
      'pavneet-kaur': [1, 2, 3, 4, 5],
      'neena-pareek': [1, 2, 3, 4, 5, 6],
      'rini-rao': [1, 2, 3, 4, 5, 6],
      'isha-attri': [1, 2, 3, 4, 5],
    };

    EXPERTS.slice(0, 4).forEach((expert) => {
      const todayEntry = expert.availability.find((day) => day.date === todayKey);
      const expected = workingDays[expert.id]?.includes(today.getDay()) ? 'available' : 'unavailable';
      expect(todayEntry?.state).toBe(expected);
    });
  });

  it('includes Florentina Martin and Dr. Chandana Reddy with supplied details and working days', () => {
    const florentina = EXPERTS.find((expert) => expert.id === 'florentina-martin');
    const chandana = EXPERTS.find((expert) => expert.id === 'chandana-reddy');
    const availableWeekdays = (expert: typeof florentina) => new Set((expert?.availability ?? [])
      .filter((day) => day.state === 'available')
      .map((day) => new Date(`${day.date}T00:00:00`).getDay()));

    expect(florentina).toMatchObject({ image: 'assets/users/florentina.avif', price: 1200, experienceYears: 10, duration: '60 mins', sessionModes: ['Video'], languages: ['English', 'Tamil'] });
    expect(chandana).toMatchObject({ image: 'assets/users/chandana.avif', price: 2999, experienceYears: 10, duration: '60 mins', sessionModes: ['Video'], languages: ['English', 'Hindi', 'Kannada', 'Telugu'] });
    expect(florentina?.bio.startsWith("I'm a Certified Life Coach")).toBe(true);
    expect(chandana?.bio.startsWith("I'm a former oncologist")).toBe(true);
    expect([...availableWeekdays(florentina)].sort()).toEqual([1, 3]);
    expect(availableWeekdays(chandana).size).toBe(7);
    expect(chandana?.testimonials[0]?.quote.startsWith('Finding Chandana on Calmi')).toBe(true);
  });

  it('includes Heena Pahuja with supplied details and Monday-Saturday availability', () => {
    const heena = EXPERTS.find((expert) => expert.id === 'heena-pahuja');
    const availableWeekdays = new Set((heena?.availability ?? [])
      .filter((day) => day.state === 'available')
      .map((day) => new Date(`${day.date}T00:00:00`).getDay()));

    expect(EXPERTS.findIndex((expert) => expert.id === 'heena-pahuja')).toBe(8);
    expect(heena).toMatchObject({
      image: 'assets/users/heena.avif',
      subtitle: 'RCI Licensed Counselling Psychologist',
      qualifications: ['MSc Clinical Psychology'],
      price: 1500,
      experienceYears: 4,
      duration: '60 mins',
      sessionModes: ['Video'],
      specialties: ['Relationships', 'Stress Management'],
      languages: ['English'],
    });
    expect(heena?.bio.startsWith('I’m Heena, and my approach focuses on understanding')).toBe(true);
    expect([...availableWeekdays].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('includes Anisha Gugale with supplied details and weekday availability', () => {
    const anisha = EXPERTS.find((expert) => expert.id === 'anisha-gugale');
    const availableWeekdays = new Set((anisha?.availability ?? [])
      .filter((day) => day.state === 'available')
      .map((day) => new Date(`${day.date}T00:00:00`).getDay()));

    expect(EXPERTS.findIndex((expert) => expert.id === 'anisha-gugale')).toBe(9);
    expect(anisha).toMatchObject({
      image: 'assets/users/anisha.avif',
      subtitle: 'Clinical Psychology',
      qualifications: ['Masters in Clinical Psychology'],
      price: 599,
      experienceYears: 1,
      duration: '60 mins',
      sessionModes: ['Video'],
      specialties: ['Anxiety', 'Relationships', 'Stress Management'],
      languages: ['English', 'Hindi', 'Marathi'],
    });
    expect(anisha?.bio.startsWith('I’m Anisha and am finishing my Master’s in Clinical Psychology.')).toBe(true);
    expect([...availableWeekdays].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('includes Mitali Gupta with supplied details and daily availability', () => {
    const mitali = EXPERTS.find((expert) => expert.id === 'mitali-gupta');
    const availableWeekdays = new Set((mitali?.availability ?? [])
      .filter((day) => day.state === 'available')
      .map((day) => new Date(`${day.date}T00:00:00`).getDay()));

    expect(EXPERTS.findIndex((expert) => expert.id === 'mitali-gupta')).toBe(10);
    expect(mitali).toMatchObject({
      image: 'assets/users/mitali.avif',
      subtitle: 'Counselling Psychologist',
      qualifications: ['Masters in Clinical Psychology'],
      price: 1200,
      experienceYears: 2,
      duration: '45 mins',
      sessionModes: ['Video'],
      specialties: ['Cognitive Behaviour Therapy', 'Anxiety', 'Depression', 'Trauma & PTSD', 'Relationships', 'Stress Management'],
      languages: ['English', 'Hindi'],
    });
    expect(mitali?.bio.startsWith('I’m Mitali, and I help young adults overcome stress, anxiety, and relationship problems.')).toBe(true);
    expect([...availableWeekdays].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('uses OR logic for selected languages and AND logic across criteria', () => {
    const languages = filterExperts(EXPERTS, { ...DEFAULT_FILTER_CRITERIA, languages: ['Punjabi', 'Kannada'] });
    const combined = filterExperts(EXPERTS, {
      ...DEFAULT_FILTER_CRITERIA,
      genders: ['female'],
      languages: ['Punjabi'],
      minRating: 4.5,
      sessionMode: 'Video',
    });

    expect(languages.map((expert) => expert.id)).toEqual(['pavneet-kaur', 'chandana-reddy', 'manheer-kaur']);
    expect(languages.map((expert) => expert.id)).not.toContain('yukta-bansal');
    expect(EXPERTS.find((expert) => expert.id === 'yukta-bansal')?.languages).toEqual(['English', 'Hindi']);
    expect(combined.map((expert) => expert.id)).toEqual(['pavneet-kaur', 'manheer-kaur']);
  });
});
