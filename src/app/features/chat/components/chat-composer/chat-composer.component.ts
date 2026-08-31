import { afterNextRender, ChangeDetectionStrategy, Component, ElementRef, inject, input, Injector, viewChild } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { ChatStoreService } from '../../services/chat-store.service';
import { VoiceSessionService } from '../../services/voice-session.service';
import { ChatConversationSurface } from '../../services/voice-session.model';

@Component({
  selector: 'app-chat-composer',
  standalone: true,
  imports: [LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './chat-composer.component.scss',
  template: `
    <form class="chat-composer__form border-t border-hairline p-3"
          [class.bg-glass]="surface() === 'floating-panel'"
          [class.backdrop-blur-xl]="surface() === 'floating-panel'"
          [class.bg-surface]="surface() === 'rumi-embedded'"
          (submit)="$event.preventDefault(); send()">
      <div class="flex items-end gap-2 rounded-full border border-hairline bg-surface px-2 py-1.5">
        <textarea #input
                  [value]="store.draft()"
                  (input)="onInput($event)"
                  (keydown)="onKeydown($event)"
                  rows="1"
                  maxlength="1000"
                  [attr.aria-label]="composerAriaLabel()"
                  placeholder="Share what's on your mind..."
                  class="max-h-32 min-h-11 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-1 py-2 text-base text-ink outline-none placeholder:text-ink-muted focus-visible:ring-2 focus-visible:ring-brand"
        ></textarea>
        <button type="button"
                (click)="startVoice($event)"
                [attr.aria-pressed]="voice.isActive() && voice.surface() === surface()"
                [disabled]="voice.isActive() && voice.surface() !== surface()"
                [attr.aria-label]="voice.isActive() && voice.surface() === surface() ? 'Voice conversation active' : 'Start voice conversation'"
                title="Start voice conversation"
                class="inline-flex h-11 w-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface text-brand dark:text-brand-light transition-colors hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
          <svg [lucideIcon]="'audio-lines'" [size]="18" aria-hidden="true"></svg>
        </button>
        <button type="submit"
                [disabled]="!store.canSend()"
                [attr.aria-disabled]="store.canSend() ? 'false' : 'true'"
                aria-label="Send message"
                class="inline-flex h-11 w-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-brand text-on-brand transition-colors hover:bg-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border disabled:border-hairline disabled:bg-sunken disabled:text-ink-muted">
          <svg [lucideIcon]="'send'" [size]="18" aria-hidden="true"></svg>
        </button>
      </div>
      @if (store.draft().length > 900) {
        <p class="mt-1 text-right text-xs text-ink-muted" [attr.aria-live]="announce() ? 'polite' : 'off'">
          {{ store.draft().length }}/1000
        </p>
      }
    </form>
  `,
})
export class ChatComposerComponent {
  /** Named `textareaRef` (not `input`) so it does not shadow Angular's `input()` signal API. */
  private readonly textareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('input');
  private readonly injector = inject(Injector);
  readonly store = inject(ChatStoreService);
  readonly voice = inject(VoiceSessionService);
  readonly surface = input<ChatConversationSurface>('floating-panel');
  readonly composerAriaLabel = input('Share what is on your mind');
  readonly announce = input(true);

  focusInput(): void {
    afterNextRender(
      { write: () => this.textareaRef()?.nativeElement.focus({ preventScroll: true }) },
      { injector: this.injector },
    );
  }

  startVoice(event: Event): void {
    this.voice.start(this.surface(), event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined);
  }

  onInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    const value = textarea.value.slice(0, 1000);
    this.store.setDraft(value);
    this.resize(textarea);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  send(): void {
    if (!this.store.canSend()) return;
    this.store.send();
    const textarea = this.textareaRef()?.nativeElement;
    if (textarea) this.resize(textarea);
  }

  private resize(textarea: HTMLTextAreaElement): void {
    afterNextRender({
      earlyRead: () => {
        const lineHeight = Number.parseFloat(getComputedStyle(textarea).lineHeight) || 24;
        return { textarea, lineHeight, scrollHeight: textarea.scrollHeight };
      },
      write: ({ textarea, lineHeight, scrollHeight }) => {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(scrollHeight, lineHeight * 5)}px`;
      },
    }, { injector: this.injector });
  }
}
