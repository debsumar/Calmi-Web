import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { AnimateOnScrollDirective } from '@/shared/directives/animate-on-scroll.directive';
import { ChatMessageComponent } from '@/features/chat/components/chat-message/chat-message.component';
import { ChatTypingComponent } from '@/features/chat/components/chat-typing/chat-typing.component';
import { ChatStoreService } from '@/features/chat/services/chat-store.service';
import {
  createRumiPreviewMessages,
  RUMI_HELP_CARDS,
  RUMI_HERO_BULLETS,
  RUMI_SUPPORT_TOPICS,
  RUMI_TRUST_POINTS,
  RumiSupportTopic,
} from '@/features/rumi-ai/data/rumi-ai.data';

@Component({
  selector: 'app-rumi-ai',
  imports: [LucideDynamicIcon, AnimateOnScrollDirective, ChatMessageComponent, ChatTypingComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './rumi-ai.component.html',
})
export class RumiAiComponent {
  private readonly chatStore = inject(ChatStoreService);

  readonly heroBullets = signal(RUMI_HERO_BULLETS);
  readonly helpCards = signal(RUMI_HELP_CARDS);
  readonly supportTopics = signal(RUMI_SUPPORT_TOPICS);
  readonly trustPoints = signal(RUMI_TRUST_POINTS);
  readonly previewMessages = signal(createRumiPreviewMessages());

  /** Hero CTA opens the existing Rumi chat panel rendered by the layout widget. */
  startConversation(): void {
    this.chatStore.open();
  }

  /** Topic cards open the same panel with the composer pre-filled. */
  startTopic(topic: RumiSupportTopic): void {
    this.chatStore.setDraft(topic.prompt);
    this.chatStore.open();
  }
}
