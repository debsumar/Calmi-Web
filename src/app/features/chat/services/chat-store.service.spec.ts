import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ChatStoreService } from './chat-store.service';

describe('ChatStoreService', () => {
  let service: ChatStoreService;

  beforeEach(() => {
    service = new ChatStoreService();
  });

  afterEach(() => {
    service.cancelPendingReply();
    vi.useRealTimers();
  });

  it('pushes a user message and starts typing when sending', () => {
    service.setDraft('I need a quiet moment');

    service.send();

    const message = service.messages()[service.messages().length - 1];
    expect(message.role).toBe('user');
    expect(message.text).toBe('I need a quiet moment');
    expect(service.draft()).toBe('');
    expect(service.isTyping()).toBe(true);
  });

  it('stops typing and adds an AI reply after the delay', () => {
    vi.useFakeTimers();
    service.setDraft('Help me settle');
    service.send();

    vi.advanceTimersByTime(1400);

    const message = service.messages()[service.messages().length - 1];
    expect(message.role).toBe('ai');
    expect(message.status).toBe('sent');
    expect(message.text.length).toBeGreaterThan(0);
    expect(service.isTyping()).toBe(false);
  });

  it('increments unread count when a reply arrives while closed', () => {
    vi.useFakeTimers();
    service.setDraft('I feel anxious');
    service.send();

    vi.advanceTimersByTime(1400);

    expect(service.isOpen()).toBe(false);
    expect(service.unreadCount()).toBe(1);
  });

  it('reports false canSend for a blank draft', () => {
    expect(service.canSend()).toBe(false);

    service.setDraft('   ');

    expect(service.canSend()).toBe(false);
  });
});
