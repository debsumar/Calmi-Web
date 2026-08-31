import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnDestroy,
  OnInit,
  viewChild,
} from '@angular/core';
import { ChatStoreService } from '../../services/chat-store.service';
import {
  ChatConversationSurface,
  ChatConversationVariant,
} from '../../services/voice-session.model';
import { VoiceSessionService } from '../../services/voice-session.service';
import { ChatMessageListComponent } from '../chat-message-list/chat-message-list.component';
import { ChatComposerComponent } from '../chat-composer/chat-composer.component';
import { ChatSuggestionsComponent } from '../chat-suggestions/chat-suggestions.component';
import { VoiceSessionOverlayComponent } from '../voice-session-overlay/voice-session-overlay.component';

@Component({
  selector: 'app-chat-conversation',
  standalone: true,
  imports: [ChatMessageListComponent, ChatComposerComponent, ChatSuggestionsComponent, VoiceSessionOverlayComponent],
  host: {
    class: 'relative flex min-h-0 flex-1 flex-col overflow-hidden text-base',
    '[attr.data-variant]': 'variant()',
  },
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <app-chat-message-list
      [announce]="shouldAnnounce()"
      [conversationLabel]="conversationLabel()" />

    @if (!hasUserMessages()) {
      <div class="shrink-0 px-4 pb-3">
        <app-chat-suggestions></app-chat-suggestions>
      </div>
    }

    <app-chat-composer
      [surface]="conversationSurface()"
      [announce]="shouldAnnounce()"
      [composerAriaLabel]="composerAriaLabel()" />

    <app-voice-session-overlay [surface]="conversationSurface()"></app-voice-session-overlay>
  `,
  styles: `
    :host {
      container: chat-conversation / size;
    }

    :host([data-variant="embedded"]) {
      flex: 0 0 auto;
      min-block-size: 40rem;
      block-size: clamp(40rem, 72dvh, 44rem);
    }

    @media (max-width: 47.999rem), (max-height: 43.75rem) {
      :host([data-variant="embedded"]) {
        flex: 1 1 auto;
        min-block-size: 0;
        block-size: auto;
        max-block-size: none;
      }
    }
  `,
})
export class ChatConversationComponent implements OnInit, OnDestroy {
  readonly variant = input<ChatConversationVariant>('panel');
  readonly surface = input<ChatConversationSurface | undefined>(undefined);

  readonly store = inject(ChatStoreService);
  private readonly voice = inject(VoiceSessionService);
  private readonly composer = viewChild(ChatComposerComponent);

  readonly conversationSurface = computed<ChatConversationSurface>(() =>
    this.surface() ?? (this.variant() === 'embedded' ? 'rumi-embedded' : 'floating-panel'),
  );
  readonly shouldAnnounce = computed(() =>
    this.variant() === 'embedded' ? !this.store.isOpen() : this.store.isOpen(),
  );
  readonly conversationLabel = computed(() =>
    this.variant() === 'embedded'
      ? 'Conversation with Rumi AI on the Rumi AI page'
      : 'Conversation with Rumi AI in the floating chat',
  );
  readonly composerAriaLabel = computed(() =>
    this.variant() === 'embedded'
      ? 'Share what is on your mind in the Rumi AI page chat'
      : 'Share what is on your mind in the floating chat',
  );
  readonly hasUserMessages = computed(() =>
    this.store.messages().some((message) => message.role === 'user'),
  );

  ngOnInit(): void {
    if (this.conversationSurface() === 'rumi-embedded') {
      this.store.setEmbeddedConversationVisible(true);
    }
  }

  ngOnDestroy(): void {
    if (this.conversationSurface() === 'rumi-embedded') {
      this.store.setEmbeddedConversationVisible(false);
    }
    this.voice.endForSurface(this.conversationSurface());
  }

  focusComposer(): void {
    this.composer()?.focusInput();
  }
}
