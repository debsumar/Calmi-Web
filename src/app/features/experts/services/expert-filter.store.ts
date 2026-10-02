import { Injectable, signal } from '@angular/core';
import {
  AVAILABILITY_OPTIONS,
  DEFAULT_FILTER_CRITERIA,
  EXPERIENCE_OPTIONS,
  GENDER_OPTIONS,
  LANGUAGE_OPTIONS,
  PRICE_BOUNDS,
  RATING_OPTIONS,
  SESSION_MODE_OPTIONS,
  SPECIALTY_OPTIONS,
  ExpertFilterCriteria,
} from '@/features/experts/data/expert.data';

export const EXPERT_FILTER_STORAGE_KEY = 'calmi.therapy.filters.v1';

const availabilityValues = new Set(AVAILABILITY_OPTIONS.map((option) => option.value));
const genderValues = new Set(GENDER_OPTIONS.map((option) => option.value));
const languageValues = new Set(LANGUAGE_OPTIONS);
const ratingValues = new Set(RATING_OPTIONS);
const experienceValues = new Set(EXPERIENCE_OPTIONS);
const specialtyValues = new Set(SPECIALTY_OPTIONS);
const sessionModeValues = new Set(SESSION_MODE_OPTIONS);

@Injectable({ providedIn: 'root' })
export class ExpertFilterStore {
  private readonly store = signal<ExpertFilterCriteria>(this.read());

  readonly criteria = this.store.asReadonly();

  set(criteria: ExpertFilterCriteria): void {
    // Prices are clamped on the write path so an out-of-range entry narrows the
    // range instead of dropping the whole update; everything else must be a known
    // option value, which only a corrupt caller could violate.
    const clamped = {
      ...criteria,
      priceMin: clampPrice(criteria.priceMin),
      priceMax: clampPrice(criteria.priceMax),
    };
    if (!isExpertFilterCriteria(clamped)) return;
    const next = cloneCriteria(clamped);
    this.store.set(next);
    this.persist(next);
  }

  update(change: Partial<ExpertFilterCriteria>): void {
    this.set({ ...this.store(), ...change });
  }

  clear(): void {
    this.store.set(cloneCriteria(DEFAULT_FILTER_CRITERIA));
    const storage = this.storage();
    if (!storage) return;
    try {
      storage.removeItem(EXPERT_FILTER_STORAGE_KEY);
    } catch {
      // Blocked site data or private mode: cleared state remains in memory.
    }
  }

  private storage(): Storage | null {
    try {
      return globalThis.sessionStorage ?? null;
    } catch {
      // Storage access throws when cookies/site data are blocked; stay in memory.
      return null;
    }
  }

  private read(): ExpertFilterCriteria {
    let raw: string | null = null;
    try {
      raw = this.storage()?.getItem(EXPERT_FILTER_STORAGE_KEY) ?? null;
    } catch {
      // Storage read threw (blocked site data); use default criteria.
      return cloneCriteria(DEFAULT_FILTER_CRITERIA);
    }
    if (!raw) return cloneCriteria(DEFAULT_FILTER_CRITERIA);
    try {
      const parsed: unknown = JSON.parse(raw);
      return isExpertFilterCriteria(parsed) ? cloneCriteria(parsed) : cloneCriteria(DEFAULT_FILTER_CRITERIA);
    } catch {
      return cloneCriteria(DEFAULT_FILTER_CRITERIA);
    }
  }

  private persist(criteria: ExpertFilterCriteria): void {
    const storage = this.storage();
    if (!storage) return;
    try {
      storage.setItem(EXPERT_FILTER_STORAGE_KEY, JSON.stringify(criteria));
    } catch {
      // Quota or private-mode failure: criteria stay in memory for this session.
    }
  }
}

function cloneCriteria(criteria: ExpertFilterCriteria): ExpertFilterCriteria {
  return {
    availability: criteria.availability,
    genders: [...criteria.genders],
    languages: [...criteria.languages],
    priceMin: criteria.priceMin,
    priceMax: criteria.priceMax,
    minRating: criteria.minRating,
    minExperience: criteria.minExperience,
    specialty: criteria.specialty,
    sessionMode: criteria.sessionMode,
  };
}

function clampPrice(value: number | null): number | null {
  if (value === null || typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.min(PRICE_BOUNDS.max, Math.max(PRICE_BOUNDS.min, value));
}

function isPriceOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value) && value >= PRICE_BOUNDS.min && value <= PRICE_BOUNDS.max);
}

function isMemberOrNull<T>(value: unknown, values: ReadonlySet<T>): value is T | null {
  return value === null || values.has(value as T);
}

function hasOnlyMembers<T>(value: unknown, values: ReadonlySet<T>): value is T[] {
  return Array.isArray(value) && value.every((item) => values.has(item as T));
}

function isExpertFilterCriteria(value: unknown): value is ExpertFilterCriteria {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<ExpertFilterCriteria>;
  return availabilityValues.has(candidate.availability as ExpertFilterCriteria['availability'])
    && hasOnlyMembers(candidate.genders, genderValues)
    && hasOnlyMembers(candidate.languages, languageValues)
    && isPriceOrNull(candidate.priceMin)
    && isPriceOrNull(candidate.priceMax)
    && isMemberOrNull(candidate.minRating, ratingValues)
    && isMemberOrNull(candidate.minExperience, experienceValues)
    && isMemberOrNull(candidate.specialty, specialtyValues)
    && isMemberOrNull(candidate.sessionMode, sessionModeValues);
}
