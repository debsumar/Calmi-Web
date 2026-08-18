import { Component, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LucideCircleAlert, LucideDynamicIcon, provideLucideIcons } from '@lucide/angular';
import { ChatMessage } from '../../models/chat-message.model';
import { ChatStoreService } from '../../services/chat-store.service';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [DatePipe, LucideDynamicIcon],
  providers: [provideLucideIcons(LucideCircleAlert)],
  template: `
    @switch (message().role) {
      @case ('user') {
        <article class="stagger-enter self-end max-w-[85%]" [style.--index]="index()">
          <div class="bg-brand-deep text-on-brand rounded-2xl rounded-br-md px-4 py-2.5 text-base">
            <p class="whitespace-pre-wrap break-words">{{ message().text }}</p>
            @if (message().status === 'error') {
              <div class="mt-2 flex flex-wrap items-center gap-2 border-t border-white/30 pt-2 text-xs" role="alert">
                <svg [lucideIcon]="'alert-circle'" [size]="14" aria-hidden="true"></svg>
                <span>Failed to send</span>
                <button type="button" (click)="retry()"
                        class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white px-2.5 py-1 font-semibold text-on-brand hover:bg-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-deep">
                  Retry
                </button>
              </div>
            }
          </div>
          <time class="mt-1 block text-right text-xs text-brand-dark/80 dark:text-brand-light/80" [dateTime]="message().timestamp.toISOString()">
            {{ message().timestamp | date:'shortTime' }}
          </time>
        </article>
      }
      @case ('ai') {
        <article class="stagger-enter self-start max-w-[85%]" [style.--index]="index()">
          <div class="bg-sunken rounded-2xl rounded-bl-md border border-hairline px-4 py-2.5 text-base text-brand-dark dark:text-brand-light">
            <p class="whitespace-pre-wrap break-words">{{ message().text }}</p>
          </div>
          <time class="mt-1 block text-xs text-brand-dark/80 dark:text-brand-light/80" [dateTime]="message().timestamp.toISOString()">
            {{ message().timestamp | date:'shortTime' }}
          </time>
        </article>
      }
      @case ('system') {
        <article class="stagger-enter w-full self-center rounded-2xl border border-hairline bg-sunken-alt px-4 py-2.5 text-center text-xs text-brand-dark/80 dark:text-brand-light/80" [style.--index]="index()">
          <p>{{ message().text }}</p>
          <time class="mt-1 block text-xs" [dateTime]="message().timestamp.toISOString()">
            {{ message().timestamp | date:'shortTime' }}
          </time>
        </article>
      }
    }
  `,
  styles: `
    @media (prefers-reduced-motion: reduce) {
      .stagger-enter {
        animation: none !important;
        opacity: 1;
        transform: none;
      }
    }
  `,
})
export class ChatMessageComponent {
  readonly message = input.required<ChatMessage>();
  readonly index = input(0);
  private readonly store = inject(ChatStoreService);

  retry(): void {
    this.store.retry(this.message().id);
  }
}
