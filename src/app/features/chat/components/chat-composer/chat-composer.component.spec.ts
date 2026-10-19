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
    expect(voiceButton.classList).toContain('text-ink');
    expect(voiceButton.classList).not.toContain('dark:text-brand-light');
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
    await fixture.whenStable();
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

  const type = (textarea: HTMLTextAreaElement, value: string): void => {
    textarea.value = value;
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  it('does not send on Enter while an IME composition is active', () => {
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    type(textarea, 'にほんご');

    const composing = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, isComposing: true });
    textarea.dispatchEvent(composing);
    const legacy = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    Object.defineProperty(legacy, 'keyCode', { value: 229 });
    textarea.dispatchEvent(legacy);

    expect(store.messages()).toHaveLength(0);
    expect(composing.defaultPrevented).toBe(false);
    expect(store.draft()).toBe('にほんご');
  });

  it('resets height to auto before measuring so the textarea can shrink', async () => {
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    let contentHeight = 100;
    let heightWhenMeasured = '';
    Object.defineProperty(textarea, 'scrollHeight', {
      configurable: true,
      get: () => {
        heightWhenMeasured = textarea.style.height;
        return contentHeight;
      },
    });

    type(textarea, 'a\nb\nc\nd');
    await fixture.whenStable();
    expect(heightWhenMeasured).toBe('auto');
    expect(textarea.style.height).toBe('100px');

    contentHeight = 30;
    type(textarea, 'a');
    await fixture.whenStable();
    expect(textarea.style.height).toBe('30px');
  });

  it('does not split a surrogate pair when truncating at 1000 characters', () => {
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    type(textarea, `${'a'.repeat(999)}😀`);

    const draft = store.draft();
    expect(draft).toBe('a'.repeat(999));
    expect(/[\uD800-\uDBFF]$/.test(draft)).toBe(false);
  });

  it('always renders the counter live region, linked by aria-describedby, and fills it past 900 chars', () => {
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    const describedBy = textarea.getAttribute('aria-describedby') ?? '';
    const counter = fixture.nativeElement.querySelector(`#${describedBy}`) as HTMLElement;

    expect(counter).not.toBeNull();
    expect(counter.getAttribute('aria-live')).toBe('polite');
    expect(counter.textContent?.trim()).toBe('');

    type(textarea, 'a'.repeat(901));
    expect(fixture.nativeElement.querySelector(`#${describedBy}`)).toBe(counter);
    expect(counter.textContent?.trim()).toBe('901/1000');
  });

  it('keeps the voice button label static and conveys state only through aria-pressed', async () => {
    const button = fixture.nativeElement.querySelector('button[aria-label="Start voice conversation"]') as HTMLButtonElement;
    expect(button.getAttribute('aria-pressed')).toBe('false');

    button.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(button.getAttribute('aria-label')).toBe('Start voice conversation');
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });
});
