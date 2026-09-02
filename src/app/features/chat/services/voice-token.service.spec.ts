import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceTokenError } from '../models/chat-api.model';
import { VoiceTokenService } from './voice-token.service';

describe('VoiceTokenService', () => {
  let service: VoiceTokenService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [VoiceTokenService] });
    service = TestBed.inject(VoiceTokenService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('forwards the exact voice query and maps root serverUrl fields', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      token: ' lk-token ',
      serverUrl: ' wss://livekit.example ',
      room_name: ' calmi-room ',
      identity: ' web-user ',
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(service.getToken()).resolves.toEqual({
      token: 'lk-token',
      url: 'wss://livekit.example',
      room: 'calmi-room',
      identity: 'web-user',
    });

    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain('/token?mode=stream&barge_in=balanced&rag=true&top_k=3&endpointing=0.4');
    expect(fetchMock).toHaveBeenCalledWith(calledUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
  });

  it('maps a root ws_url response', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      token: 'ws-token',
      ws_url: 'wss://nested.example',
    }), { status: 200 })));

    await expect(service.getToken()).resolves.toEqual({
      token: 'ws-token',
      url: 'wss://nested.example',
      room: undefined,
      identity: undefined,
    });
  });

  it('recursively maps result credentials access_token and server_url', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      result: { credentials: { access_token: 'nested-token', server_url: 'wss://nested.example', room: 'nested-room' } },
    }), { status: 200 })));

    await expect(service.getToken()).resolves.toEqual({
      token: 'nested-token',
      url: 'wss://nested.example',
      room: 'nested-room',
      identity: undefined,
    });
  });

  it('throws a typed error for bad JSON', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('{bad-json', { status: 200 })));

    await expect(service.getToken()).rejects.toMatchObject({
      name: 'VoiceTokenError',
      message: 'Voice token response was not valid JSON.',
    });
  });

  it('throws a typed error when token or url is missing', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ token: 'only-token' }), { status: 200 })));

    const result = service.getToken();
    await expect(result).rejects.toBeInstanceOf(VoiceTokenError);
    await expect(result).rejects.toThrow('Voice token response did not include token and url.');
  });

  it('throws a typed error for a non-OK response with status and body', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('unauthorized', { status: 401 })));

    await expect(service.getToken()).rejects.toMatchObject({
      name: 'VoiceTokenError',
      status: 401,
      responseBody: 'unauthorized',
    });
  });

  it('throws a typed error for a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')));

    await expect(service.getToken()).rejects.toMatchObject({
      name: 'VoiceTokenError',
      message: 'offline',
    });
  });
});
