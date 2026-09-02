import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { VoiceToken, VoiceTokenError } from '../models/chat-api.model';

type JsonObject = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class VoiceTokenService {
  async getToken(): Promise<VoiceToken> {
    const query = new URLSearchParams({
      mode: environment.voice.mode,
      barge_in: environment.voice.bargeIn,
      rag: String(environment.voice.rag),
      top_k: String(environment.voice.topK),
      endpointing: String(environment.voice.endpointing),
    });

    let response: Response;
    try {
      response = await fetch(`${environment.apiBaseUrl}/token?${query.toString()}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
    } catch (error: unknown) {
      throw new VoiceTokenError(this.errorMessage(error));
    }

    if (!response.ok) {
      const responseBody = await response.text();
      throw new VoiceTokenError(
        `Voice token request failed (${response.status})${responseBody ? `: ${responseBody}` : ''}`,
        { status: response.status, responseBody },
      );
    }

    let payload: unknown;
    try {
      payload = await response.json() as unknown;
    } catch {
      throw new VoiceTokenError('Voice token response was not valid JSON.');
    }

    const token = this.findString(payload, ['token', 'access_token']);
    const url = this.findString(payload, ['url', 'serverUrl', 'server_url', 'ws_url', 'wsUrl']);
    if (!token || !url) {
      throw new VoiceTokenError('Voice token response did not include token and url.');
    }

    return {
      token,
      url,
      room: this.findString(payload, ['room', 'room_name']),
      identity: this.findString(payload, ['identity']),
    };
  }

  private findString(value: unknown, keys: readonly string[]): string | undefined {
    for (const candidate of this.candidateObjects(value)) {
      for (const key of keys) {
        const item = candidate[key];
        if (typeof item === 'string' && item.trim()) return item.trim();
      }
    }
    return undefined;
  }

  private candidateObjects(value: unknown): JsonObject[] {
    const candidates: JsonObject[] = [];
    const pending: Array<{ value: unknown; depth: number }> = [{ value, depth: 0 }];
    const visited = new Set<JsonObject>();

    while (pending.length > 0) {
      const current = pending.shift();
      if (!current || !this.isObject(current.value) || visited.has(current.value) || current.depth > 4) continue;

      visited.add(current.value);
      candidates.push(current.value);
      for (const key of ['data', 'result', 'credentials', 'livekit'] as const) {
        const nested = current.value[key];
        if (this.isObject(nested)) pending.push({ value: nested, depth: current.depth + 1 });
      }
    }

    return candidates;
  }

  private isObject(value: unknown): value is JsonObject {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value) as object | null;
    return prototype === Object.prototype || prototype === null;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Voice token request failed.';
  }
}
