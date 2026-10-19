/** Persisted journal entry. Content is editor markup (see `contentFormat`) or legacy plain text. */
export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  /**
   * `html` marks content written by the rich-text editor (already escaped markup).
   * Records without it predate the flag and are detected by `looksLikeHtml`.
   */
  contentFormat?: JournalContentFormat;
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

export type JournalContentFormat = 'html';

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

/** Longest title the editor accepts. */
export const JOURNAL_TITLE_MAX_LENGTH = 120;

/** Trailing whitespace-only content still counts as zero words. */
export function countWords(content: string, format?: JournalContentFormat): number {
  return wordsIn(plainTextFrom(content, format));
}

/** Word count of text that is already plain. */
export function wordsIn(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

/** Tags the rich-text editor produces. */
const EDITOR_TAGS = 'b|strong|i|em|u|div|p|ul|ol|li|span|h[1-6]|blockquote';
/**
 * Heuristic for UNFLAGGED (legacy) records only; `contentFormat: 'html'` skips it.
 * Content counts as editor markup when it has (a) a `<br>` / `<br/>` line tag, (b) a
 * properly paired open+close of a tag the editor produces, or (c) one of the entities
 * the editor escapes. A lone `<b>` or a bare `<` / `>` / `&` is legacy plain text.
 *
 * Remaining inherent ambiguity: legacy plain text that literally contains one of those
 * entities (e.g. the five characters "&amp;") or a paired tag (e.g. "<b>x</b>") cannot
 * be told from editor output, and is treated as markup.
 */
const MARKUP_PATTERN = new RegExp(
  `<br\\s*/?>|<(${EDITOR_TAGS})(?:\\s[^<>]*)?>[\\s\\S]*?</\\1\\s*>|&(?:amp|lt|gt|nbsp|quot|#39);`,
  'i',
);

/**
 * Whether stored content is markup. New entries say so with `contentFormat`; older
 * records are told apart by `MARKUP_PATTERN`, which the editor always produced.
 */
export function looksLikeHtml(content: string, format?: JournalContentFormat): boolean {
  return format === 'html' || MARKUP_PATTERN.test(content);
}

const BLOCK_SELECTOR = 'div,p,li,ul,ol,h1,h2,h3,h4,h5,h6,blockquote,pre,tr';

/**
 * Readable text behind an entry's rich-text markup. Parsing happens in an inert
 * DOMParser document, so nothing in the stored markup can load or execute. Line
 * breaks and block boundaries become whitespace, so words never glue together.
 */
export function plainTextFrom(content: string, format?: JournalContentFormat): string {
  if (!content || !looksLikeHtml(content, format)) return content;
  const Parser = globalThis.DOMParser;
  if (!Parser) {
    return content
      .replace(/<(?:br\s*\/?|\/(?:div|p|li|ul|ol|h[1-6]|blockquote|pre|tr))>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&amp;/gi, '&');
  }
  const parsed = new Parser().parseFromString(content, 'text/html');
  const body = parsed.body;
  body.querySelectorAll('br').forEach((node) => node.replaceWith(parsed.createTextNode('\n')));
  body.querySelectorAll(BLOCK_SELECTOR).forEach((node) => {
    node.prepend(parsed.createTextNode('\n'));
    node.append(parsed.createTextNode('\n'));
  });
  return body.textContent ?? '';
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
 * Editor markup (flagged `html`, or carrying tags/entities) passes through untouched,
 * so save → load → save never escapes twice.
 */
export function toEditorHtml(content: string, format?: JournalContentFormat): string {
  if (content.trim().length === 0) return '';
  if (looksLikeHtml(content, format)) return content;
  return escapeHtml(content).replace(/\r\n?|\n/g, '<br>');
}

/** Sidebar preview line, cut on a word boundary when possible. */
export function previewOf(content: string, maxLength = 44, format?: JournalContentFormat): string {
  const flat = plainTextFrom(content, format).replace(/\s+/g, ' ').trim();
  if (flat.length <= maxLength) return flat;
  const cut = flat.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
