import { describe, expect, it } from 'vitest';
import { countWords, escapeHtml, looksLikeHtml, plainTextFrom, previewOf, toEditorHtml } from './journal-entry.model';

/** What the editor does on load → what the component stores on the next save. */
function roundTrip(content: string, format?: 'html'): string {
  const host = document.createElement('div');
  host.innerHTML = toEditorHtml(content, format);
  return host.innerHTML;
}

describe('journal content round-trip', () => {
  it.each([
    ['Tom & Jerry'],
    ['a < b'],
    ['a > b && c'],
    ['literal &nbsp; text'],
    ['x<b>y'],
    ['line one\nline two'],
  ])('legacy plain text %j converges after one save and stays fixed', (legacy) => {
    const once = roundTrip(legacy);
    const twice = roundTrip(once, 'html');
    const thrice = roundTrip(twice, 'html');
    expect(twice).toBe(once);
    expect(thrice).toBe(once);
  });

  it('shows "Tom & Jerry" as the same text after repeated saves', () => {
    let stored = toEditorHtml('Tom & Jerry');
    for (let i = 0; i < 4; i += 1) stored = roundTrip(stored, 'html');
    expect(plainTextFrom(stored, 'html')).toBe('Tom & Jerry');
  });

  it('keeps editor markup with entities untouched (no double escape)', () => {
    expect(toEditorHtml('Tom &amp; Jerry', 'html')).toBe('Tom &amp; Jerry');
    expect(toEditorHtml('a &lt; b', 'html')).toBe('a &lt; b');
    expect(toEditorHtml('x&nbsp;y')).toBe('x&nbsp;y');
    expect(roundTrip('x<b>y</b>')).toBe('x<b>y</b>');
  });

  it('with the html flag, literal <word> typed as text survives as text', () => {
    const typed = `use ${escapeHtml('<word>')} here`;
    expect(typed).toBe('use &lt;word&gt; here');
    expect(plainTextFrom(typed, 'html')).toBe('use <word> here');
  });

  it('without a flag, entities or tags mark content as markup; bare text does not', () => {
    expect(looksLikeHtml('plain words')).toBe(false);
    expect(looksLikeHtml('a < b')).toBe(false);
    expect(looksLikeHtml('a &amp; b')).toBe(true);
    expect(looksLikeHtml('x<b>y</b>')).toBe(true);
    expect(looksLikeHtml('plain', 'html')).toBe(true);
  });

  it.each([
    ['x<b>y'],
    ['a <b> c'],
    ['1 < 2 > 0'],
    ['Tom & Jerry'],
  ])('unflagged legacy text %j is plain text, escaped once', (legacy) => {
    expect(looksLikeHtml(legacy)).toBe(false);
    expect(toEditorHtml(legacy)).toBe(escapeHtml(legacy));
  });

  it('turns newlines in unflagged legacy text containing a lone tag into line breaks', () => {
    expect(toEditorHtml('x<b>y\nz')).toBe('x&lt;b&gt;y<br>z');
  });

  it.each([
    ['<b>bold</b>'],
    ['a<br>b'],
    ['a<br/>b'],
    ['<div>x</div>'],
    ['Tom &amp; Jerry'],
    ['a &lt; b'],
    ['x&nbsp;y'],
    ['say &quot;hi&quot; &#39;there&#39;'],
  ])('unflagged content %j is editor markup and passes through untouched', (markup) => {
    expect(looksLikeHtml(markup)).toBe(true);
    expect(toEditorHtml(markup)).toBe(markup);
  });

  it('flagged html records are always markup, even when they look like plain text', () => {
    expect(looksLikeHtml('x<b>y', 'html')).toBe(true);
    expect(toEditorHtml('x<b>y', 'html')).toBe('x<b>y');
  });

  it('returns empty markup for blank content', () => {
    expect(toEditorHtml('   ')).toBe('');
  });
});

describe('journal plain text and word count', () => {
  it('treats <br> as a word boundary', () => {
    expect(countWords('a<br>b')).toBe(2);
    expect(previewOf('a<br>b')).toBe('a b');
  });

  it.each([
    ['<div>one</div><div>two</div>', 2],
    ['<p>one</p><p>two three</p>', 3],
    ['<ul><li>one</li><li>two</li></ul>', 2],
    ['one<br><br>two', 2],
    ['<strong>bo</strong>ld', 1],
    ['   ', 0],
    ['', 0],
  ])('counts %j as %i words', (content, expected) => {
    expect(countWords(content)).toBe(expected);
  });
});
