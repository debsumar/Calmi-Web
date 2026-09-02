import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../../environments/environment';
import {
  ChatDoneMeta,
  ChatLatency,
  ChatStreamEvent,
  ChatStreamHandle,
  ChatStreamRequest,
  RagQueryError,
  RagQueryRequest,
  RagQueryResponse,
} from '../models/chat-api.model';
import { ChatSessionIdService } from './chat-session-id.service';
import { ChatStoreService } from './chat-store.service';
import { ChatStreamService } from './chat-stream.service';
import { RagQueryService } from './rag-query.service';

type EventCallback = (event: ChatStreamEvent) => void;

const sessionId = 'web-abcd1234';

const latency: ChatLatency = {
  stt_ms: 1,
  eou_ms: 2,
  rag_ms: 3,
  llm_ttft_ms: 4,
  llm_total_ms: 5,
  tool_ms: 6,
  tts_ms: 7,
  total_ms: 8,
};

const meta: ChatDoneMeta = {
  model: 'gpt-4o-mini',
  model_key: 'openai-lite',
  provider: 'openai',
  mode: 'stream',
  routing: 'fact',
};

const ragResponse: RagQueryResponse = {
  chunks: [],
  context: 'sleep context',
  latency: { embed_ms: 1, search_ms: 2, rerank_ms: 0, rag_ms: 3 },
  meta: {
    profile: 'openai',
    model: 'text-embedding-3-small',
    k: 4,
    reranked: false,
    pool: 4,
    cache: { hits: 1, misses: 2, size: 3 },
  },
  query_point: { x: 0, y: 0 },
  retrieved_ids: [],
  would_retrieve: false,
};

describe('ChatStoreService', () => {
  let service: ChatStoreService;
  let streamMock: ReturnType<typeof vi.fn<ChatStreamService['stream']>>;
  let ragMock: ReturnType<typeof vi.fn<RagQueryService['query']>>;
  let ragRequests: RagQueryRequest[];
  let ragSignals: AbortSignal[];
  let requests: ChatStreamRequest[];
  let callbacks: EventCallback[];
  let cancelMocks: ReturnType<typeof vi.fn>[];

  beforeEach(() => {
    requests = [];
    ragRequests = [];
    ragSignals = [];
    callbacks = [];
    cancelMocks = [];
    streamMock = vi.fn<ChatStreamService['stream']>();
    ragMock = vi.fn<RagQueryService['query']>().mockImplementation((request, signal) => {
      ragRequests.push(request);
      ragSignals.push(signal);
      return Promise.resolve(ragResponse);
    });
    streamMock.mockImplementation((request, onEvent): ChatStreamHandle => {
      requests.push(request);
      callbacks.push(onEvent);
      const cancel = vi.fn();
      cancelMocks.push(cancel);
      return { completed: Promise.resolve(), cancel };
    });

    TestBed.configureTestingModule({
      providers: [
        ChatStoreService,
        { provide: ChatStreamService, useValue: { stream: streamMock } },
        { provide: RagQueryService, useValue: { query: ragMock } },
        { provide: ChatSessionIdService, useValue: { sessionId } },
      ],
    });
    service = TestBed.inject(ChatStoreService);
  });

  afterEach(() => {
    service.stopGeneration();
  });

  const emit = (index: number, event: ChatStreamEvent): void => {
    const callback = callbacks[index];
    if (!callback) throw new Error(`Missing stream callback ${index}`);
    callback(event);
  };

  const settle = async (): Promise<void> => {
    await Promise.resolve();
    await Promise.resolve();
  };

  it('sends the exact contract request body with the generated session ID', async () => {
    service.setDraft('I need a quiet moment');
    service.send();
    await settle();

    expect(ragRequests).toEqual([{
      query: 'I need a quiet moment',
      k: environment.chat.topK,
      rerank: environment.chat.rerank,
      profile: environment.chat.embeddingProfile,
    }]);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toEqual({
      session_id: sessionId,
      message: 'I need a quiet moment',
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
    });
  });

  it('waits for the rag query to resolve before starting the stream', async () => {
    // Deferred rag promise: if the stream were dispatched in parallel (or first),
    // `requests` would already be populated before we resolve the rag call.
    let resolveRag: ((value: RagQueryResponse) => void) | undefined;
    ragMock.mockImplementationOnce((request, signal) => {
      ragRequests.push(request);
      ragSignals.push(signal);
      return new Promise<RagQueryResponse>((resolve) => {
        resolveRag = resolve;
      });
    });

    service.setDraft('I cannot sleep');
    service.send();
    await settle();

    expect(ragRequests).toHaveLength(1);
    expect(requests).toHaveLength(0);
    expect(service.isTyping()).toBe(true);

    resolveRag?.(ragResponse);
    await settle();

    expect(requests).toHaveLength(1);
    expect(requests[0]?.message).toBe('I cannot sleep');
  });

  it('concatenates repeated deltas and retains done latency and metadata', async () => {
    service.setDraft('Help me settle');
    service.send();
    await settle();

    emit(0, { type: 'delta', text: 'Take ' });
    emit(0, { type: 'delta', text: 'one breath.' });
    emit(0, { type: 'done', latency, meta });

    const assistant = service.messages().find((message) => message.role === 'ai');
    expect(assistant?.text).toBe('Take one breath.');
    expect(assistant?.status).toBe('sent');
    expect(assistant?.latency).toEqual(latency);
    expect(assistant?.meta).toEqual(meta);
    expect(service.isStreaming()).toBe(false);
    expect(service.isTyping()).toBe(false);
  });

  it('marks the user message as error when the stream reports an error', async () => {
    service.setDraft('I feel anxious');
    service.send();
    await settle();
    emit(0, { type: 'delta', text: 'I can help.' });
    emit(0, { type: 'error', message: 'Upstream unavailable' });

    expect(service.messages().some((message) => message.role === 'ai')).toBe(false);
    expect(service.messages().find((message) => message.role === 'user')?.status).toBe('error');
    expect(service.isStreaming()).toBe(false);
  });

  it('reuses the same session ID when retrying a failed message', async () => {
    service.setDraft('Please try again');
    service.send();
    await settle();
    emit(0, { type: 'error', message: 'Temporary failure' });

    const userMessage = service.messages().find((message) => message.role === 'user');
    if (!userMessage) throw new Error('Expected user message');
    service.retry(userMessage.id);
    await settle();

    expect(requests).toHaveLength(2);
    expect(requests[0]?.session_id).toBe(sessionId);
    expect(requests[1]?.session_id).toBe(sessionId);
  });

  it('cancels an active stream when stopGeneration is called', async () => {
    service.setDraft('Stop this request');
    service.send();
    await settle();

    service.stopGeneration();

    expect(cancelMocks[0]).toHaveBeenCalledOnce();
    expect(service.isStreaming()).toBe(false);
    expect(service.isTyping()).toBe(false);
  });

  it('continues to stream and records RAG failure', async () => {
    ragMock.mockRejectedValueOnce(new RagQueryError('offline'));
    service.setDraft('I cannot sleep');
    service.send();
    await settle();

    expect(requests).toHaveLength(1);
    emit(0, { type: 'delta', text: 'I hear you.' });
    emit(0, { type: 'done' });

    const assistant = service.messages().find((message) => message.role === 'ai');
    expect(assistant?.text).toBe('I hear you.');
    expect(assistant?.ragError).toBe('offline');
  });

  it('does not start stream when stopped during RAG query', async () => {
    let resolveRag!: (value: RagQueryResponse) => void;
    ragMock.mockImplementationOnce((_request, signal) => {
      ragSignals.push(signal);
      return new Promise<RagQueryResponse>((resolve) => {
        resolveRag = resolve;
      });
    });
    service.setDraft('Cancel this retrieval');
    service.send();
    await Promise.resolve();

    service.stopGeneration();
    resolveRag(ragResponse);
    await settle();

    expect(ragSignals[0]?.aborted).toBe(true);
    expect(requests).toHaveLength(0);
  });

  it('applies reduced knowledge metadata on done', async () => {
    service.setDraft('I feel overwhelmed');
    service.send();
    await settle();
    emit(0, { type: 'delta', text: 'I am here.' });
    emit(0, { type: 'done', meta: { knowledge: { mode: 'rag', skipped: 'emotional turn', chunks: 0 } } });

    const assistant = service.messages().find((message) => message.role === 'ai');
    expect(assistant?.meta?.knowledge).toEqual({ mode: 'rag', skipped: 'emotional turn', chunks: 0 });
  });

});