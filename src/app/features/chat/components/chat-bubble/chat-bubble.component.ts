import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { ChatStoreService } from '../../services/chat-store.service';
import { VoiceSessionService } from '../../services/voice-session.service';

@Component({
  selector: 'app-chat-bubble',
  imports: [LucideDynamicIcon],
  host: { class: 'font-sans' },
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <button
      id="rumi-chat-bubble"
      type="button"
      class="fixed right-6 z-[60] inline-flex h-[52px] min-h-11 min-w-11 w-[52px] items-center justify-center rounded-full border border-hairline bg-brand-dark text-on-brand shadow-card transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:bg-elevated dark:text-brand-light md:h-14 md:w-14"
      [class.bottom-6]="!liftedForPlayer()"
      [class.bottom-24]="liftedForPlayer()"
      [class.chat-bubble--hidden-mobile]="chatStore.isOpen()"
      [disabled]="voice.isActive()"
      [attr.aria-label]="voice.isActive() ? 'Voice conversation active' : (chatStore.isOpen() ? 'Close Rumi AI chat' : 'Open Rumi AI chat companion')"
      [attr.aria-expanded]="chatStore.isOpen()"
      aria-controls="rumi-chat-panel"
      (click)="chatStore.toggle()">
      <span class="logo-pulse inline-flex items-center justify-center rounded-full p-0.5" aria-hidden="true">
        @if (chatStore.isOpen()) {
          <svg [lucideIcon]="'x'" [size]="24"></svg>
        } @else {
          <img src="assets/logos/rumi_logo.svg" alt="" class="h-9 w-9 object-contain md:h-10 md:w-10">
        }
      </span>
      @if (chatStore.unreadCount() > 0) {
        <span
          class="absolute -right-1 -top-1 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-coral px-1 text-xs font-bold leading-none text-on-coral"
          aria-live="polite">
          <span aria-hidden="true">{{ chatStore.unreadCount() }}</span>
          <span class="sr-only">{{ chatStore.unreadCount() }} unread messages</span>
        </span>
      }
    </button>
  `,
  styles: `
    @media (max-width: 767px) {
      .chat-bubble--hidden-mobile {
        display: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .logo-pulse {
        animation: none;
      }
    }
  `,
})
export class ChatBubbleComponent {
  readonly chatStore = inject(ChatStoreService);
  readonly voice = inject(VoiceSessionService);
  readonly liftedForPlayer = input(false);
}
