// @vitest-environment jsdom
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LucideChevronDown, provideLucideIcons } from '@lucide/angular';
import { describe, expect, it, vi } from 'vitest';
import { SelectMenuComponent, SelectMenuOption } from './select-menu.component';

const OPTIONS: readonly SelectMenuOption[] = [
  { value: null, label: 'Any experience' },
  { value: 2, label: '2+ years' },
  { value: 4, label: '4+ years' },
];

describe('SelectMenuComponent', () => {
  let fixture: ComponentFixture<SelectMenuComponent>;

  async function create(options: readonly SelectMenuOption[] = OPTIONS, value: string | number | null = 2): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [SelectMenuComponent],
      providers: [provideLucideIcons(LucideChevronDown)],
    }).compileComponents();
    fixture = TestBed.createComponent(SelectMenuComponent);
    fixture.componentRef.setInput('options', options);
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('labelledBy', 'experience-label');
    fixture.detectChanges();
  }

  it('renders selected label, emits chosen value, and marks selection beyond color', async () => {
    await create();
    const root = fixture.nativeElement as HTMLElement;
    const emitted: Array<string | number | null> = [];
    fixture.componentInstance.valueChange.subscribe((value) => emitted.push(value));

    expect(root.querySelector('button')?.textContent).toContain('2+ years');
    root.querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    root.querySelectorAll<HTMLButtonElement>('[role="option"]')[2]!.click();
    fixture.detectChanges();

    expect(emitted).toEqual([4]);
    expect(root.querySelector('[role="listbox"]')).toBeNull();
  });

  it('keeps one tab stop, exposes valid ARIA state, and supports keyboard selection', async () => {
    await create(OPTIONS, null);
    const root = fixture.nativeElement as HTMLElement;
    const trigger = root.querySelector<HTMLButtonElement>('button')!;
    const emitted: Array<string | number | null> = [];
    fixture.componentInstance.valueChange.subscribe((value) => emitted.push(value));

    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    // aria-activedescendant is only honoured on a combobox/listbox role.
    expect(trigger.getAttribute('role')).toBe('combobox');
    expect(trigger.getAttribute('aria-activedescendant')).toContain('-option-0');
    expect(root.querySelector('[role="listbox"]')?.getAttribute('aria-labelledby')).toBe('experience-label');
    expect(root.querySelectorAll('[role="option"][tabindex="-1"]')).toHaveLength(3);
    expect(root.querySelector('[role="option"]')?.className).toContain('ring-brand');

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-activedescendant')).toContain('-option-2');

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-activedescendant')).toContain('-option-0');
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-activedescendant')).toContain('-option-2');

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    fixture.detectChanges();
    expect(emitted).toEqual([4]);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on Escape with focus return, Tab, and outside click', async () => {
    await create(OPTIONS, null);
    const root = fixture.nativeElement as HTMLElement;
    const trigger = root.querySelector<HTMLButtonElement>('button')!;
    trigger.focus();

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    await Promise.resolve();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);

    trigger.click();
    fixture.detectChanges();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    trigger.click();
    fixture.detectChanges();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('handles empty options without an invalid active descendant or null emission', async () => {
    await create([], null);
    const root = fixture.nativeElement as HTMLElement;
    const trigger = root.querySelector<HTMLButtonElement>('button')!;
    const emitted: Array<string | number | null> = [];
    fixture.componentInstance.valueChange.subscribe((value) => emitted.push(value));

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-activedescendant')).toBeNull();

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(emitted).toEqual([]);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('scrolls keyboard-active options into view, supports typeahead, and tracks pointer active state', async () => {
    await create(OPTIONS, null);
    const root = fixture.nativeElement as HTMLElement;
    const trigger = root.querySelector<HTMLButtonElement>('button')!;
    const emitted: Array<string | number | null> = [];
    fixture.componentInstance.valueChange.subscribe((value) => emitted.push(value));

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    const options = root.querySelectorAll<HTMLElement>('[role="option"]');
    const scrollIntoView = vi.fn();
    Object.assign(options[2]!, { scrollIntoView });

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });

    options[1]!.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-activedescendant')).toContain('-option-1');

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true }));
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-activedescendant')).toContain('-option-2');
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(emitted).toEqual([4]);
  });

  it('repositions upward on capture scroll and leaves closed shortcut keys untouched', async () => {
    await create();
    const root = fixture.nativeElement as HTMLElement;
    const trigger = root.querySelector<HTMLButtonElement>('button')!;
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    const home = new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true });
    const end = new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true });
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    [escape, home, end, tab].forEach((event) => trigger.dispatchEvent(event));
    expect([escape, home, end, tab].every((event) => !event.defaultPrevented)).toBe(true);

    trigger.click();
    fixture.detectChanges();
    const panel = root.querySelector<HTMLElement>('[role="listbox"]')!;
    Object.assign(trigger, { getBoundingClientRect: () => new DOMRect(0, 700, 200, 44) });
    Object.assign(panel, { getBoundingClientRect: () => new DOMRect(0, 0, 200, 300) });
    const descriptor = Object.getOwnPropertyDescriptor(window, 'innerHeight');
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });
    document.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    expect(panel.className).toContain('bottom-full');
    if (descriptor) Object.defineProperty(window, 'innerHeight', descriptor);
  });

  it('uses semantic color utilities only', async () => {
    await create();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    const rendered = (fixture.nativeElement as HTMLElement).innerHTML;
    expect(rendered).toMatch(/bg-sunken/);
    expect(rendered).toMatch(/bg-elevated/);
    expect(rendered).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(|hsl\(|(?:bg|text|border)-(?:gray|white|black)(?:-|["'\s])/i);
  });
});
