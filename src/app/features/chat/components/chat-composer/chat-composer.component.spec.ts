// @vitest-environment jsdom
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { provideLucideIcons, LucideAudioLines, LucideSend, LucideVolume2, LucideX } from '@lucide/angular';
import { ChatComposerComponent } from './chat-composer.component';
import { ChatStoreService } from '../../services/chat-store.service';
import { VoiceSessionService } from '../../services/voice-session.service';
import { LivekitRoomService } from '../../services/livekit-room.service';
import { VoiceRoomError } from '../../services/voice-session.model';

describe('ChatComposerComponent', () => {
  let fixture: ComponentFixture<ChatComposerComponent>;
  let store: ChatStoreService;
  let voice: VoiceSessionService;

  beforeEach(async () => {
    const connected = signal(false);
    const speaking = signal(false);
    const error = signal<VoiceRoomError | null>(null);
    const room = {
      connected,
      speaking,
      error,
      connect: vi.fn().mockImplementation(async () => { connected.set(true); }),
      setMuted: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockImplementation(async () => { connected.set(false); error.set(null); }),
    };
    await TestBed.configureTestingModule({
      imports: [ChatComposerComponent],
      providers: [
        { provide: LivekitRoomService, useValue: room },
        provideLucideIcons(LucideAudioLines, LucideSend, LucideVolume2, LucideX),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ChatComposerComponent);
    store = TestBed.inject(ChatStoreService);
    voice = TestBed.inject(VoiceSessionService);
    store.reset();
    voice.end();
    fixture.detectChanges();
  });

  afterEach(() => {
    voice.end();
    vi.useRealTimers();
  });

  it('renders with an empty disabled send button', () => {
    const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });

  it('renders floating glass and embedded opaque composer surfaces', () => {
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;

    expect(form.classList).toContain('bg-glass');
    expect(form.classList).toContain('backdrop-blur-xl');
    expect(form.classList).not.toContain('bg-surface');

    fixture.componentRef.setInput('surface', 'rumi-embedded');
    fixture.detectChanges();

    expect(form.classList).toContain('bg-surface');
    expect(form.classList).not.toContain('bg-glass');
    expect(form.classList).not.toContain('backdrop-blur-xl');
  });

  it('always renders the audio-lines voice trigger and circular send control', () => {
    const voiceButton = fixture.nativeElement.querySelector('button[aria-label="Start voice conversation"]') as HTMLButtonElement;
    const sendButton = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    const controlGroup = textarea.parentElement as HTMLElement;

    expect(voiceButton).not.toBeNull();
    expect(voiceButton.querySelector('svg')).not.toBeNull();
    expect(voiceButton.classList).toContain('border-hairline');
    expect(voiceButton.classList).toContain('dark:text-brand-light');
    expect(voiceButton.classList).toContain('h-11');
    expect(voiceButton.classList).toContain('w-11');
    expect(voiceButton.classList).toContain('min-w-11');
    expect(voiceButton.getAttribute('aria-pressed')).toBe('false');
    expect(controlGroup).not.toBeNull();
    expect(controlGroup.classList).toContain('rounded-full');
    expect(sendButton).not.toBeNull();
    expect(sendButton.classList).toContain('rounded-full');
    expect(sendButton.classList).toContain('h-11');
    expect(sendButton.classList).toContain('w-11');
    expect(sendButton.classList).toContain('min-w-11');
    expect(sendButton.getAttribute('aria-disabled')).toBe('true');
    expect(textarea.getAttribute('placeholder')).toBe("Share what's on your mind...");
    expect(textarea.classList).toContain('caret-brand');
    expect(textarea.classList).toContain('outline-none');
    expect(textarea.classList).not.toContain('focus:ring-2');
    expect(textarea.classList).not.toContain('focus:ring-brand');
    expect(textarea.classList).not.toContain('focus:ring-inset');
    expect(textarea.classList).not.toContain('focus-visible:ring-2');
    expect(controlGroup.classList).toContain('focus-within:ring-2');
    expect(controlGroup.classList).toContain('focus-within:ring-brand');
    expect(controlGroup.classList).toContain('focus-within:ring-inset');
    expect(voiceButton.classList).toContain('focus-visible:ring-2');
    expect(sendButton.classList).toContain('focus-visible:ring-2');
  });

  it('starts a voice session from the composer trigger', async () => {
    const button = fixture.nativeElement.querySelector('button[aria-label="Start voice conversation"]') as HTMLButtonElement;
    button.click();
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();

    expect(voice.phase()).toBe('listening');
    expect(voice.isActive()).toBe(true);
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
});
