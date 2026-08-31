// @vitest-environment jsdom
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { LucideDynamicIcon, LucideArrowDown, provideLucideIcons } from '@lucide/angular';
import { ChatMessageListComponent } from './chat-message-list.component';
import { ChatTypingComponent } from '../chat-typing/chat-typing.component';
import { ChatStoreService } from '../../services/chat-store.service';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  template: '',
  inputs: ['message', 'index'],
})
class ChatMessageStubComponent {}

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
