import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import type { ConnectionState, Participant, RemoteTrack, Room } from 'livekit-client';
import { VoiceRoomError } from './voice-session.model';
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

    room.on(roomEvents.Connected, onConnected);
    room.on(roomEvents.Disconnected, onDisconnected);
    room.on(roomEvents.ConnectionStateChanged, onConnectionStateChanged);
    room.on(roomEvents.TrackSubscribed, onTrackSubscribed);
    room.on(roomEvents.TrackUnsubscribed, onTrackUnsubscribed);
    room.on(roomEvents.MediaDevicesError, onMediaDevicesError);
    room.on(roomEvents.ActiveSpeakersChanged, onActiveSpeakersChanged);
    this.unregisterHandlers = () => {
      room.off(roomEvents.Connected, onConnected);
      room.off(roomEvents.Disconnected, onDisconnected);
      room.off(roomEvents.ConnectionStateChanged, onConnectionStateChanged);
      room.off(roomEvents.TrackSubscribed, onTrackSubscribed);
      room.off(roomEvents.TrackUnsubscribed, onTrackUnsubscribed);
      room.off(roomEvents.MediaDevicesError, onMediaDevicesError);
      room.off(roomEvents.ActiveSpeakersChanged, onActiveSpeakersChanged);
    };
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
