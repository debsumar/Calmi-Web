// @vitest-environment jsdom
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { provideLucideIcons, LucideSend, LucideMic, LucideMicOff } from '@lucide/angular';
import { ChatComposerComponent } from './chat-composer.component';
import { ChatStoreService } from '../../services/chat-store.service';

describe('ChatComposerComponent', () => {
  let fixture: ComponentFixture<ChatComposerComponent>;
  let store: ChatStoreService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatComposerComponent],
      providers: [provideLucideIcons(LucideSend, LucideMic, LucideMicOff)],
    }).compileComponents();
    fixture = TestBed.createComponent(ChatComposerComponent);
    store = TestBed.inject(ChatStoreService);
    store.reset();
    fixture.detectChanges();
  });

  it('renders with an empty disabled send button', () => {
    const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });

  it('sends on Enter without Shift', () => {
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'I feel anxious';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(store.messages().at(-1)?.text).toBe('I feel anxious');
    store.cancelPendingReply();
  });

  it('hides the mic when the Web Speech API is unavailable', () => {
    expect(fixture.nativeElement.querySelector('button[aria-label="Start voice input"]')).toBeNull();
  });

  it('pipes dictated speech into the draft when the mic is available', () => {
    class FakeRecognition {
      continuous = false;
      interimResults = false;
      lang = '';
      onresult: ((event: unknown) => void) | null = null;
      onerror: (() => void) | null = null;
      onend: (() => void) | null = null;

      start(): void {
        this.onresult?.({
          resultIndex: 0,
          results: { length: 1, 0: { length: 1, 0: { transcript: 'I feel tired' } } },
        });
      }

      stop(): void {
        this.onend?.();
      }
    }

    const speechWindow = window as unknown as { SpeechRecognition?: unknown };
    speechWindow.SpeechRecognition = FakeRecognition;

    try {
      const micFixture = TestBed.createComponent(ChatComposerComponent);
      micFixture.detectChanges();

      const mic = micFixture.nativeElement.querySelector('button[aria-label="Start voice input"]') as HTMLButtonElement;
      expect(mic).not.toBeNull();

      mic.click();
      micFixture.detectChanges();

      expect(store.draft()).toBe('I feel tired');
      expect(micFixture.nativeElement.querySelector('button[aria-label="Stop voice input"]')).not.toBeNull();
    } finally {
      delete speechWindow.SpeechRecognition;
    }
  });
});
