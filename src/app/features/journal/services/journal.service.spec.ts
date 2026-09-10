import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { User } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '@/core/services/auth.service';
import { provideAuthServiceStub } from '@/core/services/testing/auth.service.stub';
import { countWords, previewOf } from '../models/journal-entry.model';
import { JournalService, streakFrom } from './journal.service';

const GUEST_KEY = 'calmi.journal.entries.v1:guest';

function configure(): JournalService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideAuthServiceStub()] });
  return TestBed.inject(JournalService);
}

describe('JournalService', () => {
  let service: JournalService;

  beforeEach(() => {
    localStorage.clear();
    service = configure();
  });

  it('creates an entry, titles untitled content and persists it', () => {
    const { entry, persisted } = service.upsert({ id: null, title: '  ', content: 'first thought', status: 'saved' });

    expect(entry.title).toBe('Untitled entry');
    expect(persisted).toBe(true);
    expect(service.count()).toBe(1);
    expect(JSON.parse(localStorage.getItem(GUEST_KEY) ?? '[]')).toHaveLength(1);
  });

  it('updates in place instead of adding a duplicate', () => {
    const created = service.upsert({ id: null, title: 'A quiet moment', content: 'draft body', status: 'draft' }).entry;
    const updated = service.upsert({ id: created.id, title: 'A quiet moment', content: 'final body', status: 'saved' }).entry;

    expect(updated.id).toBe(created.id);
    expect(service.count()).toBe(1);
    expect(service.byId(created.id)?.content).toBe('final body');
    expect(service.byId(created.id)?.status).toBe('saved');
  });

  it('sorts entries by update time and flips with the sort toggle', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-09-01T10:00:00.000Z'));
      const older = service.upsert({ id: null, title: 'Older', content: 'a', status: 'saved' }).entry;
      vi.setSystemTime(new Date('2026-09-05T10:00:00.000Z'));
      const newer = service.upsert({ id: null, title: 'Newer', content: 'b', status: 'saved' }).entry;

      expect(service.entries()[0].id).toBe(newer.id);
      service.toggleSortOrder();
      expect(service.sortOrder()).toBe('oldest');
      expect(service.entries()[0].id).toBe(older.id);
    } finally {
      vi.useRealTimers();
    }
  });

  it('orders same-timestamp entries deterministically', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-09-01T10:00:00.000Z'));
      service.upsert({ id: null, title: 'B', content: 'b', status: 'saved' });
      service.upsert({ id: null, title: 'A', content: 'a', status: 'saved' });

      const newestFirst = service.entries().map((entry) => entry.id);
      service.toggleSortOrder();
      const oldestFirst = service.entries().map((entry) => entry.id);

      expect(oldestFirst).toEqual([...newestFirst].reverse());
    } finally {
      vi.useRealTimers();
    }
  });

  it('removes an entry and rewrites storage', () => {
    const entry = service.upsert({ id: null, title: 'Gone', content: 'bye', status: 'saved' }).entry;

    expect(service.remove(entry.id)).toBe(true);
    expect(service.count()).toBe(0);
    expect(service.byId(entry.id)).toBeNull();
    expect(JSON.parse(localStorage.getItem(GUEST_KEY) ?? '[]')).toHaveLength(0);
  });

  it('restores persisted entries and drops malformed or invalid-date records', () => {
    localStorage.setItem(GUEST_KEY, JSON.stringify([
      { id: 'ok', title: 'Kept', content: 'x', status: 'saved', createdAt: '2026-09-09T04:15:00.000Z', updatedAt: '2026-09-09T04:15:00.000Z' },
      { id: 'no-fields', title: 'Missing fields' },
      { id: 'bad-date', title: 'Bad date', content: 'x', status: 'saved', createdAt: 'nope', updatedAt: 'nope' },
    ]));

    expect(configure().entries().map((entry) => entry.id)).toEqual(['ok']);
  });

  it('survives unparsable storage content', () => {
    localStorage.setItem(GUEST_KEY, 'not json');

    expect(configure().entries()).toEqual([]);
  });

  it('keeps entries per identity so a shared device does not leak them', () => {
    service.upsert({ id: null, title: 'Guest note', content: 'guest', status: 'saved' });

    TestBed.resetTestingModule();
    const currentUser = signal<User | null>({ id: 'user-1' } as User);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { currentUser } as Partial<AuthService> }],
    });
    const scoped = TestBed.inject(JournalService);

    expect(scoped.entries()).toEqual([]);
    scoped.upsert({ id: null, title: 'User note', content: 'mine', status: 'saved' });
    expect(localStorage.getItem('calmi.journal.entries.v1:user-1')).toContain('User note');
    expect(localStorage.getItem(GUEST_KEY)).toContain('Guest note');

    currentUser.set(null);
    expect(scoped.entries().map((entry) => entry.title)).toEqual(['Guest note']);
  });

  it('merges another tab\'s write instead of clobbering it', () => {
    const mine = service.upsert({ id: null, title: 'Mine', content: 'a', status: 'saved' }).entry;
    // Simulate a second tab appending an entry directly to storage.
    const fromOtherTab = { id: 'other', title: 'Other tab', content: 'b', status: 'saved', createdAt: '2026-09-08T10:00:00.000Z', updatedAt: '2026-09-08T10:00:00.000Z' };
    localStorage.setItem(GUEST_KEY, JSON.stringify([fromOtherTab, mine]));

    service.upsert({ id: null, title: 'Third', content: 'c', status: 'saved' });

    expect(service.entries().map((entry) => entry.title).sort()).toEqual(['Mine', 'Other tab', 'Third']);
  });

  it('adopts a storage event from another tab', () => {
    const fromOtherTab = { id: 'other', title: 'Other tab', content: 'b', status: 'saved', createdAt: '2026-09-08T10:00:00.000Z', updatedAt: '2026-09-08T10:00:00.000Z' };
    localStorage.setItem(GUEST_KEY, JSON.stringify([fromOtherTab]));

    window.dispatchEvent(new StorageEvent('storage', { key: GUEST_KEY }));

    expect(service.entries().map((entry) => entry.id)).toEqual(['other']);
  });

  it('reports a failed write instead of claiming a save', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    try {
      const { entry, persisted } = service.upsert({ id: null, title: 'No room', content: 'x', status: 'saved' });

      expect(persisted).toBe(false);
      expect(service.storageFailed()).toBe(true);
      // Still readable in memory for the current session.
      expect(service.byId(entry.id)?.content).toBe('x');
    } finally {
      setItem.mockRestore();
    }
  });
});

describe('journal stats', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is empty before anything is written', () => {
    expect(configure().stats()).toEqual({
      total: 0,
      saved: 0,
      drafts: 0,
      totalWords: 0,
      lastEntryAt: null,
      streakDays: 0,
    });
  });

  it('counts entries, drafts, words and the latest write', () => {
    const service = configure();
    service.upsert({ id: null, title: 'One', content: 'three little words', status: 'saved' });
    const draft = service.upsert({ id: null, title: 'Two', content: 'two words', status: 'draft' }).entry;

    const stats = service.stats();
    expect(stats.total).toBe(2);
    expect(stats.saved).toBe(1);
    expect(stats.drafts).toBe(1);
    expect(stats.totalWords).toBe(5);
    expect(stats.lastEntryAt).toBe(draft.updatedAt);
  });

  it('counts consecutive days as a streak, including a grace day', () => {
    // Streaks follow the writer's local midnight, so fixtures are built in local time.
    const localDay = (day: number, hour = 9) => new Date(2026, 8, day, hour, 0, 0);
    const entry = (id: string, day: number, hour = 9) => ({
      id,
      title: id,
      content: 'x',
      status: 'saved' as const,
      createdAt: localDay(day, hour).toISOString(),
      updatedAt: localDay(day, hour).toISOString(),
    });
    const now = localDay(10, 20);

    // Today, yesterday, the day before: a 3-day run.
    expect(streakFrom([entry('a', 10), entry('b', 9), entry('c', 8)], now)).toBe(3);

    // Nothing today yet, so yesterday still anchors the run.
    expect(streakFrom([entry('b', 9), entry('c', 8)], now)).toBe(2);

    // A skipped day ends the run.
    expect(streakFrom([entry('c', 8)], now)).toBe(0);

    // Two entries on one day still count as one day.
    expect(streakFrom([entry('a', 10, 9), entry('a2', 10, 21)], now)).toBe(1);

    expect(streakFrom([], now)).toBe(0);
  });
});

describe('journal entry helpers', () => {
  it('counts words ignoring surrounding whitespace', () => {
    expect(countWords('   ')).toBe(0);
    expect(countWords(' two  words ')).toBe(2);
  });

  it('truncates previews on a word boundary', () => {
    const preview = previewOf('Today felt heavier than usual, I kept thinking about everything', 30);

    expect(preview.endsWith('…')).toBe(true);
    expect(preview.length).toBeLessThanOrEqual(31);
    expect(previewOf('short note', 30)).toBe('short note');
  });
});
