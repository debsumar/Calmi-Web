// @vitest-environment jsdom
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Room } from 'livekit-client';
import { LivekitRoomService, VoiceRoomServiceError } from './livekit-room.service';
import { VoiceTokenService } from './voice-token.service';

vi.mock('livekit-client', () => ({
  Room: vi.fn(),
  RoomEvent: {
    Connected: 'connected',
    Disconnected: 'disconnected',
    ConnectionStateChanged: 'connectionStateChanged',
    TrackSubscribed: 'trackSubscribed',
    TrackUnsubscribed: 'trackUnsubscribed',
    MediaDevicesError: 'mediaDevicesError',
    ActiveSpeakersChanged: 'activeSpeakersChanged',
    TranscriptionReceived: 'transcriptionReceived',
  },
}));

type Listener = (...args: unknown[]) => void;

class FakeRoom {
  readonly listeners = new Map<string, Listener>();
  readonly textStreamHandlers = new Map<string, unknown>();
  readonly localParticipant = {
    identity: 'local-user',
    setMicrophoneEnabled: vi.fn().mockResolvedValue(undefined),
  };
  readonly connect = vi.fn().mockResolvedValue(undefined);
  readonly disconnect = vi.fn().mockResolvedValue(undefined);
  state = 'disconnected';

  on(event: string, listener: Listener): this {
    this.listeners.set(event, listener);
    return this;
  }

  off(event: string, listener: Listener): this {
    if (this.listeners.get(event) === listener) this.listeners.delete(event);
    return this;
  }

  registerTextStreamHandler(topic: string, handler: unknown): void {
    this.textStreamHandlers.set(topic, handler);
  }

  unregisterTextStreamHandler(topic: string): void {
    this.textStreamHandlers.delete(topic);
  }

  emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.(...args);
  }
}

const token = { token: 'token-for-test', url: 'wss://livekit.test' };

describe('LivekitRoomService', () => {
  let service: LivekitRoomService;
  let room: FakeRoom;
  let tokenService: { getToken: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    room = new FakeRoom();
    vi.mocked(Room).mockImplementation(function () { return room as unknown as Room; });
    tokenService = { getToken: vi.fn().mockResolvedValue(token) };
    TestBed.configureTestingModule({
      providers: [LivekitRoomService, { provide: VoiceTokenService, useValue: tokenService }],
    });
    service = TestBed.inject(LivekitRoomService);
  });

  afterEach(() => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('forwards the token and exact Room options, then enables the microphone', async () => {
    await service.connect();

    expect(tokenService.getToken).toHaveBeenCalledOnce();
    expect(Room).toHaveBeenCalledWith({ adaptiveStream: true, dynacast: true });
    expect(room.connect).toHaveBeenCalledWith(token.url, token.token);
    expect(room.localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true);
    expect(service.connected()).toBe(true);
  });

  it('shares one in-flight promise for duplicate connects', async () => {
    let resolveToken: ((value: typeof token) => void) | undefined;
    tokenService.getToken.mockReturnValue(new Promise<typeof token>((resolve) => { resolveToken = resolve; }));

    const first = service.connect();
    const second = service.connect();
    expect(first).toBe(second);

    resolveToken?.(token);
    await first;
    expect(Room).toHaveBeenCalledOnce();
  });

  it('attaches remote audio to an owned hidden element and removes that exact element', async () => {
    await service.connect();
    const track = {
      kind: 'audio',
      attach: vi.fn((element: HTMLMediaElement) => element),
      detach: vi.fn((element: HTMLMediaElement) => element),
    };

    room.emit('trackSubscribed', track);
    const audio = document.body.querySelector('audio');
    expect(audio).not.toBeNull();
    expect(audio?.hidden).toBe(true);
    expect(audio?.autoplay).toBe(true);
    expect(audio?.getAttribute('playsinline')).toBe('');
    expect(audio?.getAttribute('aria-hidden')).toBe('true');
    expect(track.attach).toHaveBeenCalledWith(audio);

    room.emit('trackUnsubscribed', track);
    expect(track.detach).toHaveBeenCalledWith(audio);
    expect(audio?.isConnected).toBe(false);
  });

  it('derives speaking only from remote active speakers', async () => {
    await service.connect();
    room.emit('trackSubscribed', { kind: 'audio', attach: vi.fn(), detach: vi.fn() });
    expect(service.speaking()).toBe(false);

    room.emit('activeSpeakersChanged', [{ isLocal: true }]);
    expect(service.speaking()).toBe(false);
    room.emit('activeSpeakersChanged', [{ isLocal: false }]);
    expect(service.speaking()).toBe(true);
    room.emit('activeSpeakersChanged', []);
    expect(service.speaking()).toBe(false);
  });

  it('publishes normalized user, remote, and undefined-participant transcripts', async () => {
    await service.connect();
    const segment = { id: 'segment-1', text: 'Hello', final: false };

    room.emit('transcriptionReceived', [segment], room.localParticipant);
    expect(service.transcript()).toEqual({ id: 'segment-1', text: 'Hello', final: false, speaker: 'user' });

    room.emit('transcriptionReceived', [{ ...segment, text: 'Hi there', final: true }], { identity: 'remote-agent' });
    expect(service.transcript()).toEqual({ id: 'segment-1', text: 'Hi there', final: true, speaker: 'agent' });

    room.emit('transcriptionReceived', [{ ...segment, text: 'Agent reply' }]);
    expect(service.transcript()?.speaker).toBe('agent');
  });

  it('normalizes the lk.transcription text stream and unregisters it on disconnect', async () => {
    await service.connect();
    const handler = room.textStreamHandlers.get('lk.transcription') as ((reader: unknown, participant: unknown) => void) | undefined;
    const readAll = vi.fn().mockResolvedValue(JSON.stringify({ id: 'stream-segment', text: 'Streamed text', final: true }));
    handler?.({ readAll, info: { id: 'stream-id', attributes: {} } }, { identity: 'remote-agent' });
    await Promise.resolve();

    expect(service.transcript()).toEqual({ id: 'stream-segment', text: 'Streamed text', final: true, speaker: 'agent' });
    await service.disconnect();
    expect(room.textStreamHandlers.size).toBe(0);
  });
  it('mutes and unmutes the local microphone', async () => {
    await service.connect();
    await service.setMuted(true);
    await service.setMuted(false);

    expect(room.localParticipant.setMicrophoneEnabled).toHaveBeenNthCalledWith(2, false);
    expect(room.localParticipant.setMicrophoneEnabled).toHaveBeenNthCalledWith(3, true);
    expect(service.muted()).toBe(false);
  });

  it('publishes a typed media-device error', async () => {
    await service.connect();
    room.emit('mediaDevicesError', new Error('permission denied'));

    expect(service.error()).toEqual(new VoiceRoomServiceError('device-error', 'permission denied'));
  });

  it('reports an unexpected disconnect', async () => {
    await service.connect();
    room.emit('disconnected');

    expect(service.connected()).toBe(false);
    expect(service.error()).toEqual(new VoiceRoomServiceError('unexpected-disconnect', 'The voice connection ended unexpectedly.'));
  });

  it('cannot revive a room after a late token resolution following disconnect', async () => {
    let resolveToken: ((value: typeof token) => void) | undefined;
    tokenService.getToken.mockReturnValue(new Promise<typeof token>((resolve) => { resolveToken = resolve; }));
    const connection = service.connect();
    await service.disconnect();
    resolveToken?.(token);

    await expect(connection).rejects.toThrow('Voice connection was cancelled.');
    expect(Room).not.toHaveBeenCalled();
    expect(service.connected()).toBe(false);
  });

  it('cleans handlers, audio, microphone, room, and signals on disconnect', async () => {
    await service.connect();
    const track = { kind: 'audio', attach: vi.fn(), detach: vi.fn() };
    room.emit('trackSubscribed', track);
    await service.disconnect();

    expect(track.detach).toHaveBeenCalledOnce();
    expect(room.listeners.size).toBe(0);
    expect(room.localParticipant.setMicrophoneEnabled).toHaveBeenLastCalledWith(false);
    expect(room.disconnect).toHaveBeenCalledOnce();
    expect(document.body.querySelector('audio')).toBeNull();
    expect(service.connected()).toBe(false);
    expect(service.speaking()).toBe(false);
    expect(service.muted()).toBe(false);
    expect(service.error()).toBeNull();
  });
});
