import { computed, DestroyRef, inject, Injectable, linkedSignal, signal } from '@angular/core';
import { AuthService } from '@/core/services/auth.service';
import { countWords, JOURNAL_TITLE_MAX_LENGTH, JournalEntry, JournalEntryStatus, JournalSortOrder, JournalStats } from '../models/journal-entry.model';

const STORAGE_PREFIX = 'calmi.journal.entries.v1';

/** Records that failed validation are parked under `<key>:invalid`, never destroyed. */
const QUARANTINE_SUFFIX = ':invalid';

/** Entries are per-identity so a shared device never leaks another user's journal. */
function storageKeyFor(userId: string | null): string {
  return `${STORAGE_PREFIX}:${userId ?? 'guest'}`;
}

/**
 * Journal entries live on the device only: there is no journal API yet, so nothing
 * here leaves the browser. Swap `read`/`write` for the API once it exists; the
 * component talks to signals and never to storage directly.
 */
@Injectable({ providedIn: 'root' })
export class JournalService {
  private readonly auth = inject(AuthService, { optional: true });

  /** Key tracks the signed-in user, so switching accounts switches journals. */
  private readonly storageKey = computed(() => storageKeyFor(this.auth?.currentUser()?.id ?? null));

  private readonly store = linkedSignal<string, JournalEntry[]>({
    // Identity change re-reads that user's journal synchronously; local writes
    // still go through `store.set`.
    source: this.storageKey,
    computation: (key) => this.read(key),
  });

  /** Current time, refreshed at every local midnight so day-based figures never go stale. */
  private readonly clock = signal(new Date());
  /**
   * Reading `now` (directly or through `stats`) arms the midnight timer on first use,
   * so a service nobody reads the date from never owns a pending timer.
   */
  readonly now = computed(() => {
    this.ensureMidnightTick();
    return this.clock();
  });

  readonly sortOrder = signal<JournalSortOrder>('newest');

  /** True when the last write could not reach storage (quota, private mode, blocked). */
  readonly storageFailed = signal(false);

  readonly entries = computed(() => {
    const direction = this.sortOrder() === 'newest' ? -1 : 1;
    return [...this.store()].sort((a, b) => {
      const byUpdated = timeOf(a.updatedAt) - timeOf(b.updatedAt);
      if (byUpdated !== 0) return direction * byUpdated;
      const byCreated = timeOf(a.createdAt) - timeOf(b.createdAt);
      if (byCreated !== 0) return direction * byCreated;
      return direction * a.id.localeCompare(b.id);
    });
  });

  readonly count = computed(() => this.store().length);

  /**
   * Real, device-derived journal stats for the profile dashboard. The streak counts
   * consecutive local days (by `createdAt`) that have a saved entry, ending today or
   * yesterday, so a missed evening does not erase the run before the day is over.
   * Drafts do not extend it. Reads `clock`, which ticks at local midnight.
   */
  readonly stats = computed<JournalStats>(() => {
    const entries = this.store();
    const now = this.now();
    const totalWords = entries.reduce((sum, entry) => sum + countWords(entry.content, entry.contentFormat), 0);
    const drafts = entries.filter((entry) => entry.status === 'draft').length;
    const lastEntryAt = entries.reduce<string | null>((latest, entry) => {
      // createdAt, like the streak: one clock for "when did I write".
      if (!latest || timeOf(entry.createdAt) > timeOf(latest)) return entry.createdAt;
      return latest;
    }, null);

    return {
      total: entries.length,
      drafts,
      saved: entries.length - drafts,
      totalWords,
      lastEntryAt,
      streakDays: streakFrom(entries, now),
    };
  });

  constructor() {
    const view = globalThis.window;
    if (view) {
      const onStorage = (event: StorageEvent) => {
        // Another tab wrote this user's journal; adopt its version instead of
        // overwriting it on our next save.
        if (event.key !== null && event.key !== this.storageKey()) return;
        this.store.set(this.read(this.storageKey()));
      };
      view.addEventListener('storage', onStorage);
      inject(DestroyRef).onDestroy(() => view.removeEventListener('storage', onStorage));
    }
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      if (this.midnightTimer !== null) clearTimeout(this.midnightTimer);
      this.midnightTimer = null;
    });
  }

  private midnightTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  private ensureMidnightTick(): void {
    if (this.midnightTimer === null && !this.destroyed) this.scheduleMidnightTick();
  }

  /** Moves `clock` forward at the next local midnight, then keeps rescheduling. */
  private scheduleMidnightTick(): void {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    // Cap so a long sleep/timer clamp re-checks instead of drifting; +1ms lands past midnight.
    const delay = Math.min(nextMidnight.getTime() - now.getTime() + 1, 2 ** 31 - 1);
    this.midnightTimer = setTimeout(() => {
      this.clock.set(new Date());
      this.scheduleMidnightTick();
    }, delay);
    // Never keep a Node process (SSR, test worker) alive for a midnight that may not come.
    (this.midnightTimer as { unref?: () => void }).unref?.();
  }

  toggleSortOrder(): void {
    this.sortOrder.update((order) => (order === 'newest' ? 'oldest' : 'newest'));
  }

  byId(id: string | null): JournalEntry | null {
    if (!id) return null;
    return this.store().find((entry) => entry.id === id) ?? null;
  }

  /**
   * Content passed in is editor markup, so new and updated entries are flagged `html`.
   * Creates the entry when `id` is null, otherwise updates it in place. `persisted`
   * is false when storage rejected the write, so callers never claim a false save.
   */
  upsert(input: { id: string | null; title: string; content: string; status: JournalEntryStatus; tags?: readonly string[] }): { entry: JournalEntry; persisted: boolean } {
    const now = new Date().toISOString();
    const title = input.title.trim().slice(0, JOURNAL_TITLE_MAX_LENGTH) || 'Untitled entry';
    const existing = this.byId(input.id);
    const tags = normalizeTags(input.tags ?? existing?.tags ?? []);

    const entry: JournalEntry = existing
      ? { ...existing, title, content: input.content, contentFormat: 'html', status: input.status, tags, updatedAt: now }
      : { id: this.nextId(), title, content: input.content, contentFormat: 'html', status: input.status, tags, createdAt: now, updatedAt: now };

    // Merge onto the in-memory list: it already holds everything read so far (and any
    // other tab's writes adopted by the storage listener), and a blocked or failed
    // storage read must never wipe what the writer sees.
    const merged = this.merge(entry);
    this.store.set(merged);
    return { entry, persisted: this.persist(merged) };
  }

  remove(id: string): boolean {
    this.removedIds.add(id);
    const next = this.store().filter((entry) => entry.id !== id);
    this.store.set(next);
    return this.persist(next);
  }

  /**
   * Builds the next list from the in-memory store, so a blocked or failing storage read
   * can never wipe what the writer sees. Entries another tab stored in the meantime are
   * folded in (newer `updatedAt` wins), except ones deleted in this session.
   */
  private merge(entry: JournalEntry): JournalEntry[] {
    const current = this.store();
    const known = new Map(current.map((item) => [item.id, item]));
    const extras: JournalEntry[] = [];
    for (const stored of this.read(this.storageKey())) {
      if (this.removedIds.has(stored.id)) continue;
      const mine = known.get(stored.id);
      if (!mine) extras.push(stored);
      else if (timeOf(stored.updatedAt) > timeOf(mine.updatedAt)) known.set(stored.id, stored);
    }
    const base = [...current.map((item) => known.get(item.id) ?? item), ...extras];
    return base.some((item) => item.id === entry.id)
      ? base.map((item) => (item.id === entry.id ? entry : item))
      : [entry, ...base];
  }

  /** Ids deleted in this session; a failed storage write must not resurrect them. */
  private readonly removedIds = new Set<string>();

  private nextId(): string {
    const cryptoRef = globalThis.crypto;
    if (typeof cryptoRef?.randomUUID === 'function') return cryptoRef.randomUUID();
    return `entry-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private storage(): Storage | null {
    try {
      return globalThis.localStorage ?? null;
    } catch {
      // Storage access throws when cookies/site data are blocked; stay in memory.
      return null;
    }
  }

  /**
   * Valid entries for `key`. Anything that fails validation (or the whole payload when
   * it is not parseable) is copied to `<key>:invalid` first, so a later persist of the
   * valid entries can never destroy the writer's unrecognised records.
   */
  private read(key: string): JournalEntry[] {
    let raw: string | null = null;
    try {
      raw = this.storage()?.getItem(key) ?? null;
    } catch {
      // Storage read threw (blocked site data); treat as an empty journal.
      return [];
    }
    if (!raw) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.quarantine(key, [{ unparsable: raw }]);
      return [];
    }
    if (!Array.isArray(parsed)) {
      this.quarantine(key, [parsed]);
      return [];
    }
    const invalid = parsed.filter((item) => !isJournalEntry(item));
    if (invalid.length > 0) this.quarantine(key, invalid);
    return parsed.filter(isJournalEntry).map(withTags);
  }

  /**
   * Records that still need parking, per storage key. Non-empty means the quarantine write
   * failed (quota, blocked), so the original main payload is the only copy of them.
   */
  private readonly pendingQuarantine = new Map<string, unknown[]>();

  /**
   * Appends `items` (plus any earlier items that could not be parked) to the quarantine
   * key, skipping ones already parked. Returns false when the write failed; the items are
   * then remembered so `persist` refuses to overwrite the main payload until a retry works.
   */
  private quarantine(key: string, items: readonly unknown[]): boolean {
    const wanted = [...(this.pendingQuarantine.get(key) ?? [])];
    const wantedSeen = new Set(wanted.map((item) => JSON.stringify(item)));
    for (const item of items) {
      const id = JSON.stringify(item);
      if (!wantedSeen.has(id)) {
        wantedSeen.add(id);
        wanted.push(item);
      }
    }
    if (wanted.length === 0) return true;

    try {
      const storage = this.storage();
      if (!storage) {
        this.pendingQuarantine.delete(key);
        return true;
      }
      const quarantineKey = `${key}${QUARANTINE_SUFFIX}`;
      let kept: unknown[] = [];
      const rawExisting = storage.getItem(quarantineKey);
      if (rawExisting !== null) {
        try {
          const existing: unknown = JSON.parse(rawExisting);
          // Valid JSON that is not an array is parked as an item, never discarded.
          kept = Array.isArray(existing) ? existing : [{ unreadable: rawExisting }];
        } catch {
          // Bad JSON: keep the raw string verbatim inside the new array.
          kept = [{ unreadable: rawExisting }];
        }
      }
      const seen = new Set(kept.map((item) => JSON.stringify(item)));
      const added = wanted.filter((item) => !seen.has(JSON.stringify(item)));
      if (added.length > 0) storage.setItem(quarantineKey, JSON.stringify([...kept, ...added]));
      this.pendingQuarantine.delete(key);
      return true;
    } catch {
      // Quota or blocked storage: remember what is unparked so the main payload is kept.
      this.pendingQuarantine.set(key, wanted);
      return false;
    }
  }

  private persist(entries: JournalEntry[]): boolean {
    const storage = this.storage();
    if (!storage) {
      this.storageFailed.set(true);
      return false;
    }
    const key = this.storageKey();
    // Retry parking first. While it keeps failing, the main key may still hold the only
    // copy of unrecognised records, so it must not be overwritten; entries stay in memory.
    if (this.pendingQuarantine.has(key) && !this.quarantine(key, [])) {
      this.storageFailed.set(true);
      return false;
    }
    try {
      storage.setItem(key, JSON.stringify(entries));
      this.storageFailed.set(false);
      return true;
    } catch {
      // Quota or private-mode failure: the entry stays in memory for this session.
      this.storageFailed.set(true);
      return false;
    }
  }
}

/** Invalid dates sort as epoch instead of poisoning comparisons with NaN. */
function timeOf(iso: string): number {
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Local calendar day key, so streaks follow the writer's own midnight. */
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Consecutive local days (by `createdAt`) with at least one saved entry. Anchored on today when today has an
 * entry, otherwise on yesterday; anything older means the run has ended.
 */
export function streakFrom(entries: readonly JournalEntry[], today = new Date()): number {
  // Only saved entries extend a streak; autosaved drafts are unfinished writing.
  const counted = entries.filter((entry) => entry.status === 'saved');
  if (counted.length === 0) return 0;

  const days = new Set(counted.map((entry) => dayKey(new Date(timeOf(entry.createdAt)))));
  const yesterday = addDays(today, -1);
  let cursor = days.has(dayKey(today)) ? today : days.has(dayKey(yesterday)) ? yesterday : null;
  if (!cursor) return 0;

  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isJournalEntry(value: unknown): value is JournalEntry {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<JournalEntry>;
  return typeof candidate.id === 'string'
    && typeof candidate.title === 'string'
    && typeof candidate.content === 'string'
    && (candidate.status === 'draft' || candidate.status === 'saved')
    && isIsoDate(candidate.createdAt)
    && isIsoDate(candidate.updatedAt)
    && (candidate.contentFormat === undefined || candidate.contentFormat === 'html');
}

/** Trims, drops blanks and de-duplicates, so stored tags stay clean. */
function normalizeTags(tags: readonly unknown[]): readonly string[] {
  const seen = new Set<string>();
  for (const tag of tags) {
    if (typeof tag !== 'string') continue;
    const trimmed = tag.trim();
    if (trimmed.length > 0) seen.add(trimmed);
  }
  return [...seen];
}

/** Entries written before tags existed read back with an empty tag list. */
function withTags(entry: JournalEntry): JournalEntry {
  return { ...entry, tags: normalizeTags(Array.isArray(entry.tags) ? entry.tags : []) };
}
