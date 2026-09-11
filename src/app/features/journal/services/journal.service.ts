import { computed, DestroyRef, inject, Injectable, linkedSignal, signal } from '@angular/core';
import { AuthService } from '@/core/services/auth.service';
import { countWords, JournalEntry, JournalEntryStatus, JournalSortOrder, JournalStats } from '../models/journal-entry.model';

const STORAGE_PREFIX = 'calmi.journal.entries.v1';

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
   * consecutive local days that have an entry, ending today or yesterday, so a
   * missed evening does not erase the run before the day is over.
   */
  readonly stats = computed<JournalStats>(() => {
    const entries = this.store();
    const totalWords = entries.reduce((sum, entry) => sum + countWords(entry.content), 0);
    const drafts = entries.filter((entry) => entry.status === 'draft').length;
    const lastEntryAt = entries.reduce<string | null>((latest, entry) => {
      if (!latest || timeOf(entry.updatedAt) > timeOf(latest)) return entry.updatedAt;
      return latest;
    }, null);

    return {
      total: entries.length,
      drafts,
      saved: entries.length - drafts,
      totalWords,
      lastEntryAt,
      streakDays: streakFrom(entries),
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
  }

  toggleSortOrder(): void {
    this.sortOrder.update((order) => (order === 'newest' ? 'oldest' : 'newest'));
  }

  byId(id: string | null): JournalEntry | null {
    if (!id) return null;
    return this.store().find((entry) => entry.id === id) ?? null;
  }

  /**
   * Creates the entry when `id` is null, otherwise updates it in place. `persisted`
   * is false when storage rejected the write, so callers never claim a false save.
   */
  upsert(input: { id: string | null; title: string; content: string; status: JournalEntryStatus; tags?: readonly string[] }): { entry: JournalEntry; persisted: boolean } {
    const now = new Date().toISOString();
    const title = input.title.trim() || 'Untitled entry';
    const existing = this.byId(input.id);
    const tags = normalizeTags(input.tags ?? existing?.tags ?? []);

    const entry: JournalEntry = existing
      ? { ...existing, title, content: input.content, status: input.status, tags, updatedAt: now }
      : { id: this.nextId(), title, content: input.content, status: input.status, tags, createdAt: now, updatedAt: now };

    // Merge onto the latest stored copy so a concurrent tab's entries survive.
    const merged = this.merge(entry, existing !== null);
    this.store.set(merged);
    return { entry, persisted: this.persist(merged) };
  }

  remove(id: string): boolean {
    const next = this.read(this.storageKey()).filter((entry) => entry.id !== id);
    this.store.set(next);
    return this.persist(next);
  }

  private merge(entry: JournalEntry, isUpdate: boolean): JournalEntry[] {
    const stored = this.read(this.storageKey());
    const others = stored.filter((item) => item.id !== entry.id);
    return isUpdate && stored.some((item) => item.id === entry.id)
      ? stored.map((item) => (item.id === entry.id ? entry : item))
      : [entry, ...others];
  }

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

  private read(key: string): JournalEntry[] {
    let raw: string | null = null;
    try {
      raw = this.storage()?.getItem(key) ?? null;
    } catch {
      // Storage read threw (blocked site data); treat as an empty journal.
      return [];
    }
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isJournalEntry).map(withTags) : [];
    } catch {
      return [];
    }
  }

  private persist(entries: JournalEntry[]): boolean {
    const storage = this.storage();
    if (!storage) {
      this.storageFailed.set(true);
      return false;
    }
    try {
      storage.setItem(this.storageKey(), JSON.stringify(entries));
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
 * Consecutive days with at least one entry. Anchored on today when today has an
 * entry, otherwise on yesterday; anything older means the run has ended.
 */
export function streakFrom(entries: readonly JournalEntry[], today = new Date()): number {
  if (entries.length === 0) return 0;

  const days = new Set(entries.map((entry) => dayKey(new Date(timeOf(entry.createdAt)))));
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
    && isIsoDate(candidate.updatedAt);
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
