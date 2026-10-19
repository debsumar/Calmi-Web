import {
  afterNextRender,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  Injector,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { ChatMessageComponent } from '../chat-message/chat-message.component';
import { ChatTypingComponent } from '../chat-typing/chat-typing.component';
import { ChatStoreService } from '../../services/chat-store.service';

const INITIAL_STAGGER_LIMIT = 6;

@Component({
  selector: 'app-chat-message-list',
  standalone: true,
  imports: [ChatMessageComponent, ChatTypingComponent, LucideDynamicIcon],
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  template: `
    <div class="relative flex min-h-0 flex-1 flex-col">
    <div #messageLog
         class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3"
         [attr.role]="announce() ? 'log' : 'region'"
         [attr.aria-live]="announce() ? 'polite' : 'off'" aria-atomic="false"
         [attr.aria-label]="conversationLabel()"
         (scroll)="onScroll()"
         (scrollend)="onScrollEnd()">
      @if (!store.hasMessages()) {
        <div class="flex flex-1 flex-col items-center justify-center gap-3 text-center text-base text-ink-soft">
          <span class="flex h-12 w-12 items-center justify-center rounded-full bg-sunken-alt" aria-hidden="true"></span>
          <p>Take a gentle moment. I am here to listen.</p>
        </div>
      } @else {
        @for (message of store.messages(); track message.id) {
          <app-chat-message
            [message]="message"
            [animate]="animateMessages()"
            [entranceIndex]="messageEntranceIndex(message.id)" />
        }
        @if (store.isTyping()) {
          <app-chat-typing [announce]="announce()" />
        }
      }
    </div>

    <!-- Outside the role=log live region so the control is not announced as a log entry. -->
    @if (showScrollToBottom()) {
      <button type="button" (click)="scrollToBottom()"
              class="absolute bottom-2 left-1/2 z-10 inline-flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full border border-hairline bg-elevated px-3 py-2 text-xs font-semibold text-ink shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              aria-label="Scroll to bottom">
        <svg [lucideIcon]="'arrow-down'" [size]="16" aria-hidden="true"></svg>
        <span>Scroll to bottom</span>
      </button>
    }
    </div>
  `,
})
export class ChatMessageListComponent implements OnDestroy {
  readonly store = inject(ChatStoreService);
  readonly announce = input(true);
  readonly conversationLabel = input('Conversation with Rumi AI');
  readonly animateMessages = signal(false);
  readonly showScrollToBottom = signal(false);
  private readonly injector = inject(Injector);
  private readonly messageLog = viewChild<ElementRef<HTMLElement>>('messageLog');
  private readonly initialMessageIndexes = new Map<string, number>();
  private animationObserver?: IntersectionObserver;
  private animationSessionStarted = false;
  private lastRenderedMessageId?: string;
  /** True while the user is near the bottom; tracked from scroll events, never measured after a render. */
  private pinned = true;
  private smoothScrolling = false;
  private smoothTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    afterNextRender({
      write: () => this.setupAnimationSession(),
    }, { injector: this.injector });

    effect(() => {
      const messages = this.store.messages();
      this.store.isTyping();
      const last = messages.at(-1);
      const lastMessageId = last?.id;
      const hasNewMessage = lastMessageId !== undefined && lastMessageId !== this.lastRenderedMessageId;
      this.lastRenderedMessageId = lastMessageId;
      // Own new message always follows to bottom; otherwise only if pinned before this render.
      const follow = this.pinned || (hasNewMessage && last?.role === 'user');

      afterNextRender({
        write: () => {
          const element = this.messageLog()?.nativeElement;
          if (!element) return;
          if (follow) {
            this.pinned = true;
            element.scrollTop = element.scrollHeight;
            this.showScrollToBottom.set(false);
            return;
          }
          if (!this.smoothScrolling) this.showScrollToBottom.set(true);
        },
      }, { injector: this.injector });
    });
  }

  ngOnDestroy(): void {
    this.animationObserver?.disconnect();
    if (this.smoothTimer !== undefined) clearTimeout(this.smoothTimer);
  }

  onScroll(): void {
    const element = this.messageLog()?.nativeElement;
    if (!element) return;
    const nearBottom = this.distanceFromBottom(element) <= 100;
    if (this.smoothScrolling) {
      // Programmatic scroll in flight: keep the pill hidden until it lands.
      if (this.distanceFromBottom(element) <= 1) this.finishSmoothScroll();
      return;
    }
    this.pinned = nearBottom;
    this.showScrollToBottom.set(!nearBottom);
  }

  onScrollEnd(): void {
    if (this.smoothScrolling) this.finishSmoothScroll();
  }

  scrollToBottom(): void {
    const element = this.messageLog()?.nativeElement;
    if (!element) return;

    this.pinned = true;
    this.smoothScrolling = true;
    this.showScrollToBottom.set(false);
    if (this.smoothTimer !== undefined) clearTimeout(this.smoothTimer);
    // Fallback for browsers without `scrollend`, or when no scroll is needed.
    this.smoothTimer = setTimeout(() => this.finishSmoothScroll(), 800);

    afterNextRender({
      write: () => {
        if (typeof element.scrollTo === 'function') element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
        else element.scrollTop = element.scrollHeight;
      },
    }, { injector: this.injector });
  }

  private finishSmoothScroll(): void {
    this.smoothScrolling = false;
    if (this.smoothTimer !== undefined) {
      clearTimeout(this.smoothTimer);
      this.smoothTimer = undefined;
    }
    const element = this.messageLog()?.nativeElement;
    if (element) {
      this.pinned = this.distanceFromBottom(element) <= 100;
      this.showScrollToBottom.set(!this.pinned);
    }
  }

  messageEntranceIndex(messageId: string): number {
    if (!this.animateMessages()) return 0;
    return this.initialMessageIndexes.get(messageId) ?? 0;
  }

  private setupAnimationSession(): void {
    if (this.animationSessionStarted || typeof window === 'undefined') return;
    this.animationSessionStarted = true;

    if (this.prefersReducedMotion()) return;

    const element = this.messageLog()?.nativeElement;
    if (!element || typeof IntersectionObserver === 'undefined') {
      this.enableMessageAnimation();
      return;
    }

    try {
      this.animationObserver = new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting) this.enableMessageAnimation();
      }, { threshold: 0 });
      this.animationObserver.observe(element);
    } catch {
      this.enableMessageAnimation();
    }
  }

  private enableMessageAnimation(): void {
    if (this.animateMessages() || this.prefersReducedMotion()) return;

    this.animationObserver?.disconnect();
    this.animationObserver = undefined;
    this.initialMessageIndexes.clear();
    this.store.messages()
      .slice(0, INITIAL_STAGGER_LIMIT)
      .forEach((message, index) => this.initialMessageIndexes.set(message.id, index));
    this.animateMessages.set(true);
  }

  private prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }

  private distanceFromBottom(element: HTMLElement): number {
    return element.scrollHeight - element.scrollTop - element.clientHeight;
  }
}
