import { afterNextRender, ChangeDetectionStrategy, Component, ElementRef, inject, Injector, viewChild } from '@angular/core';
import { LucideDynamicIcon, LucideSend, provideLucideIcons } from '@lucide/angular';
import { ChatStoreService } from '../../services/chat-store.service';

@Component({
  selector: 'app-chat-composer',
  standalone: true,
  imports: [LucideDynamicIcon],
  providers: [provideLucideIcons(LucideSend)],
  template: `
    <form class="border-t border-hairline bg-glass p-3 backdrop-blur-xl" (submit)="$event.preventDefault(); send()">
      <div class="flex items-end gap-2">
        <textarea #input
                  [value]="store.draft()"
                  (input)="onInput($event)"
                  (keydown)="onKeydown($event)"
                  rows="1"
                  maxlength="1000"
                  aria-label="Share what is on your mind"
                  placeholder="Share what is on your mind..."
                  class="max-h-32 min-h-11 flex-1 resize-none overflow-y-auto rounded-2xl border border-hairline bg-surface px-3 py-2 text-base text-brand-deep dark:text-brand-light outline-none placeholder:text-brand-dark/70 dark:placeholder:text-brand-light/70 focus-visible:ring-2 focus-visible:ring-brand"
        ></textarea>
        <button type="submit"
                [disabled]="!store.canSend()"
                [attr.aria-disabled]="store.canSend() ? 'false' : 'true'"
                aria-label="Send message"
                class="inline-flex h-11 w-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-brand-deep text-on-brand transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border disabled:border-hairline disabled:bg-sunken disabled:text-brand-deep dark:disabled:text-brand-light">
          <svg [lucideIcon]="'send'" [size]="18" aria-hidden="true"></svg>
        </button>
      </div>
      @if (store.draft().length > 900) {
        <p class="mt-1 text-right text-xs text-brand-dark/80 dark:text-brand-light/80" aria-live="polite">
          {{ store.draft().length }}/1000
        </p>
      }
    </form>
  `,
})
export class ChatComposerComponent {
  private readonly input = viewChild<ElementRef<HTMLTextAreaElement>>('input');
  private readonly injector = inject(Injector);
  readonly store = inject(ChatStoreService);

  focusInput(): void {
    afterNextRender(
      { write: () => this.input()?.nativeElement.focus({ preventScroll: true }) },
      { injector: this.injector },
    );
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
    const textarea = this.input()?.nativeElement;
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
