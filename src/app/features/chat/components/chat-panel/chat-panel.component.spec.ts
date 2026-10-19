// @vitest-environment jsdom
import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LucideDynamicIcon, LucideMinus, LucideX, provideLucideIcons } from '@lucide/angular';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatStoreService } from '../../services/chat-store.service';
import { VoiceSessionService } from '../../services/voice-session.service';
import { ChatPanelComponent } from './chat-panel.component';

// Module-level mocks are reset in beforeEach so state never leaks between tests.
const chatStore = {
  isOpen: signal(true),
  isClosing: signal(false),
  isMinimized: signal(false),
  requestClose: vi.fn(),
  close: vi.fn(),
  minimize: vi.fn(),
};

const voice = {
  isActive: signal(false),
  surface: signal<'floating-panel' | 'rumi-embedded' | null>(null),
  endForSurface: vi.fn(),
  end: vi.fn(),
  restoreFocus: vi.fn(),
};

describe('ChatPanelComponent', () => {
  let fixture: ComponentFixture<ChatPanelComponent>;

  beforeEach(async () => {
    chatStore.isOpen.set(true);
    chatStore.isClosing.set(false);
    chatStore.isMinimized.set(false);
    voice.isActive.set(false);
    voice.surface.set(null);
    for (const mock of [chatStore.requestClose, chatStore.close, chatStore.minimize, voice.endForSurface, voice.end, voice.restoreFocus]) {
      mock.mockReset();
    }
    // Standalone components resolve their own schemas, so the unknown-element
    // allowance must live on the override, not just the testing module.
    TestBed.overrideComponent(ChatPanelComponent, {
      set: { imports: [LucideDynamicIcon], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    });
    await TestBed.configureTestingModule({
      imports: [ChatPanelComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: ChatStoreService, useValue: chatStore },
        { provide: VoiceSessionService, useValue: voice },
        provideLucideIcons(LucideMinus, LucideX),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatPanelComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  const headerButton = (label: string): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector(`header button[aria-label="${label}"]`) as HTMLButtonElement;

  it('uses a full-screen mobile sheet while retaining desktop popup geometry', () => {
    const panel = (fixture.nativeElement as HTMLElement).querySelector('#rumi-chat-panel') as HTMLElement;

    for (const utility of [
      'top-0',
      'h-[100dvh]',
      'max-h-none',
      'rounded-none',
      'box-border',
      'pt-[env(safe-area-inset-top)]',
      'pb-[env(safe-area-inset-bottom)]',
      'md:top-auto',
      'md:right-6',
      'md:inset-x-auto',
      'md:bottom-24',
      'md:h-[600px]',
      'md:max-h-[calc(100dvh-9rem)]',
      'md:w-[380px]',
      'md:rounded-3xl',
      'md:pt-0',
      'md:pb-0',
    ]) {
      expect(panel.classList).toContain(utility);
    }

    expect(panel.classList).not.toContain('bottom-40');
  });

  it('uses adaptive logo separation and dark-aware header controls', () => {
    const root = fixture.nativeElement as HTMLElement;
    const logo = root.querySelector('img[src="assets/logos/rumi_logo.svg"]')?.parentElement as HTMLElement;
    const controls = root.querySelectorAll('header button');

    expect(logo.classList).toContain('bg-sunken-alt');
    expect(logo.classList).toContain('border-hairline');
    expect(logo.classList).toContain('p-0.5');
    expect(controls).toHaveLength(2);
    for (const control of controls) {
      expect(control.classList).toContain('text-ink');
      expect(control.classList).not.toContain('dark:text-brand-light');
      expect(control.classList).toContain('hover:bg-sunken');
    }
  });

  it('makes Close and Minimize explicitly disabled while a voice session is active', () => {
    voice.isActive.set(true);
    voice.surface.set('floating-panel');
    fixture.detectChanges();

    for (const label of ['Close Rumi AI chat', 'Minimize Rumi AI chat']) {
      const button = headerButton(label);
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect(button.getAttribute('title')).toBe('End the voice session first');
      expect(button.classList).toContain('opacity-50');
      expect(button.classList).toContain('cursor-not-allowed');
      const hint = (fixture.nativeElement as HTMLElement).querySelector(`#${button.getAttribute('aria-describedby')}`);
      expect(hint?.textContent).toContain('End the voice session first');
      button.click();
    }
    expect(chatStore.requestClose).not.toHaveBeenCalled();
    expect(chatStore.minimize).not.toHaveBeenCalled();
  });

  it('leaves Close and Minimize enabled when no voice session is active', () => {
    const close = headerButton('Close Rumi AI chat');
    expect(close.hasAttribute('aria-disabled')).toBe(false);
    expect(close.hasAttribute('title')).toBe(false);

    close.click();
    headerButton('Minimize Rumi AI chat').click();

    expect(chatStore.requestClose).toHaveBeenCalledOnce();
    expect(chatStore.minimize).toHaveBeenCalledOnce();
  });

  it('ends the voice session on Escape even when focus is outside the voice overlay', async () => {
    voice.isActive.set(true);
    voice.surface.set('floating-panel');
    fixture.detectChanges();
    const outside = headerButton('Close Rumi AI chat');
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });

    outside.dispatchEvent(escape);
    await fixture.whenStable();

    expect(escape.defaultPrevented).toBe(true);
    expect(voice.end).toHaveBeenCalledOnce();
    expect(voice.restoreFocus).toHaveBeenCalled();
    expect(chatStore.requestClose).not.toHaveBeenCalled();
  });

  it('closes the panel on Escape when no voice session is active', () => {
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });

    headerButton('Minimize Rumi AI chat').dispatchEvent(escape);

    expect(escape.defaultPrevented).toBe(true);
    expect(voice.end).not.toHaveBeenCalled();
    expect(chatStore.requestClose).toHaveBeenCalledOnce();
  });
});
