// @vitest-environment jsdom
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatSuggestionsComponent } from './chat-suggestions.component';
import { ChatStoreService } from '../../services/chat-store.service';

describe('ChatSuggestionsComponent', () => {
  let fixture: ComponentFixture<ChatSuggestionsComponent>;
  let store: ChatStoreService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatSuggestionsComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ChatSuggestionsComponent);
    store = TestBed.inject(ChatStoreService);
    store.reset();
    fixture.detectChanges();
  });

  it('renders all approved wrapping chips with semantic surface styling', () => {
    const root = fixture.nativeElement as HTMLElement;
    const container = root.querySelector('[aria-label="Suggested prompts"]') as HTMLElement;
    const buttons = [...root.querySelectorAll('button')];

    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      'I feel anxious',
      'Help me sleep',
      'Guide a breathing exercise',
    ]);
    expect(container.classList).toContain('flex-wrap');
    for (const button of buttons) {
      expect(button.classList).toContain('rounded-full');
      expect(button.classList).toContain('bg-surface');
      expect(button.classList).toContain('border-hairline');
      expect(button.classList).toContain('shadow-card');
      expect(button.classList).toContain('text-brand');
      expect(button.classList).toContain('dark:text-brand-light');
      expect(button.classList).toContain('font-semibold');
      expect(button.classList).toContain('min-h-11');
    }
  });

  it('sets and immediately sends selected prompt', () => {
    const setDraft = vi.spyOn(store, 'setDraft');
    const send = vi.spyOn(store, 'send');
    const button = [...fixture.nativeElement.querySelectorAll('button')]
      .find((candidate) => candidate.textContent?.includes('Help me sleep')) as HTMLButtonElement;

    button.click();

    expect(setDraft).toHaveBeenCalledWith('Help me sleep');
    expect(send).toHaveBeenCalledOnce();
    store.cancelPendingReply();
  });
});
