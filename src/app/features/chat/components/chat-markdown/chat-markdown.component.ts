import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

export type ChatInlineSegment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'strong'; readonly text: string }
  | { readonly kind: 'break'; readonly text: '' };

export type ChatMarkdownBlock =
  | { readonly kind: 'paragraph'; readonly segments: readonly ChatInlineSegment[] }
  | { readonly kind: 'unordered-list'; readonly items: readonly (readonly ChatInlineSegment[])[] }
  | { readonly kind: 'ordered-list'; readonly items: readonly (readonly ChatInlineSegment[])[] };

type ListKind = 'unordered-list' | 'ordered-list';

@Component({
  selector: 'app-chat-markdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat-markdown.component.html',
})
export class ChatMarkdownComponent {
  readonly text = input.required<string>();
  readonly blocks = computed<readonly ChatMarkdownBlock[]>(() => parseMarkdown(this.text()));
}

function parseMarkdown(text: string): readonly ChatMarkdownBlock[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: ChatMarkdownBlock[] = [];
  let paragraphLines: string[] = [];
  let listKind: ListKind | undefined;
  let listItems: (readonly ChatInlineSegment[])[] = [];

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

  const flushList = (): void => {
    if (!listKind || listItems.length === 0) return;
    blocks.push(listKind === 'unordered-list'
      ? { kind: 'unordered-list', items: listItems }
      : { kind: 'ordered-list', items: listItems });
    listKind = undefined;
    listItems = [];
  };

  for (const line of lines) {
    if (line.trim() === '') {
      flushParagraph();
      flushList();
      continue;
    }

    const unorderedMatch = /^\s*[-*]\s+(.+)$/.exec(line);
    const orderedMatch = /^\s*\d+\.\s+(.+)$/.exec(line);
    const nextListKind: ListKind | undefined = unorderedMatch
      ? 'unordered-list'
      : orderedMatch
        ? 'ordered-list'
        : undefined;

    if (nextListKind) {
      flushParagraph();
      if (listKind !== nextListKind) flushList();
      listKind = nextListKind;
      const itemText = unorderedMatch?.[1] ?? orderedMatch?.[1] ?? '';
      listItems.push(parseInline(itemText));
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function parseInline(text: string): readonly ChatInlineSegment[] {
  const segments: ChatInlineSegment[] = [];
  const strongPattern = /\*\*([^*\r\n]+)\*\*/g;
  let cursor = 0;
  let match = strongPattern.exec(text);

  while (match) {
    const matchIndex = match.index;
    const matchText = match[1] ?? '';
    if (matchIndex > cursor) segments.push({ kind: 'text', text: text.slice(cursor, matchIndex) });
    segments.push({ kind: 'strong', text: matchText });
    cursor = matchIndex + match[0].length;
    match = strongPattern.exec(text);
  }

  if (cursor < text.length || segments.length === 0) {
    segments.push({ kind: 'text', text: text.slice(cursor) });
  }
  return segments;
}
