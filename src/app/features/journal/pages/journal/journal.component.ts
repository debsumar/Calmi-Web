import { ChangeDetectionStrategy, Component, computed, DOCUMENT, ElementRef, inject, Injector, SecurityContext, signal, viewChild, afterNextRender } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { AnimateOnScrollDirective } from '@/shared/directives/animate-on-scroll.directive';
import { AuthService } from '@/core/services/auth.service';
import { countWords, JournalEntry, JournalEntryStatus, plainTextFrom, previewOf, toEditorHtml } from '../../models/journal-entry.model';
import { JournalService } from '../../services/journal.service';

type InlineFormat = 'bold' | 'italic' | 'underline';

/** Carries an unsaved entry across the sign-in round trip, for this tab only. */
const PENDING_ENTRY_KEY = 'calmi.journal.pending-entry.v1';

/** Tag each format produces when the browser has no `execCommand`. */
const FALLBACK_TAGS: Record<InlineFormat, string> = {
  bold: 'strong',
  italic: 'em',
  underline: 'u',
};

/** Row model, so the template never calls a method per change-detection pass. */
interface EntryRow {
  entry: JournalEntry;
  preview: string;
}

/** What the editor should switch to once unsaved work is resolved. */
type PendingSwitch = { kind: 'new' } | { kind: 'entry'; entry: JournalEntry };

@Component({
  selector: 'app-journal',
  imports: [LucideDynamicIcon, RouterLink, DatePipe, AnimateOnScrollDirective],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './journal.component.html',
  styles: `
    /* The editable region owns its own inline formatting, so bold/italic/underline
       read correctly regardless of the surrounding prose styles. */
    .journal-editor :is(b, strong) { font-weight: 700; }
    .journal-editor :is(i, em) { font-style: italic; }
    .journal-editor u { text-decoration: underline; }
  `,
})
export class JournalComponent {
  private readonly journal = inject(JournalService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly document = inject(DOCUMENT);
  private readonly editor = viewChild<ElementRef<HTMLElement>>('editor');
  private readonly deleteConfirmButton = viewChild<ElementRef<HTMLButtonElement>>('deleteConfirmButton');
  private readonly signInPromptButton = viewChild<ElementRef<HTMLElement>>('signInPromptButton');
  /** Element to hand focus back to after the delete prompt closes. */
  private deleteReturnFocus: HTMLElement | null = null;
  private signInReturnFocus: HTMLElement | null = null;

  readonly isAuthenticated = computed(() => this.authService.currentUser() !== null);
  /** Open when a save was attempted without an account. */
  readonly signInPromptOpen = signal(false);

  constructor() {
    afterNextRender({ write: () => this.restorePendingEntry() });
  }

  readonly sortOrder = this.journal.sortOrder;
  readonly storageFailed = this.journal.storageFailed;

  readonly rows = computed<EntryRow[]>(() =>
    this.journal.entries().map((entry) => ({ entry, preview: previewOf(entry.content) })),
  );

  readonly selectedId = signal<string | null>(null);
  readonly title = signal('');
  /** Entry body as sanitized rich-text markup (`<strong>`, `<em>`, `<u>`, `<br>`). */
  readonly content = signal('');
  readonly expanded = signal(false);
  /** Mobile disclosure for the entry list. Always open from `lg` up via CSS. */
  readonly listOpen = signal(false);
  readonly pendingDeleteId = signal<string | null>(null);
  /** Set when a switch was blocked by unsaved edits; drives the discard prompt. */
  readonly pendingSwitch = signal<PendingSwitch | null>(null);
  /** Last write outcome, announced as text rather than by colour alone. */
  readonly lastSaved = signal<JournalEntryStatus | null>(null);
  /** Timestamp of the entry being written, or now for a fresh one. */
  readonly startedAt = signal(new Date());
  /** Formats covering the current selection, reflected as `aria-pressed`. */
  readonly activeFormats = signal<readonly InlineFormat[]>([]);

  readonly plainText = computed(() => plainTextFrom(this.content()));
  readonly wordCount = computed(() => countWords(this.content()));
  readonly hasContent = computed(() => this.plainText().trim().length > 0 || this.title().trim().length > 0);
  readonly isEmptyEditor = computed(() => this.plainText().trim().length === 0);

  /**
   * Unsaved when the editor differs from what was last loaded or saved. Comparing
   * against a baseline rather than the stored string keeps legacy plain-text entries
   * (converted to markup on load) from looking dirty the moment they open.
   */
  private readonly baseline = signal({ title: '', content: '' });

  readonly isDirty = computed(() =>
    this.title() !== this.baseline().title || this.content() !== this.baseline().content,
  );

  readonly formats: readonly { id: InlineFormat; label: string; icon: string; shortcut: string }[] = [
    { id: 'bold', label: 'Bold', icon: 'bold', shortcut: 'Ctrl+B' },
    { id: 'italic', label: 'Italic', icon: 'italic', shortcut: 'Ctrl+I' },
    { id: 'underline', label: 'Underline', icon: 'underline', shortcut: 'Ctrl+U' },
  ];

  isActive(format: InlineFormat): boolean {
    return this.activeFormats().includes(format);
  }

  /** Asks before discarding unsaved work; the prompt then calls `discardAndSwitch`. */
  startNewEntry(): void {
    if (this.isDirty()) {
      this.pendingSwitch.set({ kind: 'new' });
      return;
    }
    this.loadNewEntry();
  }

  select(entry: JournalEntry): void {
    if (entry.id === this.selectedId()) return;
    if (this.isDirty()) {
      this.pendingSwitch.set({ kind: 'entry', entry });
      return;
    }
    this.loadEntry(entry);
  }

  discardAndSwitch(): void {
    const pending = this.pendingSwitch();
    this.pendingSwitch.set(null);
    if (!pending) return;
    if (pending.kind === 'new') this.loadNewEntry();
    else this.loadEntry(pending.entry);
  }

  cancelSwitch(): void {
    this.pendingSwitch.set(null);
  }

  save(status: JournalEntryStatus): void {
    if (!this.hasContent()) return;

    // Journals belong to an account. Without one there is nothing to save them
    // against, so ask the writer to sign in instead of silently dropping the entry.
    if (!this.authService.currentUser()) {
      this.openSignInPrompt();
      return;
    }

    const { entry, persisted } = this.journal.upsert({
      id: this.selectedId(),
      title: this.title(),
      content: this.content(),
      status,
    });
    this.selectedId.set(entry.id);
    this.title.set(entry.title);
    this.lastSaved.set(persisted ? status : null);
    this.baseline.set({ title: entry.title, content: this.content() });
  }

  private openSignInPrompt(): void {
    const active = this.document.activeElement;
    this.signInReturnFocus = active instanceof HTMLElement ? active : null;
    this.signInPromptOpen.set(true);
    afterNextRender({
      write: () => this.signInPromptButton()?.nativeElement.focus(),
    }, { injector: this.injector });
  }

  cancelSignIn(): void {
    this.signInPromptOpen.set(false);
    const target = this.signInReturnFocus;
    this.signInReturnFocus = null;
    if (target?.isConnected) target.focus();
    else this.editor()?.nativeElement.focus();
  }

  /** Keeps the in-progress entry for this tab, then hands over to sign-in. */
  continueToSignIn(): void {
    this.stashPendingEntry();
    this.signInPromptOpen.set(false);
    void this.router.navigate(['/auth/identify'], { queryParams: { returnUrl: '/journal' } });
  }

  private stashPendingEntry(): void {
    try {
      globalThis.sessionStorage?.setItem(PENDING_ENTRY_KEY, JSON.stringify({
        title: this.title(),
        content: this.content(),
      }));
    } catch {
      // Without session storage the entry simply is not carried across sign-in.
    }
  }

  /** Restores an entry the writer had typed before being sent to sign in. */
  private restorePendingEntry(): void {
    let raw: string | null = null;
    try {
      raw = globalThis.sessionStorage?.getItem(PENDING_ENTRY_KEY) ?? null;
      if (raw) globalThis.sessionStorage?.removeItem(PENDING_ENTRY_KEY);
    } catch {
      return;
    }
    if (!raw) return;

    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return;
      const pending = parsed as { title?: unknown; content?: unknown };
      if (typeof pending.title === 'string') this.title.set(pending.title);
      if (typeof pending.content === 'string') {
        this.writeEditor(pending.content);
        const element = this.editor()?.nativeElement;
        this.content.set(element ? this.sanitize(element.innerHTML) : pending.content);
      }
      this.baseline.set({ title: '', content: '' });
    } catch {
      // Malformed stash is discarded; it was already removed above.
    }
  }

  requestDelete(entry: JournalEntry, event?: Event): void {
    const trigger = event?.currentTarget;
    this.deleteReturnFocus = trigger instanceof HTMLElement ? trigger : null;
    this.pendingDeleteId.set(entry.id);
    afterNextRender({
      write: () => this.deleteConfirmButton()?.nativeElement.focus(),
    }, { injector: this.injector });
  }

  cancelDelete(): void {
    this.pendingDeleteId.set(null);
    this.restoreDeleteFocus();
  }

  confirmDelete(entry: JournalEntry): void {
    this.journal.remove(entry.id);
    this.pendingDeleteId.set(null);
    this.deleteReturnFocus = null;
    if (this.selectedId() === entry.id) this.loadNewEntry();
    else this.editor()?.nativeElement.focus();
  }

  toggleSortOrder(): void {
    this.journal.toggleSortOrder();
  }

  toggleExpanded(): void {
    this.expanded.update((value) => !value);
  }

  toggleList(): void {
    this.listOpen.update((value) => !value);
  }

  /** Reads the editable region back into the signal, sanitized. */
  onEditorInput(): void {
    const element = this.editor()?.nativeElement;
    if (!element) return;
    this.content.set(this.sanitize(element.innerHTML));
    this.refreshActiveFormats();
  }

  onSelectionChange(): void {
    this.refreshActiveFormats();
  }

  /** Pasting inserts plain text only: no foreign markup, styles, or scripts. */
  onPaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text/plain') ?? '';
    event.preventDefault();
    this.insertPlainText(text);
    this.onEditorInput();
  }

  /**
   * Toggles real formatting on the selection. `execCommand` is deprecated but is
   * still the only cross-browser rich-text primitive; where it is unavailable the
   * selection is wrapped manually instead.
   */
  applyFormat(format: InlineFormat): void {
    const element = this.editor()?.nativeElement;
    if (!element) return;

    // Focusing an editable region collapses the caret, so the selection is captured
    // first and restored afterwards. Toolbar clicks would otherwise format nothing.
    this.withPreservedSelection(element, () => {
      const executed = typeof this.document.execCommand === 'function' && this.tryExecCommand(format);
      if (!executed) this.wrapSelection(format);
    });

    this.onEditorInput();
  }

  private withPreservedSelection(element: HTMLElement, action: () => void): void {
    const selection = this.document.getSelection?.();
    const saved = selection && selection.rangeCount > 0
      && element.contains(selection.getRangeAt(0).commonAncestorContainer)
      ? selection.getRangeAt(0).cloneRange()
      : null;

    if (this.document.activeElement !== element) element.focus();

    if (saved && selection) {
      selection.removeAllRanges();
      selection.addRange(saved);
    }

    action();
  }

  /** Ctrl/Cmd+B, +I and +U work even where the browser does not map them. */
  onEditorKeydown(event: KeyboardEvent): void {
    if (!event.ctrlKey && !event.metaKey) return;
    const format = ({ b: 'bold', i: 'italic', u: 'underline' } as const)[event.key.toLowerCase()];
    if (!format) return;
    event.preventDefault();
    this.applyFormat(format);
  }

  private tryExecCommand(format: InlineFormat): boolean {
    try {
      // Tag-based markup (<b>/<i>/<u>) instead of inline styles, so stored content
      // survives sanitization.
      this.document.execCommand('styleWithCSS', false, 'false');
      return this.document.execCommand(format, false);
    } catch {
      return false;
    }
  }

  private wrapSelection(format: InlineFormat): void {
    const selection = this.document.getSelection?.();
    const element = this.editor()?.nativeElement;
    if (!selection || !element || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!element.contains(range.commonAncestorContainer)) return;

    const existing = this.enclosingFormat(range.commonAncestorContainer, format, element);
    if (existing) {
      // Already formatted: unwrap so the button toggles both ways.
      const parent = existing.parentNode;
      if (!parent) return;
      while (existing.firstChild) parent.insertBefore(existing.firstChild, existing);
      parent.removeChild(existing);
      return;
    }

    if (range.collapsed) return;
    const wrapper = this.document.createElement(FALLBACK_TAGS[format]);
    wrapper.appendChild(range.extractContents());
    range.insertNode(wrapper);
    selection.removeAllRanges();
    const next = this.document.createRange();
    next.selectNodeContents(wrapper);
    selection.addRange(next);
  }

  private insertPlainText(text: string): void {
    const selection = this.document.getSelection?.();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(this.document.createTextNode(text));
    range.collapse(false);
  }

  private enclosingFormat(node: Node, format: InlineFormat, root: HTMLElement): HTMLElement | null {
    const tags = format === 'bold'
      ? ['B', 'STRONG']
      : format === 'italic'
        ? ['I', 'EM']
        : ['U'];

    let current: Node | null = node;
    while (current && current !== root) {
      if (current instanceof HTMLElement && tags.includes(current.tagName)) return current;
      current = current.parentNode;
    }
    return null;
  }

  private refreshActiveFormats(): void {
    const element = this.editor()?.nativeElement;
    if (!element) return;

    const active = this.formats
      .map((format) => format.id)
      .filter((format) => this.isFormatActive(format, element));
    this.activeFormats.set(active);
  }

  private isFormatActive(format: InlineFormat, element: HTMLElement): boolean {
    const document = this.document;
    if (typeof document.queryCommandState === 'function') {
      try {
        return document.queryCommandState(format);
      } catch {
        // Fall through to the DOM check below.
      }
    }
    const anchor = document.getSelection?.()?.anchorNode;
    return anchor ? this.enclosingFormat(anchor, format, element) !== null : false;
  }

  private sanitize(html: string): string {
    return this.sanitizer.sanitize(SecurityContext.HTML, html) ?? '';
  }

  /** Writes stored content into the editable region without disturbing bindings. */
  private writeEditor(content: string): void {
    const element = this.editor()?.nativeElement;
    if (!element) return;
    element.innerHTML = this.sanitize(toEditorHtml(content));
  }

  private loadNewEntry(): void {
    this.selectedId.set(null);
    this.title.set('');
    this.content.set('');
    this.startedAt.set(new Date());
    this.lastSaved.set(null);
    this.pendingDeleteId.set(null);
    this.activeFormats.set([]);
    this.writeEditor('');
    this.baseline.set({ title: '', content: '' });
    this.editor()?.nativeElement.focus();
  }

  private loadEntry(entry: JournalEntry): void {
    this.selectedId.set(entry.id);
    this.title.set(entry.title);
    this.startedAt.set(new Date(entry.createdAt));
    this.lastSaved.set(entry.status);
    this.pendingDeleteId.set(null);
    this.activeFormats.set([]);
    this.writeEditor(entry.content);
    // Store what the editor actually holds, so `isDirty` compares like with like.
    const element = this.editor()?.nativeElement;
    this.content.set(element ? this.sanitize(element.innerHTML) : entry.content);
    this.baseline.set({ title: entry.title, content: this.content() });
    // On mobile the list sits above the editor; collapsing it reveals the writing area.
    this.listOpen.set(false);
  }

  private restoreDeleteFocus(): void {
    const target = this.deleteReturnFocus;
    this.deleteReturnFocus = null;
    if (target?.isConnected) target.focus();
    else this.editor()?.nativeElement.focus();
  }
}
