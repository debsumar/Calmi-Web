import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { AnimateOnScrollDirective } from '@/shared/directives/animate-on-scroll.directive';
import { ChatStoreService } from '@/features/chat/services/chat-store.service';
import { RumiChatPreviewComponent } from '@/features/rumi-ai/components/rumi-chat-preview/rumi-chat-preview.component';
import {
  RUMI_HELP_CARDS,
  RUMI_HERO_BULLETS,
  RUMI_SUPPORT_TOPICS,
  RUMI_TRUST_POINTS,
  RumiSupportTopic,
} from '@/features/rumi-ai/data/rumi-ai.data';

@Component({
  selector: 'app-rumi-ai',
  imports: [LucideDynamicIcon, AnimateOnScrollDirective, RumiChatPreviewComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './rumi-ai.component.html',
  styles: `
    .rumi-conversation-figure {
      display: flex;
      flex-direction: column;
    }

    @media (max-width: 47.999rem), (max-height: 43.75rem) {
      .rumi-conversation-figure {
        block-size: calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1rem);
        max-block-size: calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1rem);
        block-size: calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1rem);
        max-block-size: calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1rem);
      }
    }
  `,
})
export class RumiAiComponent {
  readonly chatStore = inject(ChatStoreService);

  constructor() {
    // Seeds Rumi's greeting, so the floating panel opens on a welcome rather than
    // an empty transcript.
    this.chatStore.ensureWelcomeMessage();
  }

  readonly heroBullets = signal(RUMI_HERO_BULLETS);
  readonly helpCards = signal(RUMI_HELP_CARDS);
  readonly supportTopics = signal(RUMI_SUPPORT_TOPICS);
  readonly trustPoints = signal(RUMI_TRUST_POINTS);

  /** Hero CTA opens the floating chat: the only interactive Rumi surface. */
  startConversation(): void {
    this.chatStore.open();
  }

  /** Topic cards seed the floating chat's draft and open it. */
  startTopic(topic: RumiSupportTopic): void {
    this.chatStore.setDraft(topic.prompt);
    this.chatStore.open();
  }
}
