// @vitest-environment jsdom
import { TestBed } from '@angular/core/testing';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { VoiceSessionService } from './voice-session.service';
import { VoiceSessionAdapter } from './voice-session.adapter';
import { VoiceSessionAdapterCallbacks } from './voice-session.model';

describe('VoiceSessionService', () => {
  let service: VoiceSessionService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [VoiceSessionService, VoiceSessionAdapter] });
    service = TestBed.inject(VoiceSessionService);
  });

  afterEach(() => {
    service.end();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('starts in listening and transitions through a scripted turn', () => {
    service.start();
    expect(service.phase()).toBe('listening');

    vi.advanceTimersByTime(2400);
    expect(service.phase()).toBe('thinking');

    vi.advanceTimersByTime(1000);
    expect(service.phase()).toBe('speaking');
    expect(service.transcript()).toContain('gentle moment');

    vi.advanceTimersByTime(2400);
    expect(service.phase()).toBe('listening');
  });

  it('toggles mute without changing the turn phase', () => {
    service.start();
    service.toggleMuted();

    expect(service.isMuted()).toBe(true);
    expect(service.phase()).toBe('listening');
    expect(service.statusLabel()).toBe('Microphone muted');

    service.toggleMuted();
    expect(service.isMuted()).toBe(false);
  });

  it('stops capture and does not advance while muted until explicitly resumed', () => {
    const adapter = TestBed.inject(VoiceSessionAdapter);
    const stop = vi.spyOn(adapter, 'stop');

    service.start();
    service.toggleMuted();
    vi.advanceTimersByTime(10000);

    expect(stop).toHaveBeenCalled();
    expect(service.phase()).toBe('listening');
    expect(service.isMuted()).toBe(true);

    service.toggleMuted();
    expect(service.isMuted()).toBe(false);
    vi.advanceTimersByTime(2400);
    expect(service.phase()).toBe('thinking');
  });

  it('shows a truthful permission error and does not schedule a scripted reply', () => {
    const adapter = TestBed.inject(VoiceSessionAdapter);
    vi.spyOn(adapter, 'start').mockImplementation((callbacks: VoiceSessionAdapterCallbacks) => {
      callbacks.onError('not-allowed');
      return true;
    });

    service.start();
    vi.advanceTimersByTime(10000);

    expect(service.phase()).toBe('error');
    expect(service.error()).toEqual({
      code: 'not-allowed',
      message: 'Microphone access was blocked. Allow microphone access, then try again.',
    });
    expect(service.transcript()).toBe('');
  });

  it('shows an explicit error when the recognizer cannot start', () => {
    const adapter = TestBed.inject(VoiceSessionAdapter);
    vi.spyOn(adapter, 'start').mockImplementation((callbacks: VoiceSessionAdapterCallbacks) => {
      callbacks.onError('start-failure');
      return false;
    });

    service.start();

    expect(service.phase()).toBe('error');
    expect(service.error()?.code).toBe('start-failure');
  });

  it('ignores a late recognition error after the session has ended', () => {
    const adapter = TestBed.inject(VoiceSessionAdapter);
    let callbacks: VoiceSessionAdapterCallbacks | undefined;
    vi.spyOn(adapter, 'start').mockImplementation((nextCallbacks: VoiceSessionAdapterCallbacks) => {
      callbacks = nextCallbacks;
      return true;
    });

    service.start();
    service.end();
    callbacks?.onError('not-allowed');

    expect(service.phase()).toBe('idle');
    expect(service.error()).toBeNull();
  });

  it('ends the session and cancels all pending transitions', () => {
    service.start();
    service.end();
    vi.advanceTimersByTime(10000);

    expect(service.phase()).toBe('idle');
    expect(service.isActive()).toBe(false);
    expect(service.transcript()).toBe('');
  });
});
