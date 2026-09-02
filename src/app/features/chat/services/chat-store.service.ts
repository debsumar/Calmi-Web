import { computed, DestroyRef, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { ChatMessage } from '../models/chat-message.model';
import {
  ChatDoneEvent,
  ChatStreamEvent,
  ChatStreamHandle,
  ChatStreamRequest,
  RagQueryRequest,
  RagQueryResponse,
} from '../models/chat-api.model';
import { ChatStreamService } from './chat-stream.service';
import { ChatSessionIdService } from './chat-session-id.service';
import { RagQueryService } from './rag-query.service';

@Injectable({ providedIn: 'root' })
export class ChatStoreService implements OnDestroy {
  private readonly streamService = inject(ChatStreamService);
  private readonly ragQueryService = inject(RagQueryService);
  private readonly sessionIdService = inject(ChatSessionIdService);
  private readonly _isOpen = signal(false);
  private readonly _isMinimized = signal(false);
  private readonly _messages = signal<ChatMessage[]>([]);
  private readonly _isTyping = signal(false);
  private readonly _isStreaming = signal(false);
  private readonly _unreadCount = signal(0);
  private readonly _draft = signal('');
  private readonly _isClosing = signal(false);
  private readonly _embeddedConversationVisible = signal(false);

  readonly isOpen = this._isOpen.asReadonly();
  readonly isMinimized = this._isMinimized.asReadonly();
  readonly isTyping = this._isTyping.asReadonly();
  readonly isStreaming = this._isStreaming.asReadonly();
  readonly unreadCount = this._unreadCount.asReadonly();
  readonly draft = this._draft.asReadonly();
  /** True while the exit animation plays, before the panel is torn down. */
  readonly isClosing = this._isClosing.asReadonly();
  readonly isConversationVisible = computed(() => this.isOpen() || this._embeddedConversationVisible());

  readonly messages = this._messages.asReadonly();
  readonly hasMessages = computed(() => this.messages().length > 0);
  readonly canSend = computed(() => this.draft().trim().length > 0 && !this.isStreaming());

  private activeHandle: ChatStreamHandle | null = null;
  private activeRagController: AbortController | null = null;
  private activeGeneration = 0;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.cancelPendingClose();
      this.stopGeneration();
    });
  }

  ngOnDestroy(): void {
    this.cancelPendingClose();
    this.stopGeneration();
  }

  open(): void {
    this.cancelPendingClose();
    this._isOpen.set(true);
    this._isMinimized.set(false);
    this.markRead();
  }

  requestClose(animationMs = 180): void {
    if (!this.isOpen() || this._isClosing()) return;

    this._isClosing.set(true);
    this.closeTimer = setTimeout(() => {
      this.closeTimer = undefined;
      this.close();
    }, animationMs);
  }

  close(): void {
    this.cancelPendingClose();
    this.stopGeneration();
    this._isOpen.set(false);
    this._isMinimized.set(false);
  }

  toggle(): void {
    if (this.isOpen()) this.requestClose();
    else this.open();
  }

  cancelPendingClose(): void {
    if (this.closeTimer !== undefined) {
      clearTimeout(this.closeTimer);
      this.closeTimer = undefined;
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
      status: 'sending',
    };

    this._messages.update((messages) => [...messages, userMessage]);
    this._draft.set('');
    this.startGeneration(userMessage.id, text);
  }

  retry(id: string): void {
    const message = this.messages().find((candidate) => candidate.id === id);
    if (!message || message.role !== 'user' || message.status !== 'error' || this.isStreaming()) return;

    this._messages.update((messages) => messages.map((candidate) => (
      candidate.id === id ? { ...candidate, status: 'sending' } : candidate
    )));
    this.startGeneration(message.id, message.text);
  }

  clearError(): void {
    this._messages.update((messages) => messages.map((message) => (
      message.status === 'error' ? { ...message, status: 'sent' } : message
    )));
  }

  markRead(): void {
    this._unreadCount.set(0);
  }

  setEmbeddedConversationVisible(visible: boolean): void {
    this._embeddedConversationVisible.set(visible);
    if (visible) this.markRead();
  }

  reset(): void {
    this.stopGeneration();
    this.cancelPendingClose();
    this._isOpen.set(false);
    this._isMinimized.set(false);
    this._messages.set([]);
    this._unreadCount.set(0);
    this._draft.set('');
    this._embeddedConversationVisible.set(false);
  }

  cancelPendingReply(): void {
    this.stopGeneration();
  }

  stopGeneration(): void {
    this.activeGeneration += 1;
    this.activeRagController?.abort();
    this.activeRagController = null;
    this.activeHandle?.cancel();
    this.activeHandle = null;
    this._isStreaming.set(false);
    this._isTyping.set(false);
  }

  private startGeneration(userMessageId: string, text: string): void {
    this.stopGeneration();
    const generation = ++this.activeGeneration;
    const ragController = new AbortController();
    this.activeRagController = ragController;
    this._isStreaming.set(true);
    this._isTyping.set(true);

    const ragRequest: RagQueryRequest = {
      query: text,
      k: environment.chat.topK,
      rerank: environment.chat.rerank,
      profile: environment.chat.embeddingProfile,
    };
    const request: ChatStreamRequest = {
      session_id: this.sessionIdService.sessionId,
      message: text,
      model_key: environment.chat.modelKey,
      mode: environment.chat.mode,
      knowledge: environment.chat.knowledge,
      top_k: environment.chat.topK,
      rerank: environment.chat.rerank,
      embedding_profile: environment.chat.embeddingProfile,
      response_length: environment.chat.responseLength,
      verbatim_turns: environment.chat.verbatimTurns,
      temperature: environment.chat.temperature,
      system_prompt: environment.chat.systemPrompt,
      tools_enabled: environment.chat.toolsEnabled,
      enabled_tools: environment.chat.enabledTools,
    };

    void this.runGeneration(generation, userMessageId, ragRequest, request, ragController);
  }

  private async runGeneration(
    generation: number,
    userMessageId: string,
    ragRequest: RagQueryRequest,
    request: ChatStreamRequest,
    ragController: AbortController,
  ): Promise<void> {
    let ragResponse: RagQueryResponse | undefined;
    let ragError: string | undefined;
    try {
      ragResponse = await this.ragQueryService.query(ragRequest, ragController.signal);
    } catch (error: unknown) {
      if (generation !== this.activeGeneration || ragController.signal.aborted) return;
      // Retrieval is auxiliary; server does its own RAG, so blocking reply would break chat for no gain.
      ragError = this.errorMessage(error);
    }

    if (generation !== this.activeGeneration || ragController.signal.aborted) return;
    this.activeRagController = null;

    let assistantMessageId: string | null = null;
    const handle = this.streamService.stream(request, (event) => {
      if (generation !== this.activeGeneration) return;
      if (event.type === 'delta') {
        if (!assistantMessageId) {
          assistantMessageId = crypto.randomUUID();
          this._messages.update((messages) => [...messages, {
            id: assistantMessageId as string,
            role: 'ai',
            text: event.text,
            timestamp: new Date(),
            status: 'streaming',
            ...(ragResponse ? { rag: ragResponse } : {}),
            ...(ragError ? { ragError } : {}),
          }]);
        } else {
          this._messages.update((messages) => messages.map((message) => (
            message.id === assistantMessageId
              ? { ...message, text: message.text + event.text }
              : message
          )));
        }
        this.markUserSent(userMessageId);
        return;
      }
      if (event.type === 'done') {
        this.finishGeneration(generation, userMessageId, assistantMessageId, event.latency, event.meta, ragResponse, ragError);
        return;
      }
      this.failGeneration(generation, userMessageId, assistantMessageId);
    });

    this.activeHandle = handle;
    void handle.completed.then(() => {
      if (generation === this.activeGeneration && this.activeHandle === handle) {
        this.activeHandle = null;
      }
    });
  }

  private finishGeneration(
    generation: number,
    userMessageId: string,
    assistantMessageId: string | null,
    latency?: ChatDoneEvent['latency'],
    meta?: ChatDoneEvent['meta'],
    ragResponse?: RagQueryResponse,
    ragError?: string,
  ): void {
    if (generation !== this.activeGeneration) return;
    this.markUserSent(userMessageId);
    if (assistantMessageId) {
      this._messages.update((messages) => messages.map((message) => (
        message.id === assistantMessageId
          ? {
              ...message,
              status: 'sent',
              ...(latency ? { latency } : {}),
              ...(meta ? { meta } : {}),
              ...(ragResponse ? { rag: ragResponse } : {}),
              ...(ragError ? { ragError } : {}),
            }
          : message
      )));
    }
    this._isStreaming.set(false);
    this._isTyping.set(false);
    this.activeHandle = null;
    if (!this.isConversationVisible()) this._unreadCount.update((count) => count + 1);
  }

  private failGeneration(generation: number, userMessageId: string, assistantMessageId: string | null): void {
    if (generation !== this.activeGeneration) return;
    this._messages.update((messages) => messages
      .filter((message) => message.id !== assistantMessageId)
      .map((message) => message.id === userMessageId ? { ...message, status: 'error' } : message));
    this._isStreaming.set(false);
    this._isTyping.set(false);
    this.activeHandle = null;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'RAG query request failed.';
  }

  private markUserSent(userMessageId: string): void {
    this._messages.update((messages) => messages.map((message) => (
      message.id === userMessageId && message.status === 'sending'
        ? { ...message, status: 'sent' }
        : message
    )));
  }
}
