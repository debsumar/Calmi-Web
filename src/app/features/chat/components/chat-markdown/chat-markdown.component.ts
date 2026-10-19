import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

export type ChatInlineSegment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'strong'; readonly text: string }
  | { readonly kind: 'code'; readonly text: string }
  | { readonly kind: 'link'; readonly text: string; readonly href: string }
  | { readonly kind: 'break'; readonly text: '' };

export interface ChatMarkdownListItem {
  readonly segments: readonly ChatInlineSegment[];
  readonly children: readonly ChatMarkdownList[];
}

export interface ChatMarkdownList {
  readonly kind: 'list';
  readonly ordered: boolean;
  readonly start: number;
  readonly items: readonly ChatMarkdownListItem[];
}

export type ChatMarkdownBlock =
  | { readonly kind: 'paragraph'; readonly segments: readonly ChatInlineSegment[] }
  | { readonly kind: 'code-block'; readonly text: string }
  | ChatMarkdownList;

interface MutableListItem {
  segments: ChatInlineSegment[];
  children: MutableList[];
}

interface MutableList {
  kind: 'list';
  ordered: boolean;
  start: number;
  items: MutableListItem[];
}

interface ListMarker {
  readonly indent: number;
  readonly ordered: boolean;
  readonly number: number;
  readonly text: string;
}

const FENCE_OPEN = /^\s*(`{3,}|~{3,})[^`]*$/;
const FENCE_CLOSE = /^\s*(`{3,}|~{3,})[ \t]*$/;
const LIST_MARKER = /^( *)(?:([-*+])|(\d{1,9})[.)])[ \t]+(\S.*)$/;
const SAFE_URL = /^https?:\/\/[^\s<>"'`\\]+$/i;
const MAX_LINK_LABEL = 500;

@Component({
  selector: 'app-chat-markdown',
  standalone: true,
  imports: [NgTemplateOutlet],
  host: { class: 'block min-w-0 space-y-2 break-words [overflow-wrap:anywhere]' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat-markdown.component.html',
})
export class ChatMarkdownComponent {
  readonly text = input.required<string>();
  readonly blocks = computed<readonly ChatMarkdownBlock[]>(() => parseMarkdown(this.text()));
}

function parseMarkdown(text: string): readonly ChatMarkdownBlock[] {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/^\t+/, (tabs) => '    '.repeat(tabs.length)));
  const blocks: ChatMarkdownBlock[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = (): void => {
    if (paragraphLines.length === 0) return;
    const segments: ChatInlineSegment[] = [];
    paragraphLines.forEach((line, index) => {
      if (index > 0) segments.push({ kind: 'break', text: '' });
      segments.push(...parseInline(line));
    });
    blocks.push({ kind: 'paragraph', segments });
    paragraphLines = [];
  };

  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? '';

    const fence = FENCE_OPEN.exec(line);
    if (fence) {
      flushParagraph();
      const marker = fence[1] ?? '```';
      const codeLines: string[] = [];
      index += 1;
      // Unterminated fence (still streaming) swallows the rest as code.
      while (index < lines.length) {
        const candidate = lines[index] ?? '';
        const close = FENCE_CLOSE.exec(candidate);
        if (close && (close[1] ?? '')[0] === marker[0] && (close[1] ?? '').length >= marker.length) {
          index += 1;
          break;
        }
        codeLines.push(candidate);
        index += 1;
      }
      blocks.push({ kind: 'code-block', text: codeLines.join('\n') });
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      index += 1;
      continue;
    }

    if (parseMarker(line)) {
      flushParagraph();
      index = parseListRegion(lines, index, blocks);
      continue;
    }

    paragraphLines.push(line);
    index += 1;
  }

  flushParagraph();
  return blocks;
}

function parseMarker(line: string): ListMarker | undefined {
  const match = LIST_MARKER.exec(line);
  if (!match) return undefined;
  const numeric = match[3];
  return {
    indent: (match[1] ?? '').length,
    ordered: numeric !== undefined,
    number: numeric !== undefined ? Number.parseInt(numeric, 10) : 1,
    text: match[4] ?? '',
  };
}

/**
 * Consumes a contiguous list region starting at `startIndex`. Blank lines between items do not end the
 * list (loose lists); indentation drives nesting. Returns the index of the first unconsumed line.
 */
function parseListRegion(lines: readonly string[], startIndex: number, blocks: ChatMarkdownBlock[]): number {
  interface Level { indent: number; list: MutableList; }
  const stack: Level[] = [];
  let lastItem: MutableListItem | undefined;
  let index = startIndex;

  const attach = (list: MutableList, depth: number): void => {
    const parent = stack[depth - 1];
    if (parent) {
      const parentItem = parent.list.items.at(-1);
      parentItem?.children.push(list);
    } else {
      blocks.push(list);
    }
  };

  while (index < lines.length) {
    const line = lines[index] ?? '';
    if (FENCE_OPEN.test(line)) break;

    if (line.trim() === '') {
      // Loose list: only continue if the next non-blank line is another list item.
      let lookahead = index + 1;
      while (lookahead < lines.length && (lines[lookahead] ?? '').trim() === '') lookahead += 1;
      const next = lookahead < lines.length ? lines[lookahead] ?? '' : '';
      if (lookahead < lines.length && !FENCE_OPEN.test(next) && parseMarker(next)) {
        index = lookahead;
        continue;
      }
      break;
    }

    const marker = parseMarker(line);
    if (!marker) {
      // Indented non-item line right after an item continues that item's text.
      if (lastItem && /^ {2,}\S/.test(line)) {
        lastItem.segments.push({ kind: 'break', text: '' }, ...parseInline(line.trim()));
        index += 1;
        continue;
      }
      break;
    }

    while (stack.length > 1 && marker.indent < (stack.at(-1)?.indent ?? 0)) stack.pop();

    const top = stack.at(-1);
    const item: MutableListItem = { segments: [...parseInline(marker.text)], children: [] };
    const newList = (): MutableList => ({
      kind: 'list',
      ordered: marker.ordered,
      start: marker.ordered ? marker.number : 1,
      items: [item],
    });

    if (!top) {
      const list = newList();
      attach(list, 0);
      stack.push({ indent: marker.indent, list });
    } else if (marker.indent >= top.indent + 2) {
      const list = newList();
      attach(list, stack.length);
      stack.push({ indent: marker.indent, list });
    } else if (top.list.ordered === marker.ordered) {
      top.list.items.push(item);
    } else {
      // Marker type switched at the same level: start a sibling list.
      const depth = stack.length - 1;
      stack.pop();
      const list = newList();
      attach(list, depth);
      stack.push({ indent: marker.indent, list });
    }
    lastItem = item;
    index += 1;
  }

  return index;
}

/** Returns a monotone "next index of needle at or after `from`" lookup with cached misses (keeps scans linear). */
function makeFinder(text: string, needle: string): (from: number) => number {
  let cached = -2;
  return (from) => {
    if (cached === -1) return -1;
    if (cached < from) cached = text.indexOf(needle, from);
    return cached;
  };
}

function isSafeUrl(url: string): boolean {
  if (!SAFE_URL.test(url)) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseInline(text: string): readonly ChatInlineSegment[] {
  const segments: ChatInlineSegment[] = [];
  const findBacktick = makeFinder(text, '`');
  const findStrong = makeFinder(text, '**');
  const findLinkMid = makeFinder(text, '](');
  const findParen = makeFinder(text, ')');
  let literalStart = 0;
  let i = 0;

  const pushLiteral = (end: number): void => {
    if (end > literalStart) segments.push({ kind: 'text', text: text.slice(literalStart, end) });
  };
  const consume = (segment: ChatInlineSegment, end: number, from: number): void => {
    pushLiteral(from);
    segments.push(segment);
    i = end;
    literalStart = end;
  };

  while (i < text.length) {
    const char = text[i];

    if (char === '`') {
      const close = findBacktick(i + 1);
      if (close > i + 1) {
        consume({ kind: 'code', text: text.slice(i + 1, close) }, close + 1, i);
        continue;
      }
    } else if (char === '*' && text[i + 1] === '*') {
      const close = findStrong(i + 2);
      if (close > i + 2) {
        consume({ kind: 'strong', text: text.slice(i + 2, close) }, close + 2, i);
        continue;
      }
    } else if (char === '[') {
      const mid = findLinkMid(i + 1);
      if (mid > i + 1 && mid - i <= MAX_LINK_LABEL) {
        const label = text.slice(i + 1, mid);
        const end = findParen(mid + 2);
        if (end !== -1 && !label.includes('[')) {
          const url = text.slice(mid + 2, end).trim();
          if (isSafeUrl(url)) {
            consume({ kind: 'link', text: label, href: url }, end + 1, i);
          } else {
            // Invalid URL: whole construct stays literal text.
            i = end + 1;
          }
          continue;
        }
      }
    }
    i += 1;
  }

  pushLiteral(text.length);
  if (segments.length === 0) segments.push({ kind: 'text', text });
  return segments;
}
