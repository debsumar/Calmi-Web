import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import {
  ChatDeltaEvent,
  ChatDoneEvent,
  ChatDoneMeta,
  ChatErrorEvent,
  ChatKnowledgeMeta,
  ChatLatency,
  ChatStreamEvent,
  ChatStreamHandle,
  ChatStreamRequest,
  ChatToolCall,
} from '../models/chat-api.model';

type EventListener = (event: ChatStreamEvent) => void;
type JsonObject = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class ChatStreamService {
  stream(request: ChatStreamRequest, onEvent: EventListener): ChatStreamHandle {
    const controller = new AbortController();
    const completed = this.run(request, onEvent, controller).catch((error: unknown) => {
      onEvent({ type: 'error', message: this.errorMessage(error) });
    });

    return {
      completed,
      cancel: () => controller.abort(),
    };
  }

  private async run(
    request: ChatStreamRequest,
    onEvent: EventListener,
    controller: AbortController,
  ): Promise<void> {
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let terminalEventSeen = false;

    try {
      const response = await fetch(`${environment.apiBaseUrl}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!response.ok) {
        const responseBody = await response.text();
        onEvent({
          type: 'error',
          status: response.status,
          message: `Chat stream request failed (${response.status})${responseBody ? `: ${responseBody}` : ''}`,
        });
        return;
      }

      if (controller.signal.aborted) return;

      if (!response.body) {
        onEvent({ type: 'error', message: 'Chat stream response had no body.' });
        return;
      }

      reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8', { fatal: false });
      let buffer = '';
      const dispatch = (block: string): void => {
        const event = this.parseBlock(block);
        if (!event) return;
        onEvent(event);
        if (event.type === 'done' || event.type === 'error') terminalEventSeen = true;
      };

      while (true) {
        const result = await reader.read();
        if (result.done) break;
        buffer += decoder.decode(result.value, { stream: true });
        buffer = this.dispatchCompleteBlocks(buffer, dispatch);
      }

      buffer += decoder.decode();
      if (buffer.trim()) dispatch(buffer);
      if (!terminalEventSeen && !controller.signal.aborted) {
        onEvent({ type: 'error', message: 'Chat stream ended before a terminal event.' });
      }
    } catch (error: unknown) {
      onEvent({
        type: 'error',
        aborted: controller.signal.aborted,
        message: controller.signal.aborted ? 'Chat stream aborted.' : this.errorMessage(error),
      });
    } finally {
      if (reader) {
        try {
          await reader.cancel();
        } catch {
          // Reader may already be closed by the server.
        }
        reader.releaseLock();
      }
    }
  }

  private dispatchCompleteBlocks(buffer: string, dispatch: (block: string) => void): string {
    let boundary = /\r?\n\r?\n/.exec(buffer);
    while (boundary) {
      const boundaryIndex = boundary.index;
      dispatch(buffer.slice(0, boundaryIndex));
      buffer = buffer.slice(boundaryIndex + boundary[0].length);
      boundary = /\r?\n\r?\n/.exec(buffer);
    }
    return buffer;
  }

  private parseBlock(block: string): ChatStreamEvent | null {
    const dataLines: string[] = [];
    for (const line of block.split(/\r?\n/)) {
      if (!line || line.startsWith(':')) continue;
      if (!line.startsWith('data:')) continue;
      const value = line.slice(5);
      dataLines.push(value['startsWith'](' ') ? value['slice'](1) : value);
    }

    if (dataLines.length === 0) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(dataLines.join('\n')) as unknown;
    } catch {
      return null;
    }
    if (!this.isObject(parsed) || typeof parsed['type'] !== 'string') return null;

    switch (parsed['type']) {
      case 'delta':
        return typeof parsed['text'] === 'string'
          ? ({ type: 'delta', text: parsed['text'] } satisfies ChatDeltaEvent)
          : null;
      case 'done':
        return this.parseDone(parsed);
      case 'error':
        return typeof parsed['message'] === 'string'
          ? ({ type: 'error', message: parsed['message'] } satisfies ChatErrorEvent)
          : null;
      default:
        return null;
    }
  }

  private parseDone(value: JsonObject): ChatDoneEvent {
    const latency = this.parseLatency(value['latency']);
    const meta = this.parseMeta(value['meta']);
    return {
      type: 'done',
      ...(latency ? { latency } : {}),
      ...(meta ? { meta } : {}),
    };
  }

  private parseLatency(value: unknown): ChatLatency | undefined {
    if (!this.isObject(value)) return undefined;
    const fields = ['stt_ms', 'eou_ms', 'rag_ms', 'llm_ttft_ms', 'llm_total_ms', 'tool_ms', 'tts_ms', 'total_ms'] as const;
    if (!fields.every((field) => typeof value[field] === 'number')) return undefined;
    return {
      stt_ms: value['stt_ms'] as number,
      eou_ms: value['eou_ms'] as number,
      rag_ms: value['rag_ms'] as number,
      llm_ttft_ms: value['llm_ttft_ms'] as number,
      llm_total_ms: value['llm_total_ms'] as number,
      tool_ms: value['tool_ms'] as number,
      tts_ms: value['tts_ms'] as number,
      total_ms: value['total_ms'] as number,
    };
  }

  private parseMeta(value: unknown): ChatDoneMeta | undefined {
    if (!this.isObject(value)) return undefined;
    const meta: ChatDoneMeta = {};
    if (typeof value['model'] === 'string') meta.model = value['model'];
    if (typeof value['model_key'] === 'string') meta.model_key = value['model_key'];
    if (typeof value['provider'] === 'string') meta.provider = value['provider'];
    if (typeof value['mode'] === 'string') meta.mode = value['mode'];
    if (typeof value['routing'] === 'string') meta.routing = value['routing'];
    if (typeof value['verbatim_messages'] === 'number') meta.verbatim_messages = value['verbatim_messages'];
    if (typeof value['summarized_messages'] === 'number') meta.summarized_messages = value['summarized_messages'];
    if (typeof value['summary_used'] === 'boolean') meta.summary_used = value['summary_used'];
    if (typeof value['system_chars'] === 'number') meta.system_chars = value['system_chars'];
    if (Array.isArray(value['tools_advertised'])) {
      meta.tools_advertised = value['tools_advertised'].filter((item): item is string => typeof item === 'string');
    }
    if (Array.isArray(value['tool_calls'])) {
      meta.tool_calls = value['tool_calls'].filter((item): item is ChatToolCall => this.isObject(item));
    }
    const knowledge = this.parseKnowledge(value['knowledge']);
    if (knowledge) meta.knowledge = knowledge;
    return meta;
  }

  private parseKnowledge(value: unknown): ChatKnowledgeMeta | undefined {
    if (!this.isObject(value)) return undefined;
    const knowledge: ChatKnowledgeMeta = {
      mode: typeof value['mode'] === 'string' ? value['mode'] : '',
    };
    if (typeof value['skipped'] === 'string') knowledge.skipped = value['skipped'];
    if (typeof value['chunks'] === 'number') knowledge.chunks = value['chunks'];
    if (Array.isArray(value['sources'])) knowledge.sources = value['sources'].filter((item): item is string => typeof item === 'string');
    if (typeof value['profile'] === 'string') knowledge.profile = value['profile'];
    if (typeof value['model'] === 'string') knowledge.model = value['model'];
    if (typeof value['k'] === 'number') knowledge.k = value['k'];
    if (typeof value['reranked'] === 'boolean') knowledge.reranked = value['reranked'];
    if (typeof value['pool'] === 'number') knowledge.pool = value['pool'];
    if (this.isObject(value['cache'])) knowledge.cache = value['cache'];
    if (typeof value['embed_ms'] === 'number') knowledge.embed_ms = value['embed_ms'];
    if (typeof value['search_ms'] === 'number') knowledge.search_ms = value['search_ms'];
    if (typeof value['rerank_ms'] === 'number') knowledge.rerank_ms = value['rerank_ms'];
    if (typeof value['rag_ms'] === 'number') knowledge.rag_ms = value['rag_ms'];
    return knowledge;
  }

  private isObject(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Chat stream request failed.';
  }
}
