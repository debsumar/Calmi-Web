import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { User } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('normalizes tags and keeps them across an update', () => {
    const entry = service.upsert({
      id: null,
      title: 'Tagged',
      content: 'x',
      status: 'saved',
      tags: [' Walk ', 'Walk', '', 'Music', 42 as unknown as string],
    }).entry;

    expect(entry.tags).toEqual(['Walk', 'Music']);

    // Omitting tags on a later save must not wipe the ones already stored.
    const updated = service.upsert({ id: entry.id, title: 'Tagged', content: 'y', status: 'draft' }).entry;
    expect(updated.tags).toEqual(['Walk', 'Music']);
    expect(JSON.parse(localStorage.getItem(GUEST_KEY) ?? '[]')[0].tags).toEqual(['Walk', 'Music']);
  });

  it('reads pre-tag entries back with an empty tag list', () => {
    localStorage.setItem(GUEST_KEY, JSON.stringify([
      { id: 'legacy', title: 'Old', content: 'x', status: 'saved', createdAt: '2026-09-09T04:15:00.000Z', updatedAt: '2026-09-09T04:15:00.000Z' },
    ]));

    expect(configure().entries()[0].tags).toEqual([]);
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
      tags: [] as readonly string[],
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

describe('JournalService resilience', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    localStorage.clear();
  });

  it('keeps in-memory entries across a second save when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const service = configure();

    const first = service.upsert({ id: null, title: 'One', content: 'first', status: 'saved' });
    const second = service.upsert({ id: null, title: 'Two', content: 'second', status: 'saved' });

    expect(first.persisted).toBe(false);
    expect(second.persisted).toBe(false);
    expect(service.storageFailed()).toBe(true);
    expect(service.count()).toBe(2);
    expect(service.byId(first.entry.id)?.content).toBe('first');

    expect(service.remove(second.entry.id)).toBe(false);
    expect(service.count()).toBe(1);
    expect(service.byId(first.entry.id)).not.toBeNull();
  });

  it('flags new entries as html and reads old records without the flag', () => {
    const service = configure();
    const { entry } = service.upsert({ id: null, title: 'T', content: 'Tom &amp; Jerry', status: 'saved' });
    expect(entry.contentFormat).toBe('html');
    expect(JSON.parse(localStorage.getItem(GUEST_KEY) ?? '[]')[0].contentFormat).toBe('html');

    const legacy = { id: 'old', title: 'Old', content: 'plain', status: 'saved', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };
    localStorage.setItem(GUEST_KEY, JSON.stringify([legacy]));
    expect(configure().byId('old')?.contentFormat).toBeUndefined();
  });

  it('keeps invalid records in a quarantine key instead of deleting them', () => {
    const valid = { id: 'ok', title: 'Fine', content: 'x', status: 'saved', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };
    const bogus = { id: 'bad', title: 'Future shape', body: { blocks: [1, 2] }, status: 'archived' };
    localStorage.setItem(GUEST_KEY, JSON.stringify([valid, bogus]));
    const service = configure();

    expect(service.count()).toBe(1);
    service.upsert({ id: null, title: 'New', content: 'hello', status: 'saved' });

    expect(JSON.parse(localStorage.getItem(GUEST_KEY) ?? '[]')).toHaveLength(2);
    expect(JSON.parse(localStorage.getItem(`${GUEST_KEY}:invalid`) ?? '[]')).toEqual([bogus]);

    // Re-reading must not duplicate the quarantined record.
    configure();
    expect(JSON.parse(localStorage.getItem(`${GUEST_KEY}:invalid`) ?? '[]')).toEqual([bogus]);
  });

  it('quarantines an unparseable payload verbatim', () => {
    localStorage.setItem(GUEST_KEY, '{not json');
    const service = configure();
    expect(service.count()).toBe(0);
    service.upsert({ id: null, title: 'New', content: 'hello', status: 'saved' });
    expect(JSON.parse(localStorage.getItem(`${GUEST_KEY}:invalid`) ?? '[]')).toEqual([{ unparsable: '{not json' }]);
  });

  it('keeps an unreadable quarantine value as an item instead of replacing it', () => {
    localStorage.setItem(`${GUEST_KEY}:invalid`, '{broken quarantine');
    localStorage.setItem(GUEST_KEY, '{not json');
    const service = configure();
    expect(service.count()).toBe(0);

    const parked = JSON.parse(localStorage.getItem(`${GUEST_KEY}:invalid`) ?? '[]') as unknown[];
    expect(parked).toEqual([{ unreadable: '{broken quarantine' }, { unparsable: '{not json' }]);
  });

  it('keeps a non-array quarantine value as an item instead of replacing it', () => {
    localStorage.setItem(`${GUEST_KEY}:invalid`, '{"legacy":true}');
    localStorage.setItem(GUEST_KEY, '{not json');
    expect(configure().count()).toBe(0);

    const parked = JSON.parse(localStorage.getItem(`${GUEST_KEY}:invalid`) ?? '[]') as unknown[];
    expect(parked).toEqual([{ unreadable: '{"legacy":true}' }, { unparsable: '{not json' }]);
  });

  it('does not re-arm the midnight timer when now() is read after destroy', () => {
    vi.useFakeTimers();
    const service = configure();
    expect(vi.getTimerCount()).toBe(0);

    TestBed.resetTestingModule();
    service.now();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('never overwrites the main payload while quarantine fails, then parks and persists once storage recovers', () => {
    const rawMain = '{not json';
    localStorage.setItem(GUEST_KEY, rawMain);
    const realSetItem = Storage.prototype.setItem;
    let quotaFull = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (quotaFull && key.endsWith(':invalid')) throw new Error('QuotaExceededError');
      realSetItem.call(this, key, value);
    });

    const service = configure();
    const first = service.upsert({ id: null, title: 'One', content: 'first', status: 'saved' });

    expect(first.persisted).toBe(false);
    expect(service.storageFailed()).toBe(true);
    expect(localStorage.getItem(GUEST_KEY)).toBe(rawMain);
    expect(localStorage.getItem(`${GUEST_KEY}:invalid`)).toBeNull();
    expect(service.byId(first.entry.id)?.content).toBe('first');

    // Still failing on the next save: main stays untouched, both entries stay in memory.
    const second = service.upsert({ id: null, title: 'Two', content: 'second', status: 'saved' });
    expect(second.persisted).toBe(false);
    expect(localStorage.getItem(GUEST_KEY)).toBe(rawMain);
    expect(service.count()).toBe(2);

    quotaFull = false;
    const third = service.upsert({ id: null, title: 'Three', content: 'third', status: 'saved' });

    expect(third.persisted).toBe(true);
    expect(service.storageFailed()).toBe(false);
    expect(JSON.parse(localStorage.getItem(`${GUEST_KEY}:invalid`) ?? '[]')).toEqual([{ unparsable: rawMain }]);
    expect(JSON.parse(localStorage.getItem(GUEST_KEY) ?? '[]')).toHaveLength(3);
  });

  it('arms no midnight timer until the date is read, and clears it on destroy', () => {
    vi.useFakeTimers();
    const service = configure();
    expect(vi.getTimerCount()).toBe(0);

    service.now();
    expect(vi.getTimerCount()).toBe(1);

    TestBed.resetTestingModule();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('crosses local midnight: 23:59:59 to 00:00:01 moves the clock but keeps the grace day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 10, 23, 59, 59));
    const service = configure();
    service.upsert({ id: null, title: 'Late', content: 'one', status: 'saved' });

    expect(service.now().getDate()).toBe(10);
    expect(service.stats().streakDays).toBe(1);

    vi.advanceTimersByTime(2_000);
    expect(service.now().getDate()).toBe(11);
    expect(service.stats().streakDays).toBe(1);

    // A full day with no entry ends the run once the clock crosses the next midnight.
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(service.now().getDate()).toBe(12);
    expect(service.stats().streakDays).toBe(0);
  });

  it('does not extend the streak with drafts', () => {
    const service = configure();
    service.upsert({ id: null, title: 'Draft', content: 'wip', status: 'draft' });
    expect(service.stats().streakDays).toBe(0);
    expect(service.stats().drafts).toBe(1);
  });

  it('counts words across line breaks in stored markup', () => {
    const service = configure();
    service.upsert({ id: null, title: 'Lines', content: 'one<br>two<div>three</div>', status: 'saved' });
    expect(service.stats().totalWords).toBe(3);
  });
});
