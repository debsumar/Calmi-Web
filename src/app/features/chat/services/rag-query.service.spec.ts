import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../../environments/environment';
import { RagQueryError, RagQueryRequest } from '../models/chat-api.model';
import { RagQueryService } from './rag-query.service';

const request: RagQueryRequest = {
  query: "I can't sleep",
  k: 4,
  rerank: false,
  profile: 'openai',
};

const responseBody = {
  chunks: [{
    id: 'sleep#library-0',
    doc: 'sleep',
    heading: 'Sleep library',
    text: 'Sleep content',
    preview: 'Sleep preview',
    score: 0.4,
    rank: 0,
  }],
  context: '[sleep — Sleep library] Sleep content',
  latency: { embed_ms: 1, search_ms: 2, rerank_ms: 0, rag_ms: 3 },
  meta: {
    profile: 'openai',
    model: 'text-embedding-3-small',
    k: 4,
    reranked: false,
    pool: 4,
    cache: { hits: 1, misses: 2, size: 3 },
  },
  query_point: { x: 0.1, y: -0.2 },
  retrieved_ids: ['sleep#library-0'],
  would_retrieve: false,
};

describe('RagQueryService', () => {
  let service: RagQueryService;

  beforeEach(() => {
    service = new RagQueryService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts exact URL, headers, and request body', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();

    await expect(service.query(request, controller.signal)).resolves.toEqual(responseBody);
    expect(fetchMock).toHaveBeenCalledWith(`${environment.apiBaseUrl}/rag/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
  });

  it('throws RagQueryError for non-OK responses with status and body', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('upstream down', { status: 503 })));

    await expect(service.query(request, new AbortController().signal)).rejects.toMatchObject({
      name: 'RagQueryError',
      status: 503,
      responseBody: 'upstream down',
      message: 'RAG query request failed (503): upstream down',
    });
  });

  it('throws RagQueryError for malformed JSON', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('{bad-json', { status: 200 })));

    const result = service.query(request, new AbortController().signal);
    await expect(result).rejects.toBeInstanceOf(RagQueryError);
    await expect(result).rejects.toThrow('RAG query response was not valid JSON.');
  });

  it('propagates abort rejection and signal to fetch', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = service.query(request, controller.signal);
    controller.abort();

    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  });
});
