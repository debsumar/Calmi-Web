// @vitest-environment jsdom
import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LucideDynamicIcon, LucideMinus, LucideX, provideLucideIcons } from '@lucide/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatStoreService } from '../../services/chat-store.service';
import { VoiceSessionService } from '../../services/voice-session.service';
import { ChatPanelComponent } from './chat-panel.component';

const chatStore = {
  isOpen: signal(true),
  isClosing: signal(false),
  isMinimized: signal(false),
};

const voice = {
  isActive: signal(false),
  endForSurface: vi.fn(),
};

describe('ChatPanelComponent', () => {
  let fixture: ComponentFixture<ChatPanelComponent>;

  beforeEach(async () => {
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
      expect(control.classList).toContain('dark:text-brand-light');
      expect(control.classList).toContain('hover:bg-sunken');
    }
  });
});
