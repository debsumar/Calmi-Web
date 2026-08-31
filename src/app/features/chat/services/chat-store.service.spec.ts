import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ChatStoreService } from './chat-store.service';

describe('ChatStoreService', () => {
  let service: ChatStoreService;

  beforeEach(() => {
    service = new ChatStoreService();
  });

  afterEach(() => {
    service.cancelPendingReply();
    service.cancelPendingClose();
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

  it('keeps greeting and user timestamps at their creation time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 31, 15, 28));
    service.reset();
    const greetingTimestamps = service.messages().map((message) => message.timestamp.getTime());

    service.setDraft('I need a quiet moment');
    service.send();
    service.cancelPendingReply();
    const userTimestamp = service.messages().find((message) => message.role === 'user')?.timestamp.getTime();

    vi.advanceTimersByTime(3 * 60_000);

    expect(service.messages().slice(0, greetingTimestamps.length).map((message) => message.timestamp.getTime()))
      .toEqual(greetingTimestamps);
    expect(service.messages().find((message) => message.role === 'user')?.timestamp.getTime())
      .toBe(userTimestamp);
  });

  it('keeps the panel mounted while the exit animation plays', () => {
    vi.useFakeTimers();
    service.open();

    service.requestClose(180);

    expect(service.isClosing()).toBe(true);
    expect(service.isOpen()).toBe(true);

    vi.advanceTimersByTime(180);

    expect(service.isOpen()).toBe(false);
    expect(service.isClosing()).toBe(false);
  });

  it('animates dismissal when toggled shut from the bubble', () => {
    vi.useFakeTimers();
    service.open();

    service.toggle();

    expect(service.isClosing()).toBe(true);
    expect(service.isOpen()).toBe(true);
  });

  it('cancels a pending close when reopened mid-animation', () => {
    vi.useFakeTimers();
    service.open();
    service.requestClose(180);

    service.open();
    vi.advanceTimersByTime(400);

    expect(service.isOpen()).toBe(true);
    expect(service.isClosing()).toBe(false);
  });
});
