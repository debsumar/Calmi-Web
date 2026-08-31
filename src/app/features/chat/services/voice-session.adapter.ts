import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { VoiceSessionAdapterCallbacks, VoiceSessionRecognitionErrorCode } from './voice-session.model';

interface SpeechRecognitionResultLike {
  readonly length: number;
  [index: number]: { readonly transcript: string };
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: { readonly length: number; [index: number]: SpeechRecognitionResultLike };
}

interface SpeechRecognitionErrorEventLike {
  readonly error?: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

/**
 * Browser voice input seam. A future model/audio transport can replace this
 * adapter without changing the session state machine or overlay.
 */
@Injectable({ providedIn: 'root' })
export class VoiceSessionAdapter {
  private readonly document = inject(DOCUMENT);
  private readonly recognitionCtor = typeof window === 'undefined'
    ? undefined
    : (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition;

  private recognition: SpeechRecognitionLike | null = null;
  private active = false;

  readonly supported = this.recognitionCtor !== undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  start(callbacks: VoiceSessionAdapterCallbacks): boolean {
    const Recognition = this.recognitionCtor;
    if (!Recognition) return false;

    this.stop();

    let recognition: SpeechRecognitionLike;
    try {
      recognition = new Recognition();
    } catch {
      callbacks.onError('start-failure');
      return false;
    }

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = this.document.documentElement.lang || 'en-US';
    recognition.onresult = (event) => {
      if (!this.isCurrent(recognition)) return;

      let transcript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript ?? '';
      }
      const normalized = transcript.trim();
      if (normalized) callbacks.onTranscript(normalized);
    };
    recognition.onerror = (event) => {
      if (!this.isCurrent(recognition)) return;

      // Detach before notifying the service. The browser can deliver a late
      // result/end event after an error, and neither may revive this turn.
      this.detachAndStop(recognition);
      callbacks.onError(this.normalizeErrorCode(event.error));
    };
    recognition.onend = () => {
      if (!this.isCurrent(recognition)) return;

      this.detach(recognition);
      callbacks.onTurnEnd();
    };

    this.recognition = recognition;
    this.active = true;
    try {
      recognition.start();
      return true;
    } catch {
      this.detachAndStop(recognition);
      callbacks.onError('start-failure');
      return false;
    }
  }

  stop(): void {
    const recognition = this.recognition;
    if (!recognition) {
      this.active = false;
      return;
    }
    this.detachAndStop(recognition);
  }

  private normalizeErrorCode(code: string | undefined): VoiceSessionRecognitionErrorCode {
    return code?.trim() || 'recognition-error';
  }

  private isCurrent(recognition: SpeechRecognitionLike): boolean {
    return this.active && this.recognition === recognition;
  }

  private detach(recognition: SpeechRecognitionLike): void {
    if (this.recognition === recognition) {
      this.active = false;
      this.recognition = null;
    }
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
  }

  private detachAndStop(recognition: SpeechRecognitionLike): void {
    this.detach(recognition);
    try {
      recognition.stop();
    } catch {
      // Recognition may already have ended; cleanup is complete either way.
    }
  }
}
