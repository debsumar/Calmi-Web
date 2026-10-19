import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import {
  LucideArrowLeft,
  LucideArrowRight,
  LucideArrowUpDown,
  LucideBold,
  LucideCheck,
  LucideChevronDown,
  LucideChevronUp,
  LucideCircleAlert,
  LucideCircleCheck,
  LucideItalic,
  LucideLock,
  LucideMaximize2,
  LucideMinimize2,
  LucideNotebookPen,
  LucidePlus,
  LucideRefreshCw,
  LucideSmartphone,
  LucideTrash2,
  LucideUnderline,
  LucideUser,
  provideLucideIcons,
} from '@lucide/angular';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '@/core/services/auth.service';
import { provideAuthServiceStub } from '@/core/services/testing/auth.service.stub';
import { JournalService } from '../../services/journal.service';
import { JournalComponent } from './journal.component';

@Component({ template: '' })
class BlankComponent {}

describe('JournalComponent', () => {
  let fixture: ComponentFixture<JournalComponent>;
  let component: JournalComponent;
  let journal: JournalService;

  /** Journals require an account, so most save paths need a signed-in user. */
  function signIn(): void {
    TestBed.inject(AuthService).currentUser.set({ id: 'user-1', email: 'person@example.com' } as never);
  }

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

  /** Configures the TestBed and mounts the page. Used by the sign-in restore test too. */
  async function createFixture(): Promise<ComponentFixture<JournalComponent>> {
    await TestBed.configureTestingModule({
      imports: [JournalComponent],
      providers: [
        provideRouter([{ path: 'auth/identify', component: BlankComponent }]),
        provideAuthServiceStub(),
        provideLucideIcons(
          LucideArrowLeft, LucideArrowRight, LucideArrowUpDown, LucideBold, LucideCheck, LucideChevronDown, LucideChevronUp,
          LucideCircleAlert, LucideCircleCheck,
          LucideItalic, LucideLock, LucideMaximize2, LucideMinimize2, LucideNotebookPen, LucidePlus,
          LucideRefreshCw, LucideSmartphone,
          LucideTrash2, LucideUnderline, LucideUser,
        ),
      ],
    }).compileComponents();

    return TestBed.createComponent(JournalComponent);
  }

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    fixture = await createFixture();
    component = fixture.componentInstance;
    journal = TestBed.inject(JournalService);
    await fixture.whenStable();
  });

  it('shows the empty state before anything is written', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('h1#journal-title')?.textContent).toContain('Journal');
    expect(root.querySelector('nav[aria-label="Breadcrumb"] a[href="/home"]')).not.toBeNull();
    expect(root.querySelector('nav[aria-label="Breadcrumb"] [aria-current="page"]')?.textContent).toContain('Journal');
    expect(root.textContent).toContain('No entries yet.');
  });

  it('uses an accessible title placeholder without a visible label', () => {
    const root = fixture.nativeElement as HTMLElement;
    const input = root.querySelector<HTMLInputElement>('#journal-entry-title');

    expect(input).not.toBeNull();
    expect(root.querySelector('label[for="journal-entry-title"]')).toBeNull();
    expect(input?.getAttribute('placeholder')).toBe("What's on your mind today?");
    expect(input?.getAttribute('aria-label')).toBe('Entry title');
    expect(input?.className).toContain('border-hairline');
    expect(input?.className).toContain('min-h-11');
  });

  it('shows the Figma body placeholder only while the editor is empty', async () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.textContent).toContain('Take a moment. Write freely.');
    expect(root.textContent).toContain('You can write about anything');
    // The prompt lives in the title placeholder now, so the body must not repeat it.
    expect(root.textContent).not.toContain("What's on your mind today?");

    component.content.set('<strong>a first line</strong>');
    await fixture.whenStable();

    expect(root.textContent).not.toContain('You can write about anything');
  });

  it('ignores Save while the editor is empty', () => {
    component.save('saved');

    expect(journal.count()).toBe(0);
    expect(component.lastSaved()).toBeNull();
  });

  it('saves an entry and lists it', async () => {
    signIn();
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
    signIn();
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
    signIn();
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

  it('blocks saving while signed out and prompts for sign-in instead', async () => {
    component.title.set('A quiet moment');
    component.content.set('Today felt heavier than usual.');

    component.save('saved');
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    const dialog = root.querySelector('[role="dialog"]');

    expect(journal.count()).toBe(0);
    expect(component.lastSaved()).toBeNull();
    expect(component.signInPromptOpen()).toBe(true);
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.textContent).toContain('Sign in to save this entry');
    // The writing is not thrown away.
    expect(component.content()).toBe('Today felt heavier than usual.');
  });

  it('blocks Draft as well as Save while signed out', () => {
    component.content.set('draft body');

    component.save('draft');

    expect(journal.count()).toBe(0);
    expect(component.signInPromptOpen()).toBe(true);
  });

  it('focuses the sign-in action and closes on Keep writing', async () => {
    component.content.set('unsaved thought');
    component.save('saved');
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    const signIn = Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.includes('Sign in')) as HTMLButtonElement;
    expect(document.activeElement).toBe(signIn);

    const keepWriting = Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Keep writing') as HTMLButtonElement;
    keepWriting.click();
    await fixture.whenStable();

    expect(component.signInPromptOpen()).toBe(false);
    expect(journal.count()).toBe(0);
  });

  it('stashes the entry and routes to sign-in with a return url', async () => {
    const router = TestBed.inject(Router);
    component.title.set('Held thought');
    component.content.set('kept across sign-in');
    component.save('saved');
    await fixture.whenStable();

    component.continueToSignIn();
    await fixture.whenStable();

    expect(router.url).toBe('/auth/identify?returnUrl=%2Fjournal');
    expect(JSON.parse(sessionStorage.getItem('calmi.journal.pending-entry.v1') ?? '{}')).toEqual({
      title: 'Held thought',
      content: 'kept across sign-in',
      tags: [],
    });
  });

  it('restores a stashed entry after returning from sign-in', async () => {
    sessionStorage.setItem('calmi.journal.pending-entry.v1', JSON.stringify({ title: 'Back again', content: 'restored body' }));

    TestBed.resetTestingModule();
    const restored = await createFixture();
    await restored.whenStable();

    expect(restored.componentInstance.title()).toBe('Back again');
    expect(restored.componentInstance.plainText()).toBe('restored body');
    // The stash is single-use.
    expect(sessionStorage.getItem('calmi.journal.pending-entry.v1')).toBeNull();
  });

  it('saves normally once signed in', async () => {
    TestBed.inject(AuthService).currentUser.set({ id: 'user-1', email: 'person@example.com' } as never);
    component.title.set('A quiet moment');
    component.content.set('Today felt heavier than usual.');

    component.save('saved');
    await fixture.whenStable();

    expect(component.signInPromptOpen()).toBe(false);
    expect(journal.count()).toBe(1);
    expect(component.lastSaved()).toBe('saved');
  });

  it('links Continue on App to the download page at every width', () => {
    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href="/download"]') as HTMLAnchorElement;
    const rail = link.closest('aside') as HTMLElement;

    // Previously xl-only; it must not be hidden on phones and tablets.
    expect(rail.className).not.toContain('hidden');
    expect(rail.className).toContain('order-3');
    expect(link.textContent).toContain('Open in App');
    expect(rail.querySelector('#journal-app-title')?.textContent).toContain('Continue on App');
  });

  it('toggles tags from the rail and reports the selection', async () => {
    const root = fixture.nativeElement as HTMLElement;
    const chip = Array.from(root.querySelectorAll('button[aria-pressed]'))
      .find((button) => button.textContent?.trim() === 'Overthinking') as HTMLButtonElement;

    expect(root.querySelector('#journal-tags-title')?.textContent).toContain('Add tags (optional)');
    expect(chip.getAttribute('aria-pressed')).toBe('false');

    chip.click();
    await fixture.whenStable();

    expect(component.selectedTags()).toEqual(['Overthinking']);
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    expect(root.textContent).toContain('1 selected: Overthinking');

    chip.click();
    await fixture.whenStable();

    expect(component.selectedTags()).toEqual([]);
    expect(root.textContent).toContain('No tags selected.');
  });

  it('saves selected tags with the entry and restores them on select', () => {
    signIn();
    component.content.set('tagged body');
    component.toggleTag('Grateful');
    component.toggleTag('Walk');
    component.save('saved');

    const stored = journal.entries()[0];
    expect(stored.tags).toEqual(['Grateful', 'Walk']);
    expect(component.isDirty()).toBe(false);

    component.startNewEntry();
    expect(component.selectedTags()).toEqual([]);

    component.select(stored);
    expect(component.selectedTags()).toEqual(['Grateful', 'Walk']);
    expect(component.isDirty()).toBe(false);
  });

  it('treats a tag change as unsaved work', () => {
    signIn();
    component.content.set('body');
    component.save('saved');
    expect(component.isDirty()).toBe(false);

    component.toggleTag('Relaxed');
    expect(component.isDirty()).toBe(true);
  });

  it('rotates the writing prompts on Refresh', async () => {
    const root = fixture.nativeElement as HTMLElement;
    const first = component.prompts();

    expect(first).toHaveLength(3);
    expect(root.textContent).toContain(first[0]);

    const refresh = Array.from(root.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Refresh')) as HTMLButtonElement;
    refresh.click();
    await fixture.whenStable();

    expect(component.prompts()).not.toEqual(first);
    expect(root.textContent).toContain(component.prompts()[0]);
  });

  it('inserts a chosen prompt into the editor', async () => {
    const root = fixture.nativeElement as HTMLElement;
    const prompt = component.prompts()[0];
    const promptButton = root.querySelector(`button[aria-label="Use prompt: ${prompt}"]`) as HTMLButtonElement;

    promptButton.click();
    await fixture.whenStable();

    expect(component.plainText()).toContain(prompt);
    expect(component.isDirty()).toBe(true);
    expect(root.textContent).toContain('Prompt added to your entry.');
  });

  it('appends a prompt after existing writing without replacing the selection', async () => {
    const root = fixture.nativeElement as HTMLElement;
    const editor = root.querySelector('[contenteditable="true"]') as HTMLElement;
    editor.textContent = 'already written';
    component.onEditorInput();
    await fixture.whenStable();

    // A rail click leaves the editor selection in place; the prompt must not eat it.
    selectText(editor, 0, 7);
    const prompt = component.prompts()[1];
    component.usePrompt(prompt);
    await fixture.whenStable();

    // Inserted at the caret (end of the selection), with nothing deleted.
    expect(component.plainText()).toContain('already');
    expect(component.plainText()).toContain('written');
    expect(component.plainText()).toContain(prompt);
    expect(component.plainText().indexOf(prompt)).toBeGreaterThan(0);
  });

  it('drops a prompt at the end when the caret is outside the editor', async () => {
    const root = fixture.nativeElement as HTMLElement;
    const editor = root.querySelector('[contenteditable="true"]') as HTMLElement;
    editor.textContent = 'first line';
    component.onEditorInput();
    document.getSelection()?.removeAllRanges();
    await fixture.whenStable();

    const prompt = component.prompts()[0];
    component.usePrompt(prompt);
    await fixture.whenStable();

    expect(component.plainText().trim().startsWith('first line')).toBe(true);
    expect(component.plainText()).toContain(prompt);
  });

  it('cycles the prompt window back to the start', () => {
    const first = component.prompts();

    component.refreshPrompts();
    component.refreshPrompts();
    expect(component.prompts()).not.toEqual(first);

    component.refreshPrompts();
    expect(component.prompts()).toEqual(first);
  });

  it('carries selected tags across the sign-in round trip and ignores unknown ones', async () => {
    component.content.set('kept across sign-in');
    component.toggleTag('Hopeful');
    component.save('saved');
    await fixture.whenStable();
    component.continueToSignIn();

    expect(JSON.parse(sessionStorage.getItem('calmi.journal.pending-entry.v1') ?? '{}').tags).toEqual(['Hopeful']);

    sessionStorage.setItem('calmi.journal.pending-entry.v1', JSON.stringify({
      title: 'Back again',
      content: 'restored body',
      tags: ['Hopeful', 'Not-a-real-tag'],
    }));
    TestBed.resetTestingModule();
    const restored = await createFixture();
    await restored.whenStable();

    expect(restored.componentInstance.selectedTags()).toEqual(['Hopeful']);
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

  describe('regressions', () => {
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    const root = () => fixture.nativeElement as HTMLElement;

    it('counts words across <br> in the editor', () => {
      component.content.set('a<br>b');
      expect(component.wordCount()).toBe(2);
    });

    it('limits the title input to 120 characters', () => {
      expect(root().querySelector('#journal-entry-title')?.getAttribute('maxlength')).toBe('120');
    });

    it('clears the editor, selection, tags and pending switch when the account changes', async () => {
      signIn();
      fixture.detectChanges();
      await fixture.whenStable();

      component.title.set('Mine');
      component.content.set('private words');
      component.selectedTags.set(['Grateful']);
      component.selectedId.set('some-entry');
      component.startNewEntry();
      expect(component.pendingSwitch()).not.toBeNull();

      TestBed.inject(AuthService).currentUser.set({ id: 'user-2', email: 'other@example.com' } as never);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.title()).toBe('');
      expect(component.content()).toBe('');
      expect(component.selectedTags()).toEqual([]);
      expect(component.selectedId()).toBeNull();
      expect(component.pendingSwitch()).toBeNull();
      expect(component.isDirty()).toBe(false);
    });

    it('clears the editor on sign-out', async () => {
      signIn();
      fixture.detectChanges();
      await fixture.whenStable();
      component.content.set('before sign-out');

      TestBed.inject(AuthService).currentUser.set(null);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.content()).toBe('');
      expect(component.isDirty()).toBe(false);
    });

    it('autosaves a dirty draft after 1500ms of quiet and not before', () => {
      vi.useFakeTimers();
      signIn();
      fixture.detectChanges();

      component.title.set('Evening');
      component.content.set('first thoughts');
      fixture.detectChanges();
      expect(component.isDirty()).toBe(true);

      vi.advanceTimersByTime(1499);
      expect(journal.count()).toBe(0);

      vi.advanceTimersByTime(1);
      expect(journal.count()).toBe(1);
      expect(journal.entries()[0].status).toBe('draft');
      expect(component.isDirty()).toBe(false);
      expect(component.selectedId()).toBe(journal.entries()[0].id);
    });

    it('restarts the autosave debounce on every edit', () => {
      vi.useFakeTimers();
      signIn();
      fixture.detectChanges();

      component.content.set('one');
      fixture.detectChanges();
      vi.advanceTimersByTime(1000);
      component.content.set('one two');
      fixture.detectChanges();
      vi.advanceTimersByTime(1000);
      expect(journal.count()).toBe(0);

      vi.advanceTimersByTime(500);
      expect(journal.count()).toBe(1);
    });

    it('flushes a pending autosave when the page is destroyed', () => {
      vi.useFakeTimers();
      signIn();
      fixture.detectChanges();
      component.content.set('do not lose me');
      fixture.detectChanges();

      fixture.destroy();

      expect(journal.count()).toBe(1);
      expect(journal.entries()[0].content).toBe('do not lose me');
    });

    it('never autosaves for a guest', () => {
      vi.useFakeTimers();
      component.content.set('guest words');
      fixture.detectChanges();
      vi.advanceTimersByTime(5000);
      expect(journal.count()).toBe(0);
      expect(component.signInPromptOpen()).toBe(false);
    });

    it('keeps the dirty baseline when the write fails, without re-saving in a loop', () => {
      vi.useFakeTimers();
      signIn();
      fixture.detectChanges();
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      component.content.set('stays unsaved');
      component.save('draft');
      expect(component.isDirty()).toBe(true);
      expect(component.lastSaved()).toBeNull();
      expect(component.storageFailed()).toBe(true);

      // A second save updates the same entry rather than duplicating it.
      component.save('draft');
      expect(journal.count()).toBe(1);
      expect(component.isDirty()).toBe(true);
    });

    it('warns on beforeunload only while dirty and stops after destroy', () => {
      const fire = () => {
        const event = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(event);
        return event.defaultPrevented;
      };
      fixture.detectChanges();
      expect(fire()).toBe(false);

      component.content.set('unsaved');
      fixture.detectChanges();
      expect(fire()).toBe(true);

      fixture.destroy();
      expect(fire()).toBe(false);
    });

    it('canLeave asks only when work is unsaved', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      expect(component.canLeave()).toBe(true);
      expect(confirmSpy).not.toHaveBeenCalled();

      component.content.set('guest draft');
      expect(component.canLeave()).toBe(false);
      confirmSpy.mockReturnValue(true);
      expect(component.canLeave()).toBe(true);
    });

    it('canLeave saves a signed-in draft instead of asking', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      signIn();
      fixture.detectChanges();
      await fixture.whenStable();
      component.content.set('keep this');

      expect(component.canLeave()).toBe(true);
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(journal.count()).toBe(1);
    });

    it('honours a failed delete and clears the pending switch', () => {
      const entry = journal.upsert({ id: null, title: 'Gone', content: 'x', status: 'saved' }).entry;
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      component.select(entry);
      component.content.set('edited');
      component.startNewEntry();
      expect(component.pendingSwitch()).not.toBeNull();

      component.confirmDelete(entry);

      expect(component.deleteFailed()).toBe(true);
      expect(component.pendingSwitch()).toBeNull();
      expect(component.selectedId()).toBeNull();
      expect(journal.count()).toBe(0);
    });

    it('shows createdAt as the single date for an entry', () => {
      const entry = journal.upsert({ id: null, title: 'Dated', content: 'x', status: 'saved' }).entry;
      component.select(entry);
      expect(component.startedAt().toISOString()).toBe(entry.createdAt);
    });

    it('removes the stashed draft when the sign-in dialog is dismissed', () => {
      sessionStorage.setItem('calmi.journal.pending-entry.v1', '{"title":"t","content":"c","tags":[]}');
      component.content.set('typed as guest');
      component.save('saved');
      expect(component.signInPromptOpen()).toBe(true);

      component.cancelSignIn();

      expect(sessionStorage.getItem('calmi.journal.pending-entry.v1')).toBeNull();
    });

    it('keeps the stash across destroy once handed to sign-in', async () => {
      component.content.set('typed as guest');
      component.save('saved');
      component.continueToSignIn();
      await fixture.whenStable();

      fixture.destroy();

      expect(sessionStorage.getItem('calmi.journal.pending-entry.v1')).not.toBeNull();
    });

    it('drops the stash when the sign-in navigation is refused', async () => {
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(false);
      component.content.set('typed as guest');
      component.save('saved');
      component.continueToSignIn();
      // The component reacts in the navigation promise's continuation: await that promise itself.
      await navigate.mock.results[0].value;
      await fixture.whenStable();

      expect(sessionStorage.getItem('calmi.journal.pending-entry.v1')).toBeNull();
    });

    it('makes the discard prompt a modal: described, inert background, trapped Tab, Escape', async () => {
      component.content.set('unsaved');
      component.startNewEntry();
      fixture.detectChanges();
      await fixture.whenStable();

      const dialog = root().querySelector<HTMLElement>('[role="alertdialog"]');
      expect(dialog).not.toBeNull();
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
      const describedBy = dialog?.getAttribute('aria-describedby') ?? '';
      expect(root().querySelector(`#${describedBy}`)?.textContent).toContain('discard the changes');
      expect(root().querySelector('.bg-canvas')?.hasAttribute('inert')).toBe(true);

      const buttons = dialog?.querySelectorAll('button') ?? [];
      const last = buttons[buttons.length - 1];
      last.focus();
      const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      dialog?.dispatchEvent(tab);
      expect(tab.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(buttons[0]);

      dialog?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
      expect(component.pendingSwitch()).toBeNull();
      expect(root().querySelector('.bg-canvas')?.hasAttribute('inert')).toBe(false);
    });

    it('closes the sign-in dialog with Escape and traps Tab inside it', async () => {
      component.content.set('typed as guest');
      component.save('saved');
      fixture.detectChanges();
      await fixture.whenStable();

      const dialog = root().querySelector<HTMLElement>('[role="dialog"]');
      expect(dialog?.getAttribute('aria-describedby')).toBe('journal-signin-body');
      expect(root().querySelector('.bg-canvas')?.hasAttribute('inert')).toBe(true);

      const buttons = dialog?.querySelectorAll('button') ?? [];
      buttons[buttons.length - 1].focus();
      const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      dialog?.dispatchEvent(tab);
      expect(tab.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(buttons[0]);

      dialog?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(component.signInPromptOpen()).toBe(false);
    });
  });
});
