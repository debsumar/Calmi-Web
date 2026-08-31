import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { VoiceSessionAdapter } from './voice-session.adapter';
import {
  ChatConversationSurface,
  VoiceSessionError,
  VoiceSessionPhase,
  VoiceSessionRecognitionErrorCode,
} from './voice-session.model';

const FALLBACK_LISTENING_MS = 2400;
const THINKING_MS = 1000;
const SPEAKING_MS = 2400;
const DEMO_PROMPT = 'Voice input is not supported here. This demo will continue automatically.';
const FALLBACK_REPLY = 'I am here with you. Let us take this one gentle moment at a time.';

const RECOGNITION_ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone access was blocked. Allow microphone access, then try again.',
  'service-not-allowed': 'Microphone access is unavailable in this browser. Check browser settings, then try again.',
  'audio-capture': 'No microphone could be found. Connect a microphone, then try again.',
  'start-failure': 'The microphone could not start. Check your microphone, then try again.',
  network: 'Voice input could not connect. Check your connection, then try again.',
};

@Injectable({ providedIn: 'root' })
export class VoiceSessionService {
  private readonly adapter = inject(VoiceSessionAdapter);
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private readonly opener = { current: null as HTMLElement | null };
  private readonly _surface = signal<ChatConversationSurface | null>(null);

  private readonly _phase = signal<VoiceSessionPhase>('idle');
  private readonly _isMuted = signal(false);
  private readonly _isDemoFallback = signal(false);
  private readonly _error = signal<VoiceSessionError | null>(null);
  private readonly _userTranscript = signal('');
  private readonly _assistantTranscript = signal('');
  private readonly _liveAnnouncement = signal('');

  readonly phase = this._phase.asReadonly();
  readonly surface = this._surface.asReadonly();
  readonly isMuted = this._isMuted.asReadonly();
  readonly isDemoFallback = this._isDemoFallback.asReadonly();
  readonly error = this._error.asReadonly();
  readonly userTranscript = this._userTranscript.asReadonly();
  readonly assistantTranscript = this._assistantTranscript.asReadonly();
  readonly liveAnnouncement = this._liveAnnouncement.asReadonly();
  readonly isActive = computed(() => this.phase() !== 'idle');
  readonly isOverlayOpen = this.isActive;
  readonly visibleTranscript = computed(() =>
    this.phase() === 'speaking' ? this.assistantTranscript() : this.userTranscript(),
  );
  readonly transcript = computed(() => {
    const visible = this.visibleTranscript();
    if (visible) return visible;
    if (this.phase() === 'listening') return this.isDemoFallback() ? DEMO_PROMPT : 'Tell me what is on your mind.';
    if (this.phase() === 'thinking') return 'Let me reflect on that…';
    return '';
  });
  readonly statusLabel = computed(() => {
    switch (this.phase()) {
      // Explicit mute wins over the demo-mode notice: capture really is stopped.
      case 'listening': return this.isMuted() ? 'Microphone muted' : (this.isDemoFallback() ? 'Demo mode' : 'Listening…');
      case 'thinking': return 'Thinking…';
      case 'speaking': return 'Speaking…';
      case 'error': return 'Microphone unavailable';
      default: return '';
    }
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.clearTimers();
      this.adapter.stop();
    });
  }

  /** Starts a session owned by one mounted chat surface.
   * The HTMLElement-only form remains supported for existing callers/tests. */
  start(surfaceOrTrigger?: ChatConversationSurface | HTMLElement, trigger?: HTMLElement): void {
    if (this.isActive()) return;

    const surface = typeof surfaceOrTrigger === 'string' ? surfaceOrTrigger : 'floating-panel';
    this._surface.set(surface);
    this.opener.current = typeof surfaceOrTrigger === 'string' ? trigger ?? null : surfaceOrTrigger ?? null;
    this._isMuted.set(false);
    this._isDemoFallback.set(!this.adapter.supported);
    this._error.set(null);
    this._userTranscript.set('');
    this._assistantTranscript.set('');
    this._liveAnnouncement.set(this.isDemoFallback() ? 'Voice demo mode' : 'Listening');
    this.beginListening();
  }

  retry(): void {
    if (this.phase() !== 'error') return;
    this._error.set(null);
    this._isMuted.set(false);
    this.beginListening();
  }

  toggleMuted(): void {
    if (!this.isActive() || this.phase() !== 'listening') return;

    const muted = !this.isMuted();
    this._isMuted.set(muted);
    this._liveAnnouncement.set(muted ? 'Microphone muted' : 'Microphone unmuted');

    if (muted) {
      this.clearTimers();
      this.adapter.stop();
      return;
    }

    // Unmuting starts a fresh recognition turn. The previous recognizer was
    // stopped and detached when mute was enabled.
    this.beginListening();
  }

  end(): void {
    this.endInternal(true);
  }

  /** Ends a session only when this host owns it. No focus restoration: the host
   * is being destroyed during a route/panel transition. */
  endForSurface(surface: ChatConversationSurface): void {
    if (!this.isActive() || this.surface() !== surface) return;
    this.endInternal(false);
  }

  restoreFocus(): void {
    const opener = this.opener.current;
    this.opener.current = null;
    opener?.focus({ preventScroll: true });
  }

  private endInternal(announce: boolean): void {
    if (!this.isActive()) return;

    this.clearTimers();
    this.adapter.stop();
    this._phase.set('idle');
    this._surface.set(null);
    this._isMuted.set(false);
    this._isDemoFallback.set(false);
    this._error.set(null);
    this._userTranscript.set('');
    this._assistantTranscript.set('');
    this._liveAnnouncement.set(announce ? 'Voice conversation ended' : '');
    if (!announce) this.opener.current = null;
  }

  private beginListening(): void {
    this.clearTimers();
    this._phase.set('listening');
    this._error.set(null);
    this._liveAnnouncement.set(this.isDemoFallback() ? 'Voice demo mode' : (this.isMuted() ? 'Microphone muted' : 'Listening'));

    if (this.isMuted()) return;

    let callbackFailed = false;
    const started = this.adapter.start({
      onTranscript: (transcript) => {
        if (!this.isMuted() && this.phase() === 'listening') {
          this._userTranscript.set(transcript);
        }
      },
      onTurnEnd: () => this.completeListening(),
      onError: (code) => {
        callbackFailed = true;
        this.handleRecognitionError(code);
      },
    });

    // `false` without an error callback means the browser genuinely lacks the
    // API. That is the only state allowed to use the scripted demo path.
    if (!started && !callbackFailed) {
      if (!this.adapter.supported) {
        this._isDemoFallback.set(true);
        this.startDemoFallback();
      } else {
        this.handleRecognitionError('start-failure');
      }
    }
  }

  private startDemoFallback(): void {
    if (!this.isDemoFallback() || this.adapter.supported) return;
    if (!this.isActive() || this.phase() !== 'listening' || this.isMuted()) return;
    this.schedule(() => this.completeListening(), FALLBACK_LISTENING_MS);
  }

  private handleRecognitionError(code: VoiceSessionRecognitionErrorCode): void {
    if (!this.isActive() || this.phase() !== 'listening') return;

    this.clearTimers();
    this.adapter.stop();
    this._phase.set('error');
    this._isMuted.set(false);
    this._isDemoFallback.set(false);
    this._userTranscript.set('');
    this._assistantTranscript.set('');
    this._error.set({
      code,
      message: RECOGNITION_ERROR_MESSAGES[code] ?? 'Voice input stopped unexpectedly. Try again.',
    });
    this._liveAnnouncement.set('Microphone unavailable');
  }

  private completeListening(): void {
    if (!this.isActive() || this.phase() !== 'listening') return;

    this.clearTimers();
    this.adapter.stop();
    this._phase.set('thinking');
    this._liveAnnouncement.set('Thinking');
    this.schedule(() => this.beginSpeaking(), THINKING_MS);
  }

  private beginSpeaking(): void {
    if (!this.isActive() || this.phase() !== 'thinking') return;

    this._assistantTranscript.set(
      this._userTranscript() ? 'Thank you for sharing that. I am here with you.' : FALLBACK_REPLY,
    );
    this._phase.set('speaking');
    this._liveAnnouncement.set('Speaking');
    this.schedule(() => this.beginListening(), SPEAKING_MS);
  }

  private schedule(callback: () => void, delay: number): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delay);
    this.timers.add(timer);
  }

  private clearTimers(): void {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
  }
}
