import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { ChatStoreService } from '../../services/chat-store.service';

@Component({
  selector: 'app-chat-bubble',
  imports: [LucideDynamicIcon],
  host: { class: 'font-sans' },
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <button
      id="rumi-chat-bubble"
      type="button"
      class="fixed right-6 z-[60] inline-flex h-[52px] min-h-11 min-w-11 w-[52px] items-center justify-center rounded-full border border-hairline bg-gradient-to-br from-brand-dark to-brand-deep text-on-brand shadow-card transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 md:h-14 md:w-14"
      [class.bottom-6]="!liftedForPlayer()"
      [class.bottom-24]="liftedForPlayer()"
      [class.chat-bubble--hidden-mobile]="chatStore.isOpen()"
      [attr.aria-label]="chatStore.isOpen() ? 'Close Rumi AI chat' : 'Open Rumi AI chat companion'"
      [attr.aria-expanded]="chatStore.isOpen()"
      aria-controls="rumi-chat-panel"
      (click)="chatStore.toggle()">
      <span class="logo-pulse inline-flex" aria-hidden="true">
        @if (chatStore.isOpen()) {
          <svg [lucideIcon]="'x'" [size]="24"></svg>
        } @else {
          <svg [lucideIcon]="'sparkles'" [size]="24"></svg>
        }
      </span>
      @if (chatStore.unreadCount() > 0) {
        <span
          class="absolute -right-1 -top-1 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-coral px-1 text-xs font-bold leading-none text-on-coral"
          aria-live="polite">
          {{ chatStore.unreadCount() }}
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
  readonly liftedForPlayer = input(false);
}
