// @vitest-environment jsdom
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LivekitRoomService, VoiceRoomServiceError } from './livekit-room.service';
import { ChatStoreService } from './chat-store.service';
import { VoiceSessionService } from './voice-session.service';
import { VoiceTranscriptSegment } from './voice-session.model';

describe('VoiceSessionService', () => {
  let service: VoiceSessionService;
  let connected: ReturnType<typeof signal<boolean>>;
  let speaking: ReturnType<typeof signal<boolean>>;
  let roomError: ReturnType<typeof signal<VoiceRoomServiceError | null>>;
  let transcript: ReturnType<typeof signal<VoiceTranscriptSegment | null>>;
  let chatStore: { upsertVoiceTranscript: ReturnType<typeof vi.fn> };
  let room: {
    connected: ReturnType<typeof signal<boolean>>;
    speaking: ReturnType<typeof signal<boolean>>;
    error: ReturnType<typeof signal<VoiceRoomServiceError | null>>;
    transcript: ReturnType<typeof signal<VoiceTranscriptSegment | null>>;
    connect: ReturnType<typeof vi.fn>;
    setMuted: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    connected = signal(false);
    speaking = signal(false);
    roomError = signal<VoiceRoomServiceError | null>(null);
    transcript = signal<VoiceTranscriptSegment | null>(null);
    chatStore = { upsertVoiceTranscript: vi.fn() };
    room = {
      connected,
      speaking,
      error: roomError,
      transcript,
      connect: vi.fn().mockImplementation(async () => { connected.set(true); }),
      setMuted: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockImplementation(async () => {
        connected.set(false);
        speaking.set(false);
        roomError.set(null);
      }),
    };
    TestBed.configureTestingModule({
      providers: [VoiceSessionService, { provide: LivekitRoomService, useValue: room }, { provide: ChatStoreService, useValue: chatStore }],
    });
    service = TestBed.inject(VoiceSessionService);
  });

  afterEach(() => {
    service.end();
    TestBed.resetTestingModule();
  });

  it('starts in thinking, then listens after token and room connection', async () => {
    service.start();
    expect(service.phase()).toBe('thinking');
    expect(service.transcript()).toBe('Connecting…');

    await Promise.resolve();
    expect(service.phase()).toBe('listening');
    expect(service.transcript()).toBe('Listening…');
    expect(service.statusLabel()).toBe('Listening…');
  });

  it('maps remote speaking changes without fabricating transcript text', async () => {
    service.start();
    await Promise.resolve();
    speaking.set(true);
    await Promise.resolve();
    TestBed.tick();

    expect(service.phase()).toBe('speaking');
    expect(service.transcript()).toBe('Rumi is speaking…');
    speaking.set(false);
    await Promise.resolve();
    TestBed.tick();
    expect(service.phase()).toBe('listening');
    expect(service.transcript()).toBe('Listening…');
  });

  it('toggles mute in listening and speaking phases', async () => {
    service.start();
    await Promise.resolve();
    service.toggleMuted();
    expect(service.isMuted()).toBe(true);
    expect(room.setMuted).toHaveBeenCalledWith(true);

    speaking.set(true);
    await Promise.resolve();
    service.toggleMuted();
    expect(service.isMuted()).toBe(false);
    expect(room.setMuted).toHaveBeenCalledWith(false);
  });

  it('maps token and connection failures to error without a fake reply', async () => {
    room.connect.mockRejectedValueOnce(new VoiceRoomServiceError('connection-error', 'Token failed'));
    service.start();
    await Promise.resolve();
    await Promise.resolve();

    expect(service.phase()).toBe('error');
    expect(service.error()).toEqual({ code: 'connection-error', message: 'Token failed' });
    expect(service.transcript()).toBe('');
  });

  it('maps a device error signal to the error phase', async () => {
    service.start();
    await Promise.resolve();
    roomError.set(new VoiceRoomServiceError('device-error', 'Microphone denied'));
    await Promise.resolve();
    TestBed.tick();

    expect(service.phase()).toBe('error');
    expect(service.error()).toEqual({ code: 'device-error', message: 'Microphone denied' });
  });

  it('retries only from error', async () => {
    room.connect.mockRejectedValueOnce(new VoiceRoomServiceError('connection-error', 'Offline'));
    service.retry();
    expect(room.connect).not.toHaveBeenCalled();

    service.start();
    await Promise.resolve();
    await Promise.resolve();
    expect(service.phase()).toBe('error');

    service.retry();
    await Promise.resolve();
    await Promise.resolve();
    expect(service.phase()).toBe('listening');
  });

  it('forwards transcripts to chat and promotes a non-final segment when ending', async () => {
    service.start();
    await Promise.resolve();
    transcript.set({ id: 'voice-segment', text: 'Still speaking', final: false, speaker: 'agent' });
    await Promise.resolve();
    TestBed.tick();
    await Promise.resolve();

    expect(chatStore.upsertVoiceTranscript).toHaveBeenCalledWith({
      id: 'voice-segment', text: 'Still speaking', final: false, speaker: 'agent',
    });
    service.end();

    expect(chatStore.upsertVoiceTranscript).toHaveBeenLastCalledWith({
      id: 'voice-segment', text: 'Still speaking', final: true, speaker: 'agent',
    });
    expect(service.phase()).toBe('idle');
  });
  it('ends and ignores a late connection resolution', async () => {
    let resolveConnect: (() => void) | undefined;
    room.connect.mockImplementationOnce(() => new Promise<void>((resolve) => { resolveConnect = resolve; }));
    service.start();
    service.end();
    resolveConnect?.();
    await Promise.resolve();

    expect(service.phase()).toBe('idle');
    expect(service.isActive()).toBe(false);
    expect(service.transcript()).toBe('');
  });
});
