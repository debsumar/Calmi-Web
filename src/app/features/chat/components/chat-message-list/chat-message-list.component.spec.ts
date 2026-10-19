// @vitest-environment jsdom
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, beforeEach, vi } from 'vitest';
import { LucideDynamicIcon, LucideArrowDown, provideLucideIcons } from '@lucide/angular';
import { ChatMessageListComponent } from './chat-message-list.component';
import { ChatTypingComponent } from '../chat-typing/chat-typing.component';
import { ChatStoreService } from '../../services/chat-store.service';
import { ChatMessage } from '../../models/chat-message.model';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  template: '<article [class.stagger-enter]="animate" [style.--index]="entranceIndex"></article>',
  inputs: ['message', 'animate', 'entranceIndex'],
})
class ChatMessageStubComponent {
  animate = false;
  entranceIndex = 0;
}

describe('ChatMessageListComponent', () => {

const seedMessages = (store: ChatStoreService): void => {
  (store as unknown as { _messages: { set: (messages: ChatMessage[]) => void } })._messages.set([
    { id: 'one', role: 'ai', text: 'One', timestamp: new Date(), status: 'sent' },
    { id: 'two', role: 'ai', text: 'Two', timestamp: new Date(), status: 'sent' },
  ]);
};

  let fixture: ComponentFixture<ChatMessageListComponent>;
  let store: ChatStoreService;

  beforeEach(async () => {
    TestBed.overrideComponent(ChatMessageListComponent, {
      set: { imports: [ChatMessageStubComponent, ChatTypingComponent, LucideDynamicIcon] },
    });
    await TestBed.configureTestingModule({
      imports: [ChatMessageListComponent],
      providers: [provideLucideIcons(LucideArrowDown)],
    }).compileComponents();
    fixture = TestBed.createComponent(ChatMessageListComponent);
    store = TestBed.inject(ChatStoreService);
    store.reset();
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const setLayout = (log: HTMLElement, scrollHeight: number, clientHeight: number, scrollTop: number): void => {
    Object.defineProperties(log, {
      scrollHeight: { configurable: true, value: scrollHeight },
      clientHeight: { configurable: true, value: clientHeight },
      scrollTop: { configurable: true, writable: true, value: scrollTop },
    });
  };

  const pushMessage = (role: 'ai' | 'user', id: string): void => {
    (store as unknown as { _messages: { update: (fn: (messages: ChatMessage[]) => ChatMessage[]) => void } })._messages.update(
      (messages) => [...messages, { id, role, text: id, timestamp: new Date(), status: 'sent' }],
    );
    fixture.detectChanges();
  };

  const renderSeededFixture = (): void => {
    fixture.destroy();
    seedMessages(store);
    fixture = TestBed.createComponent(ChatMessageListComponent);
    fixture.detectChanges();
  };

  it('renders the conversation log', () => {
    renderSeededFixture();
    const log = fixture.nativeElement.querySelector('[role="log"]');
    expect(log).not.toBeNull();
    expect(log.getAttribute('aria-label')).toBe('Conversation with Rumi AI');
    expect(fixture.nativeElement.querySelector('app-chat-message')).not.toBeNull();
  });

  it('passes shared stagger entry and indexed inputs to rendered messages', () => {
    renderSeededFixture();
    const articles = fixture.nativeElement.querySelectorAll('app-chat-message article');

    expect(articles.length).toBeGreaterThanOrEqual(2);
    expect(articles[0].classList).toContain('stagger-enter');
    expect(articles[1].classList).toContain('stagger-enter');
    expect(articles[0].style.getPropertyValue('--index')).toBe('0');
    expect(articles[1].style.getPropertyValue('--index')).toBe('1');
  });
  it('keeps shared message entry static when reduced motion is preferred', () => {
    fixture.destroy();
    const matchMedia = vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList);

    const reducedFixture = TestBed.createComponent(ChatMessageListComponent);
    seedMessages(store);
    reducedFixture.detectChanges();

    expect(reducedFixture.componentInstance.animateMessages()).toBe(false);
    expect(reducedFixture.nativeElement.querySelector('app-chat-message article')?.classList).not.toContain('stagger-enter');

    reducedFixture.destroy();
    matchMedia.mockRestore();
  });

  it('shows the scroll-to-bottom pill, outside the log live region, once the user scrolls away from the bottom', () => {
    const log = fixture.nativeElement.querySelector('[role="log"]') as HTMLElement;
    setLayout(log, 500, 200, 100);
    expect(fixture.nativeElement.querySelector('[aria-label="Scroll to bottom"]')).toBeNull();

    log.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    const pill = fixture.nativeElement.querySelector('[aria-label="Scroll to bottom"]') as HTMLElement;
    expect(pill).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Scroll to bottom');
    expect(log.contains(pill)).toBe(false);
  });

  it('does not force-scroll for an AI message when the user scrolled up', async () => {
    renderSeededFixture();
    const log = fixture.nativeElement.querySelector('[role="log"]') as HTMLElement;
    setLayout(log, 1000, 200, 100);
    log.dispatchEvent(new Event('scroll'));

    pushMessage('ai', 'incoming-ai');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(log.scrollTop).toBe(100);
    expect(fixture.nativeElement.querySelector('[aria-label="Scroll to bottom"]')).not.toBeNull();
  });

  it('force-scrolls for the user\'s own new message even when scrolled up', async () => {
    renderSeededFixture();
    const log = fixture.nativeElement.querySelector('[role="log"]') as HTMLElement;
    setLayout(log, 1000, 200, 100);
    log.dispatchEvent(new Event('scroll'));

    pushMessage('user', 'mine');
    await fixture.whenStable();

    expect(log.scrollTop).toBe(1000);
    expect(fixture.nativeElement.querySelector('[aria-label="Scroll to bottom"]')).toBeNull();
  });

  it('keeps following new AI messages while the user is pinned near the bottom', async () => {
    renderSeededFixture();
    const log = fixture.nativeElement.querySelector('[role="log"]') as HTMLElement;
    setLayout(log, 1000, 200, 790);
    log.dispatchEvent(new Event('scroll'));

    pushMessage('ai', 'follow-me');
    await fixture.whenStable();

    expect(log.scrollTop).toBe(1000);
  });

  it('does not re-show the pill while a programmatic smooth scroll is running', async () => {
    renderSeededFixture();
    const log = fixture.nativeElement.querySelector('[role="log"]') as HTMLElement;
    setLayout(log, 1000, 200, 100);
    const scrollTo = vi.fn();
    (log as unknown as { scrollTo: typeof scrollTo }).scrollTo = scrollTo;
    log.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('[aria-label="Scroll to bottom"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(scrollTo).toHaveBeenCalledWith({ top: 1000, behavior: 'smooth' });

    // Intermediate frame of the smooth scroll: still far from the bottom.
    log.scrollTop = 400;
    log.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Scroll to bottom"]')).toBeNull();

    log.scrollTop = 800;
    log.dispatchEvent(new Event('scroll'));
    log.dispatchEvent(new Event('scrollend'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Scroll to bottom"]')).toBeNull();
  });

  it('uses adaptive roles for the empty-state identity treatment', () => {
    (store as unknown as { _messages: { set: (messages: never[]) => void } })._messages.set([]);
    fixture.detectChanges();

    const emptyState = fixture.nativeElement.querySelector('.bg-sunken-alt') as HTMLElement;
    expect(emptyState).not.toBeNull();
    expect(emptyState.classList).toContain('bg-sunken-alt');
    expect(fixture.nativeElement.querySelector('.text-ink-soft')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.dark\\:text-brand-light')).toBeNull();
  });
});
