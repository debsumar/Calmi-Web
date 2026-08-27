// @vitest-environment jsdom
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { provideLucideIcons, LucideSend } from '@lucide/angular';
import { ChatComposerComponent } from './chat-composer.component';
import { ChatStoreService } from '../../services/chat-store.service';

describe('ChatComposerComponent', () => {
  let fixture: ComponentFixture<ChatComposerComponent>;
  let store: ChatStoreService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatComposerComponent],
      providers: [provideLucideIcons(LucideSend)],
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
});
