// @vitest-environment jsdom
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatStoreService } from '../../services/chat-store.service';
import { VoiceSessionService } from '../../services/voice-session.service';
import { ChatBubbleComponent } from './chat-bubble.component';

const chatStore = {
  isOpen: signal(false),
  unreadCount: signal(0),
  toggle: vi.fn(),
};

const voice = {
  isActive: signal(false),
};

describe('ChatBubbleComponent', () => {
  let fixture: ComponentFixture<ChatBubbleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatBubbleComponent],
      providers: [
        { provide: ChatStoreService, useValue: chatStore },
        { provide: VoiceSessionService, useValue: voice },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatBubbleComponent);
    fixture.detectChanges();
  });

  it('uses adaptive bubble and logo-container roles', () => {
    const button = fixture.nativeElement.querySelector('#rumi-chat-bubble') as HTMLElement;
    const logo = button.querySelector('.logo-pulse') as HTMLElement;

    expect(button.classList).toContain('bg-brand-dark');
    expect(button.classList).toContain('text-on-brand');
    expect(button.classList).toContain('dark:bg-elevated');
    expect(button.classList).toContain('dark:text-brand-light');
    expect(button.classList).toContain('border-hairline');
    expect(logo.classList).toContain('p-0.5');
    expect(button.querySelector('img[alt=""]')).not.toBeNull();
  });
});
