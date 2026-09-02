import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import {
  RagChunk,
  RagQueryError,
  RagQueryMeta,
  RagQueryRequest,
  RagQueryResponse,
} from '../models/chat-api.model';

type JsonObject = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class RagQueryService {
  async query(request: RagQueryRequest, signal: AbortSignal): Promise<RagQueryResponse> {
    let response: Response;
    try {
      response = await fetch(`${environment.apiBaseUrl}/rag/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(request),
        signal,
      });
    } catch (error: unknown) {
      if (signal.aborted) throw error;
      throw new RagQueryError(this.errorMessage(error));
    }

    if (!response.ok) {
      const responseBody = await response.text();
      throw new RagQueryError(
        `RAG query request failed (${response.status})${responseBody ? `: ${responseBody}` : ''}`,
        { status: response.status, responseBody },
      );
    }

    let payload: unknown;
    try {
      payload = await response.json() as unknown;
    } catch {
      throw new RagQueryError('RAG query response was not valid JSON.');
    }

    return this.parseResponse(payload);
  }

  private parseResponse(value: unknown): RagQueryResponse {
    const object = this.isObject(value) ? value : {};
    return {
      chunks: this.parseChunks(object['chunks']),
      context: this.stringValue(object['context']),
      latency: {
        embed_ms: this.numberValue(this.objectValue(object['latency'])?.['embed_ms']),
        search_ms: this.numberValue(this.objectValue(object['latency'])?.['search_ms']),
        rerank_ms: this.numberValue(this.objectValue(object['latency'])?.['rerank_ms']),
        rag_ms: this.numberValue(this.objectValue(object['latency'])?.['rag_ms']),
      },
      meta: this.parseMeta(object['meta']),
      query_point: {
        x: this.numberValue(this.objectValue(object['query_point'])?.['x']),
        y: this.numberValue(this.objectValue(object['query_point'])?.['y']),
      },
      retrieved_ids: this.stringArray(object['retrieved_ids']),
      would_retrieve: typeof object['would_retrieve'] === 'boolean' ? object['would_retrieve'] : false,
    };
  }

  private parseChunks(value: unknown): RagChunk[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is JsonObject => this.isObject(item)).map((item) => ({
      id: this.stringValue(item['id']),
      doc: this.stringValue(item['doc']),
      heading: this.stringValue(item['heading']),
      text: this.stringValue(item['text']),
      preview: this.stringValue(item['preview']),
      score: this.numberValue(item['score']),
      rank: this.numberValue(item['rank']),
    }));
  }

  private parseMeta(value: unknown): RagQueryMeta {
    const object = this.objectValue(value);
    const cache = this.objectValue(object?.['cache']);
    return {
      profile: this.stringValue(object?.['profile']),
      model: this.stringValue(object?.['model']),
      k: this.numberValue(object?.['k']),
      reranked: typeof object?.['reranked'] === 'boolean' ? object['reranked'] : false,
      pool: this.numberValue(object?.['pool']),
      cache: {
        hits: this.numberValue(cache?.['hits']),
        misses: this.numberValue(cache?.['misses']),
        size: this.numberValue(cache?.['size']),
      },
    };
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }

  private stringValue(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private numberValue(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  private objectValue(value: unknown): JsonObject | undefined {
    return this.isObject(value) ? value : undefined;
  }

  private isObject(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'RAG query request failed.';
  }
}
