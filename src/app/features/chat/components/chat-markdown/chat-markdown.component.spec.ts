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
});
