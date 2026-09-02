// @vitest-environment jsdom
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ChatSessionIdService } from './chat-session-id.service';

describe('ChatSessionIdService', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [ChatSessionIdService] });
  });

  it('generates and stores one valid ID per session-storage-backed service', () => {
    const service = TestBed.inject(ChatSessionIdService);

    const first = service.sessionId;
    const second = service.sessionId;

    expect(first).toMatch(/^web-[a-z0-9]{8}$/);
    expect(second).toBe(first);
    expect(sessionStorage.getItem('calmi-chat-session-id')).toBe(first);
  });

  it('reuses a valid stored ID', () => {
    sessionStorage.setItem('calmi-chat-session-id', 'web-q1w2e3r4');
    const service = TestBed.inject(ChatSessionIdService);

    expect(service.sessionId).toBe('web-q1w2e3r4');
  });

  it('replaces an invalid stored ID', () => {
    sessionStorage.setItem('calmi-chat-session-id', 'not-a-session');
    const service = TestBed.inject(ChatSessionIdService);

    expect(service.sessionId).toMatch(/^web-[a-z0-9]{8}$/);
    expect(service.sessionId).not.toBe('not-a-session');
  });
});
