import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  LucideArrowRight,
  LucideArrowUpDown,
  LucideBold,
  LucideChevronDown,
  LucideChevronUp,
  LucideCircleAlert,
  LucideCircleCheck,
  LucideItalic,
  LucideLock,
  LucideMaximize2,
  LucideMinimize2,
  LucidePlus,
  LucideSmartphone,
  LucideTrash2,
  LucideUnderline,
  provideLucideIcons,
} from '@lucide/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provideAuthServiceStub } from '@/core/services/testing/auth.service.stub';
import { JournalService } from '../../services/journal.service';
import { JournalComponent } from './journal.component';

describe('JournalComponent', () => {
  let fixture: ComponentFixture<JournalComponent>;
  let component: JournalComponent;
  let journal: JournalService;

  /** Selects a character range inside the first text node of `host`. */
  function selectText(host: HTMLElement, start: number, end: number): void {
    const textNode = host.firstChild ?? host;
    const range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, end);
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  beforeEach(async () => {
    localStorage.clear();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [JournalComponent],
      providers: [
        provideRouter([]),
        provideAuthServiceStub(),
        provideLucideIcons(
          LucideArrowRight, LucideArrowUpDown, LucideBold, LucideChevronDown, LucideChevronUp,
          LucideCircleAlert, LucideCircleCheck,
          LucideItalic, LucideLock, LucideMaximize2, LucideMinimize2, LucidePlus, LucideSmartphone,
          LucideTrash2, LucideUnderline,
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(JournalComponent);
    component = fixture.componentInstance;
    journal = TestBed.inject(JournalService);
    await fixture.whenStable();
  });

  it('shows the empty state before anything is written', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('h1#journal-title')?.textContent).toContain('Journal');
    expect(root.textContent).toContain('No entries yet.');
  });

  it('ignores Save while the editor is empty', () => {
    component.save('saved');

    expect(journal.count()).toBe(0);
    expect(component.lastSaved()).toBeNull();
  });

  it('saves an entry and lists it', async () => {
    component.title.set('A quiet moment');
    component.content.set('Today felt heavier than usual.');
    component.save('saved');
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    expect(journal.count()).toBe(1);
    expect(component.lastSaved()).toBe('saved');
    expect(component.selectedId()).not.toBeNull();
    expect(component.isDirty()).toBe(false);
    expect(root.textContent).toContain('A quiet moment');
    expect(root.textContent).toContain('Entry saved.');
  });

  it('reports a blocked write instead of claiming a save', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    try {
      component.content.set('cannot persist');
      component.save('saved');
      await fixture.whenStable();

      expect(component.lastSaved()).toBeNull();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('This device blocked saving.');
    } finally {
      setItem.mockRestore();
    }
  });

  it('reports word count from the editor content', () => {
    component.content.set('three little words');

    expect(component.wordCount()).toBe(3);
  });

  it('re-saving the selected entry updates it instead of adding one', () => {
    component.content.set('first pass');
    component.save('draft');
    component.content.set('second pass');
    component.save('saved');

    expect(journal.count()).toBe(1);
    expect(journal.entries()[0].content).toBe('second pass');
    expect(journal.entries()[0].status).toBe('saved');
  });

  it('loads a selected entry into the editor', () => {
    const entry = journal.upsert({ id: null, title: 'Little wins', content: 'Felt more productive.', status: 'saved' }).entry;
    component.select(entry);

    expect(component.selectedId()).toBe(entry.id);
    expect(component.title()).toBe('Little wins');
    expect(component.content()).toBe('Felt more productive.');
  });

  it('asks before discarding unsaved work when switching entries', async () => {
    const entry = journal.upsert({ id: null, title: 'Stored', content: 'stored body', status: 'saved' }).entry;
    component.content.set('unsaved thought');

    component.select(entry);
    await fixture.whenStable();

    expect(component.pendingSwitch()).not.toBeNull();
    expect(component.content()).toBe('unsaved thought');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('unsaved changes');

    component.cancelSwitch();
    expect(component.content()).toBe('unsaved thought');

    component.select(entry);
    component.discardAndSwitch();
    expect(component.selectedId()).toBe(entry.id);
    expect(component.content()).toBe('stored body');
  });

  it('asks before discarding unsaved work when starting a new entry', () => {
    component.content.set('unsaved thought');

    component.startNewEntry();
    expect(component.pendingSwitch()).toEqual({ kind: 'new' });
    expect(component.content()).toBe('unsaved thought');

    component.discardAndSwitch();
    expect(component.content()).toBe('');
    expect(component.selectedId()).toBeNull();
  });

  it('requires a confirmation step before deleting', () => {
    const entry = journal.upsert({ id: null, title: 'Gone soon', content: 'bye', status: 'saved' }).entry;
    component.select(entry);

    component.requestDelete(entry);
    expect(component.pendingDeleteId()).toBe(entry.id);
    expect(journal.count()).toBe(1);

    component.cancelDelete();
    expect(component.pendingDeleteId()).toBeNull();
    expect(journal.count()).toBe(1);

    component.requestDelete(entry);
    component.confirmDelete(entry);
    expect(journal.count()).toBe(0);
    expect(component.selectedId()).toBeNull();
    expect(component.content()).toBe('');
  });

  it('moves focus to the delete confirmation button', async () => {
    const entry = journal.upsert({ id: null, title: 'Focus me', content: 'x', status: 'saved' }).entry;
    component.requestDelete(entry);
    await fixture.whenStable();

    const confirm = (fixture.nativeElement as HTMLElement).querySelector('button[aria-describedby]') as HTMLButtonElement;
    expect(confirm.textContent).toContain('Yes, delete');
    expect(document.activeElement).toBe(confirm);
  });

  it('applies real bold, italic and underline markup to the selection', async () => {
    const editor = (fixture.nativeElement as HTMLElement).querySelector('[contenteditable="true"]') as HTMLElement;
    editor.textContent = 'calm mind';
    component.onEditorInput();
    await fixture.whenStable();

    selectText(editor, 0, 4);
    component.applyFormat('bold');
    expect(component.content()).toMatch(/<(b|strong)>calm<\/(b|strong)>/);
    expect(component.plainText()).toBe('calm mind');

    // Selection still covers the wrapped run, so the same button removes it.
    component.applyFormat('bold');
    expect(component.content()).not.toMatch(/<(b|strong)>/);
    expect(component.plainText()).toBe('calm mind');

    // Unwrapping splits text nodes; normalise before selecting by offset again.
    editor.normalize();
    selectText(editor, 0, 4);
    component.applyFormat('italic');
    expect(component.content()).toMatch(/<(i|em)>calm<\/(i|em)>/);

    const emphasis = editor.querySelector('i, em') as HTMLElement;
    selectText(emphasis, 0, 4);
    component.applyFormat('underline');
    expect(component.content()).toMatch(/<u>/);
    expect(component.plainText()).toBe('calm mind');
  });

  it('drives toolbar pressed state from the caret position', async () => {
    const root = fixture.nativeElement as HTMLElement;
    const editor = root.querySelector('[contenteditable="true"]') as HTMLElement;
    editor.textContent = 'calm mind';
    component.onEditorInput();
    await fixture.whenStable();

    selectText(editor, 0, 4);
    component.applyFormat('bold');
    await fixture.whenStable();

    expect(component.isActive('bold')).toBe(true);
    const boldButton = root.querySelector('button[aria-label="Bold"]');
    expect(boldButton?.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('button[aria-label="Italic"]')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('formats through Ctrl+B without inserting characters', async () => {
    const editor = (fixture.nativeElement as HTMLElement).querySelector('[contenteditable="true"]') as HTMLElement;
    editor.textContent = 'calm mind';
    component.onEditorInput();
    await fixture.whenStable();
    selectText(editor, 0, 4);

    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true, cancelable: true }));

    expect(component.content()).toMatch(/<(b|strong)>calm<\/(b|strong)>/);
    expect(component.plainText()).toBe('calm mind');
  });

  it('counts words and previews entries from the text, not the markup', () => {
    component.content.set('<strong>three</strong> little <em>words</em>');

    expect(component.wordCount()).toBe(3);
    expect(component.plainText()).toBe('three little words');
  });

  it('pastes as plain text so foreign markup never enters an entry', async () => {
    const editor = (fixture.nativeElement as HTMLElement).querySelector('[contenteditable="true"]') as HTMLElement;
    editor.focus();
    selectText(editor, 0, 0);

    const clipboardData = { getData: (type: string) => (type === 'text/plain' ? 'pasted text' : '<img src=x onerror=alert(1)>') };
    const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent;
    Object.defineProperty(event, 'clipboardData', { value: clipboardData });
    editor.dispatchEvent(event);
    await fixture.whenStable();

    expect(component.plainText()).toBe('pasted text');
    expect(component.content()).not.toContain('<img');
  });

  it('toggles the expanded editor height', async () => {
    const editor = (fixture.nativeElement as HTMLElement).querySelector('[contenteditable="true"]') as HTMLElement;
    expect(editor.style.minHeight).toBe('16rem');

    component.toggleExpanded();
    await fixture.whenStable();
    expect(component.expanded()).toBe(true);
    expect(editor.style.minHeight).toBe('70vh');
  });

  it('flips the sidebar sort order from the UI', async () => {
    const toggle = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Newest first')) as HTMLButtonElement;

    toggle.click();
    await fixture.whenStable();

    expect(component.sortOrder()).toBe('oldest');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Oldest first');
  });

  it('links Continue on App to the download page at every width', () => {
    const card = (fixture.nativeElement as HTMLElement).querySelector('aside[aria-labelledby="journal-app-title"]') as HTMLElement;
    const link = card.querySelector('a[href="/download"]');

    // Previously xl-only; it must not be hidden on phones and tablets.
    expect(card.className).not.toContain('hidden');
    expect(card.className).toContain('order-3');
    expect(link?.textContent).toContain('Open in App');
  });

  it('collapses the entry list behind a disclosure below lg', async () => {
    const root = fixture.nativeElement as HTMLElement;
    const disclosure = root.querySelector('button[aria-controls="journal-entry-list"]') as HTMLButtonElement;
    const list = root.querySelector('#journal-entry-list') as HTMLElement;

    expect(component.listOpen()).toBe(false);
    expect(disclosure.className).toContain('lg:hidden');
    expect(disclosure.getAttribute('aria-expanded')).toBe('false');
    // Hidden on small screens only: `lg:block` keeps it open on desktop.
    expect(list.className).toContain('lg:block');
    expect(list.classList.contains('hidden')).toBe(true);

    disclosure.click();
    await fixture.whenStable();

    expect(component.listOpen()).toBe(true);
    expect(disclosure.getAttribute('aria-expanded')).toBe('true');
    expect(list.classList.contains('hidden')).toBe(false);
    expect(disclosure.textContent).toContain('Hide entries');
  });

  it('puts the editor before the entry list in mobile source order', () => {
    const root = fixture.nativeElement as HTMLElement;
    const sidebar = root.querySelector('aside[aria-labelledby="journal-entries-title"]') as HTMLElement;

    expect(sidebar.className).toContain('order-2');
    expect(sidebar.className).toContain('lg:order-1');
  });

  it('collapses the mobile list once an entry is opened', () => {
    const entry = journal.upsert({ id: null, title: 'Pick me', content: 'body', status: 'saved' }).entry;
    component.listOpen.set(true);

    component.select(entry);

    expect(component.selectedId()).toBe(entry.id);
    expect(component.listOpen()).toBe(false);
  });

  it('shows the entry count beside the list heading', async () => {
    journal.upsert({ id: null, title: 'One', content: 'a', status: 'saved' });
    journal.upsert({ id: null, title: 'Two', content: 'b', status: 'saved' });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('#journal-entries-title')?.textContent).toContain('(2)');
  });
});
