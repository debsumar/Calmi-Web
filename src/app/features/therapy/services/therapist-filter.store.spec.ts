// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTER_CRITERIA,
  EXPERIENCE_OPTIONS,
  LANGUAGE_OPTIONS,
  RATING_OPTIONS,
  SESSION_MODE_OPTIONS,
  SPECIALTY_OPTIONS,
} from '@/features/therapy/data/therapist.data';
import { TherapistFilterStore, THERAPIST_FILTER_STORAGE_KEY } from './therapist-filter.store';

describe('TherapistFilterStore', () => {
  beforeEach(() => sessionStorage.clear());

  it('hydrates valid applied criteria and writes updates to session storage', () => {
    const stored = {
      ...DEFAULT_FILTER_CRITERIA,
      languages: [LANGUAGE_OPTIONS[0]!],
      minRating: RATING_OPTIONS[0]!,
      minExperience: EXPERIENCE_OPTIONS[0]!,
      specialty: SPECIALTY_OPTIONS[0]!,
      sessionMode: SESSION_MODE_OPTIONS[0]!,
    };
    sessionStorage.setItem(THERAPIST_FILTER_STORAGE_KEY, JSON.stringify(stored));

    const store = new TherapistFilterStore();
    expect(store.criteria()).toEqual(stored);

    store.update({ minExperience: EXPERIENCE_OPTIONS.at(-1)! });
    expect(JSON.parse(sessionStorage.getItem(THERAPIST_FILTER_STORAGE_KEY)!)).toMatchObject({ minExperience: EXPERIENCE_OPTIONS.at(-1) });
  });

  it('rejects malformed JSON and payload values outside filter membership and bounds', () => {
    sessionStorage.setItem(THERAPIST_FILTER_STORAGE_KEY, '{not json');
    expect(new TherapistFilterStore().criteria()).toEqual(DEFAULT_FILTER_CRITERIA);

    sessionStorage.setItem(THERAPIST_FILTER_STORAGE_KEY, JSON.stringify({
      ...DEFAULT_FILTER_CRITERIA,
      languages: ['not-a-language'],
      minRating: 999,
      minExperience: -1,
      specialty: 'not-a-specialty',
      priceMin: -1,
      sessionMode: 'not-a-mode',
    }));
    expect(new TherapistFilterStore().criteria()).toEqual(DEFAULT_FILTER_CRITERIA);
  });

  it('strips unknown fields and rejects invalid writes before persistence', () => {
    sessionStorage.setItem(THERAPIST_FILTER_STORAGE_KEY, JSON.stringify({
      ...DEFAULT_FILTER_CRITERIA,
      minRating: RATING_OPTIONS[0],
      staleField: 'discard me',
    }));
    const store = new TherapistFilterStore();
    expect(store.criteria()).toEqual({ ...DEFAULT_FILTER_CRITERIA, minRating: RATING_OPTIONS[0] });

    store.update({ minExperience: EXPERIENCE_OPTIONS[0]! });
    expect(JSON.parse(sessionStorage.getItem(THERAPIST_FILTER_STORAGE_KEY)!).staleField).toBeUndefined();

    store.set({ ...DEFAULT_FILTER_CRITERIA, minRating: 999 } as unknown as typeof DEFAULT_FILTER_CRITERIA);
    expect(store.criteria()).toEqual({
      ...DEFAULT_FILTER_CRITERIA,
      minRating: RATING_OPTIONS[0],
      minExperience: EXPERIENCE_OPTIONS[0],
    });
  });

  it('stays in memory when sessionStorage is absent or blocked', () => {
    withSessionStorage(undefined, () => {
      const store = new TherapistFilterStore();
      store.update({ minRating: RATING_OPTIONS[0]! });
      store.clear();
      expect(store.criteria()).toEqual(DEFAULT_FILTER_CRITERIA);
    });

    withThrowingSessionStorage(() => {
      const store = new TherapistFilterStore();
      store.update({ minExperience: EXPERIENCE_OPTIONS[0]! });
      expect(store.criteria().minExperience).toBe(EXPERIENCE_OPTIONS[0]);
    });
  });

  it('keeps state when quota writes or storage removal throw', () => {
    let setCalls = 0;
    let removeCalls = 0;
    const throwingStorage = {
      getItem: () => null,
      setItem: () => {
        setCalls += 1;
        throw new Error('quota exceeded');
      },
      removeItem: () => {
        removeCalls += 1;
        throw new Error('storage blocked');
      },
    } as unknown as Storage;

    withSessionStorage(throwingStorage, () => {
      const store = new TherapistFilterStore();
      store.update({ minRating: RATING_OPTIONS[0]! });
      expect(store.criteria().minRating).toBe(RATING_OPTIONS[0]);
      store.clear();
      expect(store.criteria()).toEqual(DEFAULT_FILTER_CRITERIA);
    });

    expect(setCalls).toBe(1);
    expect(removeCalls).toBe(1);
  });
});

function withSessionStorage(storage: Storage | undefined, callback: () => void): void {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });
  try {
    callback();
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'sessionStorage');
  }
}

function withThrowingSessionStorage(callback: () => void): void {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    get: () => {
      throw new Error('site data blocked');
    },
  });
  try {
    callback();
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'sessionStorage');
  }
}
