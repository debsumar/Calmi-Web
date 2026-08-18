// @vitest-environment jsdom
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { LucideDynamicIcon } from '@lucide/angular';
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

const angularTesting = globalThis as typeof globalThis & { __calmiAngularTestingInitialized?: boolean };
if (!angularTesting.__calmiAngularTestingInitialized) {
  TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
  angularTesting.__calmiAngularTestingInitialized = true;
}

afterEach(() => TestBed.resetTestingModule());

describe('ChatMessageListComponent', () => {
  let fixture: ComponentFixture<ChatMessageListComponent>;
  let store: ChatStoreService;

  beforeEach(async () => {
    TestBed.overrideComponent(ChatMessageListComponent, {
      set: { imports: [ChatMessageStubComponent, ChatTypingComponent, LucideDynamicIcon] },
    });
    await TestBed.configureTestingModule({ imports: [ChatMessageListComponent] }).compileComponents();
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
});
