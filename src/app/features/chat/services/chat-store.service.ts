import { Injectable, computed, signal } from '@angular/core';
import { GREETING_MESSAGES, pickReply } from '../data/dummy-conversation';
import { ChatMessage } from '../models/chat-message.model';

@Injectable({ providedIn: 'root' })
export class ChatStoreService {
  private readonly _isOpen = signal(false);
  private readonly _isMinimized = signal(false);
  private readonly _messages = signal<ChatMessage[]>(this.cloneMessages(GREETING_MESSAGES));
  private readonly _isTyping = signal(false);
  private readonly _unreadCount = signal(0);
  private readonly _draft = signal('');
  private readonly _isClosing = signal(false);

  readonly isOpen = this._isOpen.asReadonly();
  readonly isMinimized = this._isMinimized.asReadonly();
  readonly messages = this._messages.asReadonly();
  readonly isTyping = this._isTyping.asReadonly();
  readonly unreadCount = this._unreadCount.asReadonly();
  readonly draft = this._draft.asReadonly();
  /** True while the exit animation plays, before the panel is torn down. */
  readonly isClosing = this._isClosing.asReadonly();

  readonly hasMessages = computed(() => this.messages().length > 0);
  readonly canSend = computed(() => this.draft().trim().length > 0 && !this.isTyping());

  private pendingReplyTimeout: ReturnType<typeof setTimeout> | null = null;
  private closeTimeout: ReturnType<typeof setTimeout> | null = null;

  open(): void {
    this.cancelPendingClose();
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
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      timestamp: new Date(),
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
    this._messages.set(this.cloneMessages(GREETING_MESSAGES));
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

  private cloneMessages(messages: ChatMessage[]): ChatMessage[] {
    return messages.map((message) => ({ ...message, timestamp: new Date(message.timestamp) }));
  }
}
