import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SUGGESTED_PROMPTS } from '../../data/dummy-conversation';
import { ChatStoreService } from '../../services/chat-store.service';

@Component({
  selector: 'app-chat-suggestions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap gap-2" aria-label="Suggested prompts">
      @for (prompt of prompts; track prompt.id) {
        <button type="button" (click)="choose(prompt.label)"
                class="min-h-11 rounded-full border border-hairline bg-surface px-3 py-2 text-xs font-semibold text-brand-deep dark:text-brand-light hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
          {{ prompt.label }}
        </button>
      }
    </div>
  `,
})
export class ChatSuggestionsComponent {
  readonly prompts = SUGGESTED_PROMPTS;
  private readonly store = inject(ChatStoreService);

  choose(label: string): void {
    this.store.setDraft(label);
    this.store.send();
  }
}
