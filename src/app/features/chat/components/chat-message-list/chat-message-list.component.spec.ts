// @vitest-environment jsdom
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { LucideDynamicIcon, LucideArrowDown, provideLucideIcons } from '@lucide/angular';
import { ChatMessageListComponent } from './chat-message-list.component';
import { ChatTypingComponent } from '../chat-typing/chat-typing.component';
import { ChatStoreService } from '../../services/chat-store.service';

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

  it('renders the conversation log', () => {
    const log = fixture.nativeElement.querySelector('[role="log"]');
    expect(log).not.toBeNull();
    expect(log.getAttribute('aria-label')).toBe('Conversation with Rumi AI');
    expect(fixture.nativeElement.querySelector('app-chat-message')).not.toBeNull();
  });

  it('passes shared stagger entry and indexed inputs to rendered messages', () => {
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
    reducedFixture.detectChanges();

    expect(reducedFixture.componentInstance.animateMessages()).toBe(false);
    expect(reducedFixture.nativeElement.querySelector('app-chat-message article')?.classList).not.toContain('stagger-enter');

    reducedFixture.destroy();
    matchMedia.mockRestore();
  });

  it('shows the scroll-to-bottom pill when the user is more than 100px from the bottom', () => {
    const log = fixture.nativeElement.querySelector('[role="log"]') as HTMLElement;
    Object.defineProperties(log, {
      scrollHeight: { configurable: true, value: 500 },
      clientHeight: { configurable: true, value: 200 },
      scrollTop: { configurable: true, writable: true, value: 100 },
    });
    fixture.componentInstance.onScroll();
    fixture.componentInstance.showScrollToBottom.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Scroll to bottom');
    expect(fixture.nativeElement.querySelector('[aria-label="Scroll to bottom"]')).not.toBeNull();
  });

  it('uses adaptive roles for the empty-state identity treatment', () => {
    (store as unknown as { _messages: { set: (messages: never[]) => void } })._messages.set([]);
    fixture.detectChanges();

    const emptyState = fixture.nativeElement.querySelector('.bg-sunken-alt') as HTMLElement;
    expect(emptyState).not.toBeNull();
    expect(emptyState.classList).toContain('bg-sunken-alt');
    expect(fixture.nativeElement.querySelector('.dark\\:text-brand-light')).not.toBeNull();
  });
});
