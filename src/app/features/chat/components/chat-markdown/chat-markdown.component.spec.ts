// @vitest-environment jsdom
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ChatMarkdownComponent } from './chat-markdown.component';

describe('ChatMarkdownComponent', () => {
  let fixture: ComponentFixture<ChatMarkdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatMarkdownComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ChatMarkdownComponent);
  });

  const render = (text: string): HTMLElement => {
    fixture.componentRef.setInput('text', text);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('renders strong inline text', () => {
    const root = render('**calm**');
    expect(root.querySelector('strong')?.textContent).toBe('calm');
  });

  it('renders a newline as a line break', () => {
    const root = render('one\ntwo');
    expect(root.querySelector('br')).not.toBeNull();
  });

  it('renders unordered list items', () => {
    const root = render('- a\n- b');
    expect(root.querySelectorAll('ul > li')).toHaveLength(2);
    expect(root.querySelector('ul > li')?.textContent?.trim()).toBe('a');
  });

  it('renders ordered list items', () => {
    const root = render('1. a\n2. b');
    expect(root.querySelectorAll('ol > li')).toHaveLength(2);
    expect(root.querySelector('ol > li')?.textContent?.trim()).toBe('a');
  });

  it('keeps HTML-looking input as text without creating elements or handlers', () => {
    const root = render('<img src=x onerror=alert(1)>');

    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('[onerror]')).toBeNull();
    expect(root.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('gives lists visible bullets and numbers via Tailwind classes', () => {
    const root = render('- a\n- b\n\n1. x\n2. y');
    const ul = root.querySelector('ul') as HTMLElement;
    const ol = root.querySelector('ol') as HTMLElement;

    expect(ul.classList).toContain('list-disc');
    expect(ul.classList).toContain('pl-6');
    expect(ol.classList).toContain('list-decimal');
    expect(ol.classList).toContain('pl-6');
  });

  it('renders a loose ordered list as one continuous <ol>', () => {
    const root = render('1. a\n\n2. b\n\n3. c');

    expect(root.querySelectorAll('ol')).toHaveLength(1);
    expect([...root.querySelectorAll('ol > li')].map((li) => li.textContent?.trim())).toEqual(['a', 'b', 'c']);
  });

  it('preserves the start number of an ordered list', () => {
    const root = render('3. c\n4. d');
    expect(root.querySelector('ol')?.getAttribute('start')).toBe('3');
  });

  it('nests indented lists without restarting the parent numbering', () => {
    const root = render('1. one\n   - inner a\n   - inner b\n2. two');
    const outer = root.querySelector('ol') as HTMLElement;

    expect(root.querySelectorAll('ol')).toHaveLength(1);
    expect(outer.querySelectorAll(':scope > li')).toHaveLength(2);
    expect(outer.querySelectorAll(':scope > li:first-child > ul > li')).toHaveLength(2);
    expect(outer.getAttribute('start')).toBe('1');
    expect(outer.querySelector(':scope > li:nth-child(2)')?.textContent?.trim()).toBe('two');
  });

  it('renders fenced code as <pre><code> text, never parsing list syntax or blank lines inside', () => {
    const root = render('before\n```ts\n- not a list\n\n1. nor this\n<b>x</b>\n```\nafter');
    const code = root.querySelector('pre > code') as HTMLElement;

    expect(code.textContent).toBe('- not a list\n\n1. nor this\n<b>x</b>');
    expect(root.querySelector('ul, ol')).toBeNull();
    expect(root.querySelector('pre b')).toBeNull();
    expect(root.textContent).toContain('before');
    expect(root.textContent).toContain('after');
  });

  it('survives an unterminated fence and unterminated bold while streaming', () => {
    const fenced = render('intro\n```\nconst a = 1;\n');
    expect(fenced.querySelector('pre > code')?.textContent).toContain('const a = 1;');

    fixture.componentRef.setInput('text', 'half **bold and `code');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('strong')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('half **bold and `code');
  });

  it('renders inline code through text interpolation', () => {
    const root = render('use `<script>x</script>` here');
    const code = root.querySelector('code') as HTMLElement;

    expect(code.textContent).toBe('<script>x</script>');
    expect(root.querySelector('script')).toBeNull();
  });

  it('renders validated http(s) links with a safe target and rel', () => {
    const root = render('see [Calmi](https://calmi.app/path?x=1) and [plain](http://example.com)');
    const links = [...root.querySelectorAll('a')];

    expect(links.map((link) => link.getAttribute('href'))).toEqual(['https://calmi.app/path?x=1', 'http://example.com']);
    for (const link of links) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    }
    expect(links[0]?.textContent).toBe('Calmi');
  });

  it.each([
    ['javascript:alert(1)'],
    ['JaVaScRiPt:alert(1)'],
    ['data:text/html,x'],
    ['vbscript:x'],
    ['//evil.example.com'],
    ['not a url'],
  ])('keeps a link with unsafe url %s as literal text', (url) => {
    const root = render(`[click](${url})`);

    expect(root.querySelector('a')).toBeNull();
    expect(root.textContent).toContain(`[click](${url})`);
  });

  it('handles pathological repeated markers in linear time', () => {
    const start = performance.now();
    render('[' .repeat(20000) + '`'.repeat(20000) + '**'.repeat(10000));
    expect(performance.now() - start).toBeLessThan(2000);
  });
});
