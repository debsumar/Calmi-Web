import { Component, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
import { ChatMessage } from '../../models/chat-message.model';
import { ChatStoreService } from '../../services/chat-store.service';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [DatePipe, LucideDynamicIcon],
  template: `
    @switch (message().role) {
      @case ('user') {
        <article class="stagger-enter flex max-w-[85%] self-end flex-row-reverse items-start gap-3" [style.--index]="index()">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunken-alt text-brand-dark dark:text-brand-light" aria-hidden="true">
            <svg data-icon="user" [lucideIcon]="'user'" [size]="20" aria-hidden="true"></svg>
          </div>
          <div class="min-w-0 flex-1">
            <div class="rounded-2xl rounded-br-md border border-hairline bg-brand-light px-4 py-2.5 text-base text-ink dark:bg-sunken-alt">
              <p class="whitespace-pre-wrap break-words">{{ message().text }}</p>
              @if (message().status === 'error') {
                <div class="mt-2 flex flex-wrap items-center gap-2 rounded-xl border-t border-on-brand/30 bg-brand px-2 pt-2 text-xs text-on-brand" role="alert">
                  <svg [lucideIcon]="'circle-alert'" [size]="14" aria-hidden="true"></svg>
                  <span>Failed to send</span>
                  <button type="button" (click)="retry()"
                          class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-on-brand/30 px-2.5 py-1 font-semibold text-on-brand hover:bg-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-brand focus-visible:ring-offset-2 focus-visible:ring-offset-brand">
                    Retry
                  </button>
                </div>
              }
            </div>
            <time class="mt-1 block text-right text-xs text-ink-muted" [dateTime]="message().timestamp.toISOString()">
              {{ message().timestamp | date:'shortTime' }}
              @if (message().status === 'sent') {
                <svg data-icon="check-check" [lucideIcon]="'check-check'" [size]="14" class="ml-1 inline-block align-text-bottom" aria-hidden="true"></svg>
              }
            </time>
          </div>
        </article>
      }
      @case ('ai') {
        <article class="stagger-enter flex max-w-[85%] self-start items-start gap-3" [style.--index]="index()">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-hairline bg-brand-light p-0.5 dark:bg-sunken-alt" aria-hidden="true">
            <img data-icon="rumi-logo" src="assets/logos/rumi_logo.svg" alt="" class="h-5 w-5 object-contain">
          </div>
          <div class="min-w-0 flex-1">
            <div class="rounded-2xl rounded-bl-md bg-brand px-4 py-2.5 text-base text-on-brand">
              <p class="whitespace-pre-wrap break-words">{{ message().text }}</p>
            </div>
            <time class="mt-1 block text-xs text-ink-muted" [dateTime]="message().timestamp.toISOString()">
              {{ message().timestamp | date:'shortTime' }}
            </time>
          </div>
        </article>
      }
      @case ('system') {
        <article class="stagger-enter w-full self-center rounded-2xl border border-hairline bg-sunken-alt px-4 py-2.5 text-center text-xs text-ink-muted" [style.--index]="index()">
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
