import { Injectable, OnDestroy, computed, signal } from '@angular/core';
import { createGreetingMessages, pickReply } from '../data/dummy-conversation';
import { ChatMessage } from '../models/chat-message.model';

/** Greeting message ids keep their stamp live until the user starts talking. */
const GREETING_ID_PREFIX = 'greeting-';

@Injectable({ providedIn: 'root' })
export class ChatStoreService implements OnDestroy {
  private readonly _isOpen = signal(false);
  private readonly _isMinimized = signal(false);
  private readonly _messages = signal<ChatMessage[]>(createGreetingMessages());
  private readonly _isTyping = signal(false);
  private readonly _unreadCount = signal(0);
  private readonly _draft = signal('');
  private readonly _isClosing = signal(false);
  /** Wall clock, re-read on every minute boundary so stamps never lag. */
  private readonly _now = signal(new Date());
  private readonly _conversationStarted = signal(false);

  readonly isOpen = this._isOpen.asReadonly();
  readonly isMinimized = this._isMinimized.asReadonly();
  readonly isTyping = this._isTyping.asReadonly();
  readonly unreadCount = this._unreadCount.asReadonly();
  readonly draft = this._draft.asReadonly();
  /** True while the exit animation plays, before the panel is torn down. */
  readonly isClosing = this._isClosing.asReadonly();

  /**
   * The greeting is stamped from the live clock until the first user message,
   * so a panel opened minutes after bootstrap still shows the device time.
   */
  readonly messages = computed<ChatMessage[]>(() => {
    const messages = this._messages();
    if (this._conversationStarted()) return messages;

    const now = this._now();
    return messages.map((message) => (
      message.id.startsWith(GREETING_ID_PREFIX) ? { ...message, timestamp: now } : message
    ));
  });

  readonly hasMessages = computed(() => this.messages().length > 0);
  readonly canSend = computed(() => this.draft().trim().length > 0 && !this.isTyping());

  private pendingReplyTimeout: ReturnType<typeof setTimeout> | null = null;
  private closeTimeout: ReturnType<typeof setTimeout> | null = null;
  private clockTimeout: ReturnType<typeof setTimeout> | null = null;
  private clockInterval: ReturnType<typeof setInterval> | null = null;
  private readonly resyncClock = () => this.syncClock();

  constructor() {
    this.startClock();
  }

  ngOnDestroy(): void {
    this.stopClock();
    this.cancelPendingReply();
    this.cancelPendingClose();
  }

  open(): void {
    this.cancelPendingClose();
    this.syncClock();
    this._isOpen.set(true);
    this._isMinimized.set(false);
    this.markRead();
  }

  /**
   * Dismiss with the exit animation. Every close affordance routes here so the
   * panel never disappears in one frame; `close()` stays the immediate path.
   */
  requestClose(animationMs = 180): void {
    if (!this.isOpen() || this._isClosing()) return;

    this._isClosing.set(true);
    this.closeTimeout = setTimeout(() => {
      this.closeTimeout = null;
      this.close();
    }, animationMs);
  }

  close(): void {
    this.cancelPendingClose();
    this._isOpen.set(false);
    this._isMinimized.set(false);
  }

  toggle(): void {
    if (this.isOpen()) {
      this.requestClose();
    } else {
      this.open();
    }
  }

  cancelPendingClose(): void {
    if (this.closeTimeout !== null) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
    this._isClosing.set(false);
  }

  minimize(): void {
    this._isMinimized.set(true);
  }

  setDraft(value: string): void {
    this._draft.set(value);
  }

  send(): void {
    if (!this.canSend()) return;

    const text = this.draft().trim();
    const now = new Date();
    this.freezeGreeting(now);
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      timestamp: now,
      status: 'sent',
    };

    this._messages.update((messages) => [...messages, userMessage]);
    this._draft.set('');
    this._isTyping.set(true);
    this.scheduleReply(userMessage.id, text);
  }

  retry(id: string): void {
    const message = this.messages().find((candidate) => candidate.id === id);
    if (!message || message.role !== 'user' || message.status !== 'error' || this.isTyping()) return;

    this._messages.update((messages) => messages.map((candidate) => (
      candidate.id === id ? { ...candidate, status: 'sending' } : candidate
    )));
    this._isTyping.set(true);
    this.scheduleReply(message.id, message.text);
  }

  clearError(): void {
    this._messages.update((messages) => messages.map((message) => (
      message.status === 'error' ? { ...message, status: 'sent' } : message
    )));
  }

  markRead(): void {
    this._unreadCount.set(0);
  }

  reset(): void {
    this.cancelPendingReply();
    this.cancelPendingClose();
    this._isOpen.set(false);
    this._isMinimized.set(false);
    this._messages.set(createGreetingMessages());
    this._conversationStarted.set(false);
    this._now.set(new Date());
    this._isTyping.set(false);
    this._unreadCount.set(0);
    this._draft.set('');
  }

  cancelPendingReply(): void {
    if (this.pendingReplyTimeout !== null) {
      clearTimeout(this.pendingReplyTimeout);
      this.pendingReplyTimeout = null;
    }
    this._isTyping.set(false);
  }

  private scheduleReply(userMessageId: string, userText: string): void {
    const delay = 700 + (userText.length % 701);
    this.pendingReplyTimeout = setTimeout(() => {
      this.pendingReplyTimeout = null;
      this._messages.update((messages) => messages.map((message) => (
        message.id === userMessageId ? { ...message, status: 'sent' } : message
      )));
      this._messages.update((messages) => [...messages, {
        id: crypto.randomUUID(),
        role: 'ai',
        text: pickReply(userText),
        timestamp: new Date(),
        status: 'sent',
      }]);
      this._isTyping.set(false);
      if (!this.isOpen()) {
        this._unreadCount.update((count) => count + 1);
      }
    }, delay);
  }

  /**
   * Ticks on the minute boundary (not every 60s from bootstrap) so the rendered
   * `shortTime` flips at the same instant the device clock does. Also resyncs on
   * tab focus, because background throttling can stall the interval.
   */
  private startClock(): void {
    if (typeof setTimeout !== 'function') return;

    this.syncClock();
    const msToNextMinute = 60_000 - (Date.now() % 60_000);
    this.clockTimeout = setTimeout(() => {
      this.clockTimeout = null;
      this.syncClock();
      this.clockInterval = setInterval(this.resyncClock, 60_000);
    }, msToNextMinute);

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.resyncClock);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', this.resyncClock);
    }
  }

  private stopClock(): void {
    if (this.clockTimeout !== null) {
      clearTimeout(this.clockTimeout);
      this.clockTimeout = null;
    }
    if (this.clockInterval !== null) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.resyncClock);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', this.resyncClock);
    }
  }

  private syncClock(): void {
    const now = new Date();
    if (Math.floor(now.getTime() / 60_000) === Math.floor(this._now().getTime() / 60_000)) return;
    this._now.set(now);
  }

  /** Pins the greeting stamps once the conversation actually begins. */
  private freezeGreeting(now: Date): void {
    this._now.set(now);
    if (this._conversationStarted()) return;

    this._messages.update((messages) => messages.map((message) => (
      message.id.startsWith(GREETING_ID_PREFIX) ? { ...message, timestamp: now } : message
    )));
    this._conversationStarted.set(true);
  }
}