import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import type { ConnectionState, Participant, RemoteTrack, Room, TranscriptionSegment } from 'livekit-client';
import { VoiceRoomError, VoiceTranscriptSegment } from './voice-session.model';
import { VoiceTokenService } from './voice-token.service';

type VoiceConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'signalReconnecting';

const VOICE_CONNECTION_STATE_MAP: Readonly<Record<string, VoiceConnectionState>> = {
  disconnected: 'disconnected',
  connecting: 'connecting',
  connected: 'connected',
  reconnecting: 'reconnecting',
  signalReconnecting: 'signalReconnecting',
};

export class VoiceRoomServiceError extends Error implements VoiceRoomError {
  readonly code: VoiceRoomError['code'];

  constructor(code: VoiceRoomError['code'], message: string) {
    super(message);
    this.name = 'VoiceRoomServiceError';
    this.code = code;
  }
}

@Injectable({ providedIn: 'root' })
export class LivekitRoomService {
  private readonly document = inject(DOCUMENT);
  private readonly tokenService = inject(VoiceTokenService);
  private readonly _connected = signal(false);
  private readonly _speaking = signal(false);
  private readonly _muted = signal(false);
  private readonly _error = signal<VoiceRoomError | null>(null);
  private readonly _connectionState = signal<VoiceConnectionState>('disconnected');
  private readonly _transcript = signal<VoiceTranscriptSegment | null>(null);
  private readonly _transcripts = signal<VoiceTranscriptSegment[]>([]);
  private readonly audioElements = new Map<RemoteTrack, HTMLAudioElement>();

  private room: Room | null = null;
  private connectPromise: Promise<void> | null = null;
  private unregisterHandlers: (() => void) | null = null;
  private generation = 0;

  readonly connected = this._connected.asReadonly();
  readonly speaking = this._speaking.asReadonly();
  readonly muted = this._muted.asReadonly();
  readonly error = this._error.asReadonly();
  readonly connectionState = this._connectionState.asReadonly();
  readonly transcript = this._transcript.asReadonly();
  readonly transcripts = this._transcripts.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (typeof window === 'undefined' || typeof document === 'undefined' || typeof navigator === 'undefined') return;
      void this.disconnect();
    });
  }

  connect(): Promise<void> {
    if (this._connected() && this.room) return Promise.resolve();
    if (this.connectPromise) return this.connectPromise;

    if (typeof window === 'undefined' || typeof document === 'undefined' || typeof navigator === 'undefined') {
      const error = new VoiceRoomServiceError('unsupported', 'Voice calling is only available in a browser.');
      this._error.set(error);
      return Promise.reject(error);
    }

    const generation = ++this.generation;
    const promise = this.connectInternal(generation);
    this.connectPromise = promise;
    void promise.then(
      () => this.clearConnectPromise(promise),
      () => this.clearConnectPromise(promise),
    );
    return promise;
  }

  setMuted(muted: boolean): Promise<void> {
    const room = this.room;
    if (!room || !this._connected()) {
      return Promise.reject(new VoiceRoomServiceError('connection-error', 'Voice microphone is not connected.'));
    }

    return room.localParticipant.setMicrophoneEnabled(!muted).then(() => {
      if (this.room === room) this._muted.set(muted);
    }).catch((error: unknown) => {
      const typed = this.toError(error, 'device-error');
      if (this.room === room) this._error.set(typed);
      throw typed;
    });
  }

  async disconnect(): Promise<void> {
    this.generation += 1;
    const room = this.room;
    this.room = null;
    this.connectPromise = null;
    this.unregisterHandlers?.();
    this.unregisterHandlers = null;
    this.removeAllAudioElements();
    this._connected.set(false);
    this._speaking.set(false);
    this._muted.set(false);
    this._connectionState.set('disconnected');
    this._error.set(null);

    if (!room) return;
    try {
      await room.localParticipant.setMicrophoneEnabled(false);
    } catch {
      // Room shutdown remains best-effort after a failed or interrupted join.
    }
    try {
      await room.disconnect();
    } catch {
      // The SDK may already have closed the room during an unexpected disconnect.
    }
  }

  private async connectInternal(generation: number): Promise<void> {
    let room: Room | null = null;
    try {
      const livekit = await import('livekit-client');
      if (!this.isCurrent(generation)) throw this.staleConnectionError();

      const credentials = await this.tokenService.getToken();
      if (!this.isCurrent(generation)) throw this.staleConnectionError();

      room = new livekit.Room({ adaptiveStream: true, dynacast: true });
      this.room = room;
      this.registerHandlers(livekit.RoomEvent, room);
      await room.connect(credentials.url, credentials.token);
      if (!this.isCurrent(generation) || this.room !== room) throw this.staleConnectionError();

      await room.localParticipant.setMicrophoneEnabled(true);
      if (!this.isCurrent(generation) || this.room !== room) throw this.staleConnectionError();

      this._muted.set(false);
      this._connected.set(true);
      this._connectionState.set('connected');
    } catch (error: unknown) {
      if (room) {
        if (this.room === room) {
          this.unregisterHandlers?.();
          this.unregisterHandlers = null;
          this.removeAllAudioElements();
          this.room = null;
          this._connected.set(false);
          this._speaking.set(false);
        }
        try {
          await room.disconnect();
        } catch {
          // Cleanup is complete even if the SDK rejects a late disconnect.
        }
      }

      if (error instanceof VoiceRoomServiceError && error.code === 'connection-error' && error.message === 'Voice connection was cancelled.') {
        throw error;
      }
      if (error instanceof VoiceRoomServiceError && error.message === 'Voice connection was cancelled.') throw error;

      const typed = this.toError(error, 'connection-error');
      if (this.isCurrent(generation)) this._error.set(typed);
      throw typed;
    }
  }

  private registerHandlers(roomEvents: typeof import('livekit-client').RoomEvent, room: Room): void {
    const onConnected = (): void => {
      if (this.room !== room) return;
      this._connected.set(true);
      this._connectionState.set('connected');
    };
    const onDisconnected = (): void => {
      if (this.room !== room) return;
      const unregister = this.unregisterHandlers;
      this.unregisterHandlers = null;
      unregister?.();
      this.removeAllAudioElements();
      this.room = null;
      this._connected.set(false);
      this._speaking.set(false);
      this._muted.set(false);
      this._connectionState.set('disconnected');
      this._error.set(new VoiceRoomServiceError('unexpected-disconnect', 'The voice connection ended unexpectedly.'));
    };
    const onConnectionStateChanged = (state: ConnectionState): void => {
      if (this.room !== room) return;
      this._connectionState.set(this.normalizeConnectionState(state));
      this._connected.set(state === 'connected');
    };
    const onTrackSubscribed = (track: RemoteTrack): void => {
      if (this.room !== room || track.kind !== 'audio' || this.audioElements.has(track)) return;
      const audio = this.document.createElement('audio');
      audio.hidden = true;
      audio.autoplay = true;
      audio.setAttribute('playsinline', '');
      audio.setAttribute('aria-hidden', 'true');
      this.document.body.appendChild(audio);
      track.attach(audio);
      this.audioElements.set(track, audio);
    };
    const onTrackUnsubscribed = (track: RemoteTrack): void => {
      if (this.room !== room) return;
      this.removeAudioElement(track);
    };
    const onMediaDevicesError = (error: Error): void => {
      if (this.room !== room) return;
      this._error.set(this.toError(error, 'device-error'));
    };
    const onActiveSpeakersChanged = (speakers: Participant[]): void => {
      if (this.room !== room) return;
      this._speaking.set(speakers.some((speaker) => !speaker.isLocal));
    };
    const onTranscriptionReceived = (segments: TranscriptionSegment[], participant?: Participant): void => {
      if (this.room !== room) return;
      for (const segment of segments) {
        this.emitTranscript(room, segment, participant);
      }
    };
    const onTextStream: Parameters<Room['registerTextStreamHandler']>[1] = (reader, participantInfo) => {
      void reader.readAll().then((payload) => {
        if (this.room !== room) return;
        const attributes = reader.info.attributes?.['lk.transcription_final'];
        this.handleTextStream(room, reader.info.id, payload, participantInfo.identity, attributes);
      }).catch(() => {
        // A stream can reject while the room is disconnecting; cleanup remains best-effort.
      });
    };

    this.unregisterHandlers = () => {
      room.off(roomEvents.Connected, onConnected);
      room.off(roomEvents.Disconnected, onDisconnected);
      room.off(roomEvents.ConnectionStateChanged, onConnectionStateChanged);
      room.off(roomEvents.TrackSubscribed, onTrackSubscribed);
      room.off(roomEvents.TrackUnsubscribed, onTrackUnsubscribed);
      room.off(roomEvents.MediaDevicesError, onMediaDevicesError);
      room.off(roomEvents.ActiveSpeakersChanged, onActiveSpeakersChanged);
      room.off(roomEvents.TranscriptionReceived, onTranscriptionReceived);
      room.unregisterTextStreamHandler('lk.transcription');
    };

    room.on(roomEvents.Connected, onConnected);
    room.on(roomEvents.Disconnected, onDisconnected);
    room.on(roomEvents.ConnectionStateChanged, onConnectionStateChanged);
    room.on(roomEvents.TrackSubscribed, onTrackSubscribed);
    room.on(roomEvents.TrackUnsubscribed, onTrackUnsubscribed);
    room.on(roomEvents.MediaDevicesError, onMediaDevicesError);
    room.on(roomEvents.ActiveSpeakersChanged, onActiveSpeakersChanged);
    room.on(roomEvents.TranscriptionReceived, onTranscriptionReceived);
    room.registerTextStreamHandler('lk.transcription', onTextStream);
  }

  private removeAudioElement(track: RemoteTrack): void {
    const audio = this.audioElements.get(track);
    if (!audio) return;
    try {
      track.detach(audio);
    } catch {
      // The SDK can detach automatically during room shutdown.
    }
    audio.remove();
    this.audioElements.delete(track);
  }

  private removeAllAudioElements(): void {
    for (const track of this.audioElements.keys()) this.removeAudioElement(track);
    this.audioElements.clear();
  }

  private clearConnectPromise(promise: Promise<void>): void {
    if (this.connectPromise === promise) this.connectPromise = null;
  }

  private isCurrent(generation: number): boolean {
    return generation === this.generation;
  }

  private emitTranscript(room: Room, segment: TranscriptionSegment, participant?: Participant): void {
    this.publishTranscript({
      id: segment.id,
      text: segment.text,
      final: segment.final,
      speaker: this.speakerFor(room, participant),
    });
  }

  private publishTranscript(normalized: VoiceTranscriptSegment): void {
    this._transcript.set(normalized);
    this._transcripts.update((transcripts) => [...transcripts, normalized]);
  }

  private handleTextStream(room: Room, streamId: string, payload: string, participantIdentity: string, finalAttribute?: string): void {
    const defaultFinal = this.booleanValue(finalAttribute, true);
    let parsed: unknown = payload;
    try {
      parsed = JSON.parse(payload) as unknown;
    } catch {
      // A text stream may carry plain transcript text instead of JSON.
    }

    if (Array.isArray(parsed)) {
      for (const value of parsed) this.emitTextStreamRecord(room, streamId, value, participantIdentity, defaultFinal);
      return;
    }
    if (this.isRecord(parsed) && Array.isArray(parsed['segments'])) {
      for (const value of parsed['segments']) this.emitTextStreamRecord(room, streamId, value, participantIdentity, defaultFinal);
      return;
    }
    if (this.emitTextStreamRecord(room, streamId, parsed, participantIdentity, defaultFinal)) return;

    const text = typeof parsed === 'string' ? parsed : payload;
    if (!streamId || !text.trim()) return;
    this.publishTranscript({ id: streamId, text, final: defaultFinal, speaker: this.speakerFor(room, undefined, participantIdentity) });
  }

  private emitTextStreamRecord(room: Room, streamId: string, value: unknown, participantIdentity: string, defaultFinal: boolean): boolean {
    if (!this.isRecord(value)) return false;
    const textValue = value['text'] ?? value['transcript'];
    if (typeof textValue !== 'string') return false;
    const idValue = value['id'] ?? value['segmentId'];
    const id = typeof idValue === 'string' && idValue ? idValue : streamId;
    if (!id) return false;
    this.publishTranscript({
      id,
      text: textValue,
      final: this.booleanValue(value['final'], defaultFinal),
      speaker: this.speakerFor(room, undefined, participantIdentity),
    });
    return true;
  }

  private speakerFor(room: Room, participant?: Participant, participantIdentity?: string): 'user' | 'agent' {
    const identity = participant?.identity ?? participantIdentity;
    if (!identity) {
      // LiveKit commonly omits the participant for agent transcripts; assume agent in that case.
      return 'agent';
    }
    return identity === room.localParticipant.identity ? 'user' : 'agent';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private booleanValue(value: unknown, fallback: boolean): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true' ? true : value.toLowerCase() === 'false' ? false : fallback;
    return fallback;
  }


  private staleConnectionError(): VoiceRoomServiceError {
    return new VoiceRoomServiceError('connection-error', 'Voice connection was cancelled.');
  }

  private normalizeConnectionState(state: ConnectionState): VoiceConnectionState {
    return VOICE_CONNECTION_STATE_MAP[String(state)] ?? 'disconnected';
  }


  private toError(error: unknown, fallbackCode: VoiceRoomError['code']): VoiceRoomServiceError {
    if (error instanceof VoiceRoomServiceError) return error;
    const message = error instanceof Error && error.message.trim()
      ? error.message
      : fallbackCode === 'device-error' ? 'Microphone access is unavailable.' : 'Voice connection failed.';
    return new VoiceRoomServiceError(fallbackCode, message);
  }
}
