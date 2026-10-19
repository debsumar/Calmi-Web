// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_FILTER_CRITERIA,
  EXPERIENCE_OPTIONS,
  LANGUAGE_OPTIONS,
  RATING_OPTIONS,
  SESSION_MODE_OPTIONS,
  SPECIALTY_OPTIONS,
} from '@/features/experts/data/expert.data';
import { ExpertFilterStore, EXPERT_FILTER_DAY_KEY, EXPERT_FILTER_STORAGE_KEY } from './expert-filter.store';

describe('ExpertFilterStore', () => {
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
    sessionStorage.setItem(EXPERT_FILTER_STORAGE_KEY, JSON.stringify(stored));

    const store = new ExpertFilterStore();
    expect(store.criteria()).toEqual(stored);

    store.update({ minExperience: EXPERIENCE_OPTIONS.at(-1)! });
    expect(JSON.parse(sessionStorage.getItem(EXPERT_FILTER_STORAGE_KEY)!)).toMatchObject({ minExperience: EXPERIENCE_OPTIONS.at(-1) });
  });

  it('rejects malformed JSON and payload values outside filter membership and bounds', () => {
    sessionStorage.setItem(EXPERT_FILTER_STORAGE_KEY, '{not json');
    expect(new ExpertFilterStore().criteria()).toEqual(DEFAULT_FILTER_CRITERIA);

    sessionStorage.setItem(EXPERT_FILTER_STORAGE_KEY, JSON.stringify({
      ...DEFAULT_FILTER_CRITERIA,
      languages: ['not-a-language'],
      minRating: 999,
      minExperience: -1,
      specialty: 'not-a-specialty',
      priceMin: -1,
      sessionMode: 'not-a-mode',
    }));
    expect(new ExpertFilterStore().criteria()).toEqual(DEFAULT_FILTER_CRITERIA);
  });

  it('strips unknown fields and rejects invalid writes before persistence', () => {
    sessionStorage.setItem(EXPERT_FILTER_STORAGE_KEY, JSON.stringify({
      ...DEFAULT_FILTER_CRITERIA,
      minRating: RATING_OPTIONS[0],
      staleField: 'discard me',
    }));
    const store = new ExpertFilterStore();
    expect(store.criteria()).toEqual({ ...DEFAULT_FILTER_CRITERIA, minRating: RATING_OPTIONS[0] });

    store.update({ minExperience: EXPERIENCE_OPTIONS[0]! });
    expect(JSON.parse(sessionStorage.getItem(EXPERT_FILTER_STORAGE_KEY)!).staleField).toBeUndefined();

    store.set({ ...DEFAULT_FILTER_CRITERIA, minRating: 999 } as unknown as typeof DEFAULT_FILTER_CRITERIA);
    expect(store.criteria()).toEqual({
      ...DEFAULT_FILTER_CRITERIA,
      minRating: RATING_OPTIONS[0],
      minExperience: EXPERIENCE_OPTIONS[0],
    });
  });

  it('stays in memory when sessionStorage is absent or blocked', () => {
    withSessionStorage(undefined, () => {
      const store = new ExpertFilterStore();
      store.update({ minRating: RATING_OPTIONS[0]! });
      store.clear();
      expect(store.criteria()).toEqual(DEFAULT_FILTER_CRITERIA);
    });

    withThrowingSessionStorage(() => {
      const store = new ExpertFilterStore();
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
      const store = new ExpertFilterStore();
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

describe('ExpertFilterStore normalisation', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.useRealTimers());

  it('swaps an inverted price range on set()', () => {
    const store = new ExpertFilterStore();
    expect(store.set({ ...DEFAULT_FILTER_CRITERIA, priceMin: 1500, priceMax: 900 })).toBe(true);
    expect(store.criteria().priceMin).toBe(900);
    expect(store.criteria().priceMax).toBe(1500);
    expect(JSON.parse(sessionStorage.getItem(EXPERT_FILTER_STORAGE_KEY)!)).toMatchObject({ priceMin: 900, priceMax: 1500 });
  });

  it('swaps an inverted persisted price range on read', () => {
    sessionStorage.setItem(EXPERT_FILTER_STORAGE_KEY, JSON.stringify({ ...DEFAULT_FILTER_CRITERIA, priceMin: 1500, priceMax: 900 }));
    const { priceMin, priceMax } = new ExpertFilterStore().criteria();
    expect([priceMin, priceMax]).toEqual([900, 1500]);
  });

  it('returns false and keeps the current filters for invalid input, without throwing', () => {
    const store = new ExpertFilterStore();
    store.update({ minRating: RATING_OPTIONS[0]! });
    const before = store.criteria();

    expect(store.set({ ...DEFAULT_FILTER_CRITERIA, languages: ['klingon'] as never })).toBe(false);
    expect(store.set({ ...DEFAULT_FILTER_CRITERIA, availability: 'tomorrow' as never })).toBe(false);
    expect(() => store.set(null as never)).not.toThrow();
    expect(store.set(null as never)).toBe(false);
    expect(store.criteria()).toEqual(before);
  });

  it('keeps "Available today" on the day it was saved', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 10, 9, 0, 0));
    new ExpertFilterStore().set({ ...DEFAULT_FILTER_CRITERIA, availability: 'today' });
    vi.setSystemTime(new Date(2026, 8, 10, 23, 59, 59));

    expect(new ExpertFilterStore().criteria().availability).toBe('today');
  });

  it('discards a stale "Available today" from a previous day but keeps other filters', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 10, 23, 59, 59));
    new ExpertFilterStore().set({ ...DEFAULT_FILTER_CRITERIA, availability: 'today', minRating: RATING_OPTIONS[0]! });
    vi.setSystemTime(new Date(2026, 8, 11, 0, 0, 1));

    const restored = new ExpertFilterStore().criteria();
    expect(restored.availability).toBe(DEFAULT_FILTER_CRITERIA.availability);
    expect(restored.minRating).toBe(RATING_OPTIONS[0]);
  });

  it('discards "Available today" saved without a day stamp, but keeps "week"', () => {
    sessionStorage.setItem(EXPERT_FILTER_STORAGE_KEY, JSON.stringify({ ...DEFAULT_FILTER_CRITERIA, availability: 'today' }));
    expect(new ExpertFilterStore().criteria().availability).toBe('any');

    sessionStorage.setItem(EXPERT_FILTER_STORAGE_KEY, JSON.stringify({ ...DEFAULT_FILTER_CRITERIA, availability: 'week' }));
    expect(new ExpertFilterStore().criteria().availability).toBe('week');
  });

  it('clear() removes the day stamp too', () => {
    const store = new ExpertFilterStore();
    store.set({ ...DEFAULT_FILTER_CRITERIA, availability: 'today' });
    expect(sessionStorage.getItem(EXPERT_FILTER_DAY_KEY)).not.toBeNull();
    store.clear();
    expect(sessionStorage.getItem(EXPERT_FILTER_DAY_KEY)).toBeNull();
  });
});
