// @vitest-environment jsdom
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceSessionAdapter } from './voice-session.adapter';

interface FakeResultEvent {
  resultIndex: number;
  results: { length: number; 0: { length: number; 0: { transcript: string } } };
}

interface FakeErrorEvent {
  error: string;
}

class FakeRecognition {
  static instances: FakeRecognition[] = [];
  static throwOnStart = false;
  continuous = false;
  interimResults = false;
  lang = '';
  onresult: ((event: FakeResultEvent) => void) | null = null;
  onerror: ((event: FakeErrorEvent) => void) | null = null;
  onend: (() => void) | null = null;
  stopCalls = 0;
  throwOnStart = FakeRecognition.throwOnStart;
  throwOnStop = false;

  constructor() {
    FakeRecognition.instances.push(this);
  }

  start(): void {
    if (this.throwOnStart) throw new Error('could not start');
  }

  stop(): void {
    this.stopCalls += 1;
    if (this.throwOnStop) throw new Error('already ended');
  }
}

describe('VoiceSessionAdapter', () => {
  let adapter: VoiceSessionAdapter;
  let originalSpeechRecognition: unknown;

  beforeEach(() => {
    originalSpeechRecognition = (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = FakeRecognition;
    FakeRecognition.instances = [];
    FakeRecognition.throwOnStart = false;
    TestBed.configureTestingModule({ providers: [VoiceSessionAdapter] });
    adapter = TestBed.inject(VoiceSessionAdapter);
  });

  afterEach(() => {
    adapter.stop();
    if (originalSpeechRecognition === undefined) {
      delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    } else {
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = originalSpeechRecognition;
    }
    TestBed.resetTestingModule();
  });

  it('detaches and stops a recognizer before reporting an error', () => {
    const onTranscript = vi.fn();
    const onError = vi.fn();
    adapter.start({ onTranscript, onError, onTurnEnd: vi.fn() });
    const recognition = FakeRecognition.instances[0];
    const staleResult = recognition.onresult;

    recognition.onerror?.({ error: 'not-allowed' });

    expect(recognition.stopCalls).toBe(1);
    expect(recognition.onresult).toBeNull();
    expect(recognition.onerror).toBeNull();
    expect(recognition.onend).toBeNull();
    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith('not-allowed');

    staleResult?.({
      resultIndex: 0,
      results: { length: 1, 0: { length: 1, 0: { transcript: 'stale' } } },
    });
    expect(onTranscript).not.toHaveBeenCalled();
  });


  it('reports a recognizer start failure with an explicit code', () => {
    const onError = vi.fn();
    FakeRecognition.throwOnStart = true;

    adapter.start({ onTranscript: vi.fn(), onError, onTurnEnd: vi.fn() });

    expect(onError).toHaveBeenCalledWith('start-failure');
  });
  it('ignores callbacks from a recognizer replaced by a new turn', () => {
    const firstTranscript = vi.fn();
    const secondTranscript = vi.fn();
    adapter.start({ onTranscript: firstTranscript, onError: vi.fn(), onTurnEnd: vi.fn() });
    const first = FakeRecognition.instances[0];
    const staleResult = first.onresult;

    adapter.start({ onTranscript: secondTranscript, onError: vi.fn(), onTurnEnd: vi.fn() });
    const current = FakeRecognition.instances[1];

    expect(first.stopCalls).toBe(1);
    staleResult?.({
      resultIndex: 0,
      results: { length: 1, 0: { length: 1, 0: { transcript: 'old' } } },
    });
    current.onresult?.({
      resultIndex: 0,
      results: { length: 1, 0: { length: 1, 0: { transcript: 'current' } } },
    });

    expect(firstTranscript).not.toHaveBeenCalled();
    expect(secondTranscript).toHaveBeenCalledWith('current');
  });

  it('swallows stop errors while cleaning up', () => {
    adapter.start({ onTranscript: vi.fn(), onError: vi.fn(), onTurnEnd: vi.fn() });
    const recognition = FakeRecognition.instances[0];
    recognition.throwOnStop = true;

    expect(() => adapter.stop()).not.toThrow();
    expect(recognition.onresult).toBeNull();
    expect(recognition.onend).toBeNull();
  });
});
