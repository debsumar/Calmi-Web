/** Persisted journal entry. Content is plain text; markdown markers are literal. */
export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  /** `draft` is an unfinished note, `saved` is one the user committed. */
  status: JournalEntryStatus;
  /** Optional mood/activity labels chosen from `JOURNAL_TAGS`. */
  tags: readonly string[];
  /** ISO timestamps so stored entries survive JSON round-trips. */
  createdAt: string;
  updatedAt: string;
}

/**
 * Tag catalogue offered beside the editor, grouped so related labels stay together
 * as the chip list wraps: state, feeling, activity, routine, then meals.
 */
export const JOURNAL_TAGS: readonly string[] = [
  'Overthinking', 'Working', 'Self-care',
  'Excited', 'Relaxed', 'Hopeful', 'Grateful',
  'Exercise', 'TV', 'Music', 'Gaming',
  'Shower', 'Brush teeth', 'Walk', 'Drawing',
  'Breakfast', 'Lunch', 'Dinner', 'Night-snack',
];

/** Writing prompts for a blank page; `Refresh` rotates through this pool. */
export const JOURNAL_PROMPTS: readonly string[] = [
  "What's been on my mind lately?",
  "What's one thing I'm proud of today?",
  'How can I be kinder to myself?',
  'What drained me today, and what refilled me?',
  'What am I grateful for right now?',
  'What would I tell a friend in my situation?',
  'What do I want tomorrow to feel like?',
  'What am I avoiding, and why?',
  'When did I feel most like myself today?',
];

export type JournalEntryStatus = 'draft' | 'saved';

export type JournalSortOrder = 'newest' | 'oldest';

/** Device-derived journal totals, shared with the profile dashboard. */
export interface JournalStats {
  total: number;
  saved: number;
  drafts: number;
  totalWords: number;
  /** ISO timestamp of the most recent write, or null when nothing is written. */
  lastEntryAt: string | null;
  /** Consecutive local days with an entry, ending today or yesterday. */
  streakDays: number;
}

/** Trailing whitespace-only content still counts as zero words. */
export function countWords(content: string): number {
  const trimmed = plainTextFrom(content).trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

/**
 * Readable text behind an entry's rich-text markup. Parsing happens in an inert
 * DOMParser document, so nothing in the stored markup can load or execute.
 */
export function plainTextFrom(content: string): string {
  if (!content || !/[<&]/.test(content)) return content;
  const Parser = globalThis.DOMParser;
  if (!Parser) return content.replace(/<[^>]*>/g, ' ');
  const parsed = new Parser().parseFromString(content, 'text/html');
  return parsed.body.textContent ?? '';
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Editor markup for stored content. Entries written before the rich-text editor
 * are plain text, so they are escaped and their newlines become line breaks.
 */
export function toEditorHtml(content: string): string {
  if (content.trim().length === 0) return '';
  if (/<[a-z][\s\S]*>/i.test(content)) return content;
  return escapeHtml(content).replace(/\r\n?|\n/g, '<br>');
}

/** Sidebar preview line, cut on a word boundary when possible. */
export function previewOf(content: string, maxLength = 44): string {
  const flat = plainTextFrom(content).replace(/\s+/g, ' ').trim();
  if (flat.length <= maxLength) return flat;
  const cut = flat.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
