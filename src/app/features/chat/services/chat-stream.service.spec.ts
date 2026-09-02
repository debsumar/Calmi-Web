import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../../environments/environment';
import { ChatStreamEvent, ChatStreamRequest } from '../models/chat-api.model';
import { ChatStreamService } from './chat-stream.service';

const request: ChatStreamRequest = {
  session_id: 'web-test',
  message: 'Who speaks Tamil?',
  model_key: 'openai-lite',
  mode: 'stream',
  knowledge: 'rag',
  top_k: 4,
  rerank: false,
  embedding_profile: 'openai',
  response_length: 'medium',
  verbatim_turns: 6,
  temperature: 0.4,
  system_prompt: '',
  tools_enabled: true,
  enabled_tools: ['find_therapists'],
};

function responseFromChunks(chunks: readonly string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

function responseFromByteChunks(chunks: readonly Uint8Array[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

describe('ChatStreamService', () => {
  let service: ChatStreamService;

  beforeEach(() => {
    service = new ChatStreamService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the exact POST URL, headers, and body while appending split deltas', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(responseFromChunks([
      'data: {"type":"delta","text":"Hel',
      'lo"}\r\n\r\ndata: {"type":"delta","text":" world"}\r\ndata: {"type":"done"}\r\n\r\n',
    ]));
    vi.stubGlobal('fetch', fetchMock);
    const events: ChatStreamEvent[] = [];

    const handle = service.stream(request, (event) => events.push(event));
    await handle.completed;

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(`${environment.apiBaseUrl}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(request),
      signal: expect.any(AbortSignal),
    });
    expect(events).toEqual([
      { type: 'delta', text: 'Hello' },
      { type: 'delta', text: ' world' },
      { type: 'done' },
    ]);
  });

  it('reconstructs a multi-byte character split across two byte chunks without replacement characters', async () => {
    const encoder = new TextEncoder();
    const payload = encoder.encode('data: {"type":"delta","text":"café"}\n\ndata: {"type":"done"}\n\n');
    const splitAt = encoder.encode('data: {"type":"delta","text":"caf').length + 1;
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(responseFromByteChunks([
      payload.slice(0, splitAt),
      payload.slice(splitAt),
    ])));
    const events: ChatStreamEvent[] = [];

    await service.stream(request, (event) => events.push(event)).completed;

    expect(events).toEqual([{ type: 'delta', text: 'café' }, { type: 'done' }]);
    expect(JSON.stringify(events)).not.toContain('�');
  });

  it('parses done latency and metadata', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(responseFromChunks([
      ': keepalive\r\n\r\n',
      'data: {"type":"done","latency":{"stt_ms":0,"eou_ms":1,"rag_ms":2,"llm_ttft_ms":3,"llm_total_ms":4,"tool_ms":5,"tts_ms":6,"total_ms":7},"meta":{"model":"gpt-4o-mini","model_key":"openai-lite","provider":"openai","routing":"fact","knowledge":{"chunks":4,"sources":["therapists#directory"]}}}\r\n\r\n',
    ])));
    const events: ChatStreamEvent[] = [];

    await service.stream(request, (event) => events.push(event)).completed;

    expect(events).toHaveLength(1);
    const done = events[0];
    expect(done?.type).toBe('done');
    if (!done || done.type !== 'done') throw new Error('Expected done event');
    expect(done.latency?.total_ms).toBe(7);
    expect(done.meta?.model).toBe('gpt-4o-mini');
    expect(done.meta?.knowledge?.sources).toEqual(['therapists#directory']);
  });

  it('skips malformed JSON and keeps parsing following events', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(responseFromChunks([
      'data: {not-json}\n\n',
      'data: {"type":"delta","text":"ok"}\n\n',
      'data: {"type":"done"}\n\n',
    ])));
    const events: ChatStreamEvent[] = [];

    await service.stream(request, (event) => events.push(event)).completed;

    expect(events).toEqual([{ type: 'delta', text: 'ok' }, { type: 'done' }]);
  });

  it('ignores unknown event types', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(responseFromChunks([
      'data: {"type":"unknown","value":"ignored"}\n\ndata: {"type":"done"}\n\n',
    ])));
    const events: ChatStreamEvent[] = [];

    await service.stream(request, (event) => events.push(event)).completed;

    expect(events).toEqual([{ type: 'done' }]);
  });

  it('reports stream EOF when no done or error event was received', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(responseFromChunks([
      'data: {"type":"delta","text":"partial"}\n\n',
    ])));
    const events: ChatStreamEvent[] = [];

    await service.stream(request, (event) => events.push(event)).completed;

    expect(events).toEqual([
      { type: 'delta', text: 'partial' },
      { type: 'error', message: 'Chat stream ended before a terminal event.' },
    ]);
  });

  it('emits typed error with status and body for non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('upstream down', { status: 503 })));
    const events: ChatStreamEvent[] = [];

    await service.stream(request, (event) => events.push(event)).completed;

    expect(events).toEqual([{
      type: 'error',
      status: 503,
      message: 'Chat stream request failed (503): upstream down',
    }]);
  });

  it('passes AbortController signal and completes cleanly after cancellation', async () => {
    let resolveFetch: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(() => new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    }));
    vi.stubGlobal('fetch', fetchMock);
    const events: ChatStreamEvent[] = [];

    const handle = service.stream(request, (event) => events.push(event));
    handle.cancel();
    resolveFetch?.(new Response(null, { status: 200 }));
    await handle.completed;

    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect((init?.signal as AbortSignal).aborted).toBe(true);
    expect(events).toEqual([]);
  });
});
