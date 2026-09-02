import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { LivekitRoomService, VoiceRoomServiceError } from './livekit-room.service';
import {
  ChatConversationSurface,
  VoiceSessionError,
  VoiceSessionPhase,
  VoiceSessionRecognitionErrorCode,
} from './voice-session.model';

@Injectable({ providedIn: 'root' })
export class VoiceSessionService {
  private readonly room = inject(LivekitRoomService);
  private readonly opener = { current: null as HTMLElement | null };
  private readonly _surface = signal<ChatConversationSurface | null>(null);
  private readonly _phase = signal<VoiceSessionPhase>('idle');
  private readonly _isMuted = signal(false);
  private readonly _error = signal<VoiceSessionError | null>(null);
  private readonly _connectGeneration = signal(0);

  readonly phase = this._phase.asReadonly();
  readonly surface = this._surface.asReadonly();
  readonly isMuted = this._isMuted.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isActive = computed(() => this.phase() !== 'idle');
  readonly isOverlayOpen = this.isActive;
  readonly transcript = computed(() => {
    switch (this.phase()) {
      case 'thinking': return 'Connecting…';
      case 'listening': return 'Listening…';
      case 'speaking': return 'Rumi is speaking…';
      default: return '';
    }
  });
  readonly statusLabel = computed(() => {
    if (this.phase() === 'error') return 'Microphone unavailable';
    if (this.phase() === 'listening' && this.isMuted()) return 'Microphone muted';
    return this.transcript();
  });

  constructor() {
    effect(() => {
      const roomError = this.room.error();
      if (!this.isActive() || !roomError) return;
      this.handleRoomError(roomError.code, roomError.message);
    });
    effect(() => {
      const connected = this.room.connected();
      const speaking = this.room.speaking();
      if (!this.isActive() || !connected || this._error()) return;
      this._phase.set(speaking ? 'speaking' : 'listening');
    });
  }

  /** Starts a session owned by one mounted chat surface. */
  start(surfaceOrTrigger?: ChatConversationSurface | HTMLElement, trigger?: HTMLElement): void {
    if (this.isActive()) return;

    const surface = typeof surfaceOrTrigger === 'string' ? surfaceOrTrigger : 'floating-panel';
    this._surface.set(surface);
    this.opener.current = typeof surfaceOrTrigger === 'string' ? trigger ?? null : surfaceOrTrigger ?? null;
    this._isMuted.set(false);
    this._error.set(null);
    this._phase.set('thinking');
    const generation = this._connectGeneration() + 1;
    this._connectGeneration.set(generation);
    void this.connectSession(generation);
  }

  retry(): void {
    if (this.phase() !== 'error') return;
    this._error.set(null);
    this._isMuted.set(false);
    this._phase.set('thinking');
    const generation = this._connectGeneration() + 1;
    this._connectGeneration.set(generation);
    void this.retrySession(generation);
  }

  toggleMuted(): void {
    if (!this.isActive() || this.phase() === 'thinking' || this.phase() === 'error' || !this.room.connected()) return;

    const muted = !this.isMuted();
    this._isMuted.set(muted);
    void this.room.setMuted(muted).catch((error: unknown) => {
      if (!this.isActive()) return;
      const message = error instanceof Error && error.message.trim() ? error.message : 'Microphone access is unavailable.';
      this._isMuted.set(!muted);
      this.handleRoomError('device-error', message);
    });
  }

  end(): void {
    this.endInternal(true);
  }

  /** Ends a session only when this host owns it. No focus restoration during host destruction. */
  endForSurface(surface: ChatConversationSurface): void {
    if (!this.isActive() || this.surface() !== surface) return;
    this.endInternal(false);
  }

  restoreFocus(): void {
    const opener = this.opener.current;
    this.opener.current = null;
    opener?.focus({ preventScroll: true });
  }

  private async connectSession(generation: number): Promise<void> {
    try {
      await this.room.connect();
      if (!this.isCurrent(generation) || !this.isActive()) return;
      if (this.room.error()) return;
      this._phase.set(this.room.speaking() ? 'speaking' : 'listening');
    } catch (error: unknown) {
      if (!this.isCurrent(generation) || !this.isActive()) return;
      this.handleConnectionError(error);
    }
  }

  private async retrySession(generation: number): Promise<void> {
    try {
      await this.room.disconnect();
      if (!this.isCurrent(generation) || !this.isActive()) return;
      await this.room.connect();
      if (!this.isCurrent(generation) || !this.isActive()) return;
      if (this.room.error()) return;
      this._phase.set(this.room.speaking() ? 'speaking' : 'listening');
    } catch (error: unknown) {
      if (!this.isCurrent(generation) || !this.isActive()) return;
      this.handleConnectionError(error);
    }
  }

  private endInternal(announce: boolean): void {
    if (!this.isActive()) return;

    this._connectGeneration.update((generation) => generation + 1);
    void this.room.disconnect();
    this._phase.set('idle');
    this._surface.set(null);
    this._isMuted.set(false);
    this._error.set(null);
    if (!announce) this.opener.current = null;
  }

  private handleRoomError(code: string, message: string): void {
    if (!this.isActive()) return;
    this._phase.set('error');
    this._isMuted.set(false);
    this._error.set({ code: this.normalizeErrorCode(code), message });
  }

  private handleConnectionError(error: unknown): void {
    if (error instanceof VoiceRoomServiceError) {
      this.handleRoomError(error.code, error.message);
      return;
    }
    const message = error instanceof Error && error.message.trim() ? error.message : 'Voice connection failed. Try again.';
    this.handleRoomError('connection-error', message);
  }

  private normalizeErrorCode(code: string): VoiceSessionRecognitionErrorCode {
    return code as VoiceSessionRecognitionErrorCode;
  }

  private isCurrent(generation: number): boolean {
    return generation === this._connectGeneration();
  }
}
