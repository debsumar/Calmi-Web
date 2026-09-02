// @vitest-environment jsdom
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  LucideBot,
  LucideCheckCheck,
  LucideCircleAlert,
  LucideUser,
  provideLucideIcons,
} from '@lucide/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';
import { AuthService } from '@/core/services/auth.service';
import { ChatMessage } from '../../models/chat-message.model';
import { ChatStoreService } from '../../services/chat-store.service';
import { ChatMessageComponent } from './chat-message.component';

describe('ChatMessageComponent', () => {
  let fixture: ComponentFixture<ChatMessageComponent>;
  const retry = vi.fn();
  const currentUser = signal<{ user_metadata?: Record<string, unknown> } | null>(null);

  const message = (overrides: Partial<ChatMessage>): ChatMessage => ({
    id: 'message-1',
    role: 'ai',
    text: 'A supportive message',
    timestamp: new Date('2026-08-31T00:00:00Z'),
    status: 'sent',
    ...overrides,
  });

  const render = (value: ChatMessage): HTMLElement => {
    fixture.componentRef.setInput('message', value);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    retry.mockReset();
    currentUser.set(null);
    await TestBed.configureTestingModule({
      imports: [ChatMessageComponent],
      providers: [
        provideLucideIcons(LucideBot, LucideCheckCheck, LucideUser, LucideCircleAlert),
        { provide: ChatStoreService, useValue: { retry } },
        { provide: AuthService, useValue: { currentUser } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ChatMessageComponent);
  });

  it('gates shared stagger entry and carries the provided stable index', () => {
    fixture.componentRef.setInput('message', message({ role: 'ai' }));
    fixture.componentRef.setInput('animate', false);
    fixture.componentRef.setInput('entranceIndex', 0);
    fixture.detectChanges();

    let article = fixture.nativeElement.querySelector('article') as HTMLElement;
    expect(article.classList).not.toContain('stagger-enter');

    fixture.componentRef.setInput('animate', true);
    fixture.componentRef.setInput('entranceIndex', 4);
    fixture.detectChanges();

    article = fixture.nativeElement.querySelector('article') as HTMLElement;
    expect(article.classList).toContain('stagger-enter');
    expect(article.style.getPropertyValue('--index')).toBe('4');
  });
  it('renders AI messages with decorative Rumi logo avatar and brand bubble', () => {
    const root = render(message({ role: 'ai', status: 'streaming' }));
    const article = root.querySelector('article');
    const avatar = root.querySelector('[data-icon="rumi-logo"]');
    const bubble = root.querySelector('.bg-brand');

    expect(article?.classList).toContain('self-start');
    expect(article?.classList).toContain('gap-3');
    expect(avatar).not.toBeNull();
    expect(avatar?.getAttribute('src')).toBe('assets/logos/rumi_logo.svg');
    expect(avatar?.getAttribute('alt')).toBe('');
    expect(avatar?.parentElement?.classList).toContain('h-8');
    expect(avatar?.parentElement?.classList).toContain('w-8');
    expect(avatar?.parentElement?.classList).toContain('border-hairline');
    expect(avatar?.parentElement?.classList).toContain('bg-brand-light');
    expect(avatar?.parentElement?.classList).toContain('dark:bg-sunken-alt');
    expect(avatar?.parentElement?.classList).toContain('p-0.5');
    expect(avatar?.parentElement?.getAttribute('aria-hidden')).toBe('true');
    expect(avatar?.parentElement?.hasAttribute('tabindex')).toBe(false);
    expect(bubble?.classList).toContain('text-on-brand');
    expect(bubble?.classList).toContain('rounded-bl-md');
    expect(root.querySelector('time')?.classList).toContain('text-ink-muted');
  });

  it('renders markdown inside the AI bubble without changing the bubble layout', () => {
    const root = render(message({ role: 'ai', text: '**calm**\nTake one breath.' }));
    const bubble = root.querySelector('.bg-brand');

    expect(bubble?.querySelector('strong')?.textContent).toBe('calm');
    expect(bubble?.querySelector('br')).not.toBeNull();
    expect(bubble?.querySelector('img')).toBeNull();
  });

  it('shows the signed-in https photo on own messages and falls back to the user icon', () => {
    currentUser.set({ user_metadata: { avatar_url: 'https://lh3.googleusercontent.com/a/photo.jpg' } });
    let root = render(message({ role: 'user', status: 'sent', text: 'hi' }));
    const photo = root.querySelector<HTMLImageElement>('article img');

    expect(photo?.getAttribute('src')).toBe('https://lh3.googleusercontent.com/a/photo.jpg');
    expect(photo?.getAttribute('alt')).toBe('');
    expect(root.querySelector('[data-icon="user"]')).toBeNull();

    // A broken remote photo must degrade to the icon rather than an empty circle.
    photo?.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-icon="user"]')).not.toBeNull();

    currentUser.set({ user_metadata: { avatar_url: 'javascript:alert(1)' } });
    root = render(message({ role: 'user', status: 'sent', text: 'hi' }));
    expect(root.querySelector('article img')).toBeNull();
    expect(root.querySelector('[data-icon="user"]')).not.toBeNull();
  });

  it('formats a creation timestamp as local short time', async () => {
    const timestamp = new Date(2026, 7, 31, 15, 28);
    fixture.componentRef.setInput('message', message({ timestamp }));

    await fixture.whenStable();

    const time = fixture.nativeElement.querySelector('time') as HTMLTimeElement;
    expect(time.getAttribute('dateTime')).toBe(timestamp.toISOString());
    expect(time.textContent?.replace(/\s+/g, ' ')).toContain('3:28 PM');
  });

  it('renders sent user messages with an adaptive muted surface and check-check cue', () => {
    const root = render(message({ role: 'user', status: 'sent', text: 'I feel calmer' }));
    const article = root.querySelector('article');
    const avatar = root.querySelector('[data-icon="user"]');
    const bubble = root.querySelector('.rounded-br-md');

    expect(article?.classList).toContain('self-end');
    expect(article?.classList).toContain('gap-3');
    expect(avatar).not.toBeNull();
    expect(avatar?.parentElement?.classList).toContain('h-8');
    expect(avatar?.parentElement?.classList).toContain('w-8');
    expect(avatar?.parentElement?.classList).toContain('bg-sunken-alt');
    expect(avatar?.parentElement?.classList).toContain('dark:text-brand-light');
    expect(avatar?.parentElement?.getAttribute('aria-hidden')).toBe('true');
    expect(avatar?.parentElement?.hasAttribute('tabindex')).toBe(false);
    expect(bubble?.classList).toContain('border-hairline');
    expect(bubble?.classList).toContain('bg-brand-light');
    expect(bubble?.classList).toContain('dark:bg-sunken-alt');
    expect(bubble?.classList).toContain('text-ink');
    expect(bubble?.classList).toContain('rounded-br-md');
    expect(root.querySelector('[data-icon="check-check"]')).not.toBeNull();
    expect(root.querySelector('time')?.classList).toContain('text-ink-muted');
  });

  it('does not render sent cue for non-sent user status', () => {
    const root = render(message({ role: 'user', status: 'sending' }));

    expect(root.querySelector('[data-icon="check-check"]')).toBeNull();
  });

  it('keeps system messages as centered informational banners', () => {
    const root = render(message({ role: 'system', text: 'Conversation ready' }));
    const article = root.querySelector('article');

    expect(article?.classList).toContain('w-full');
    expect(article?.classList).toContain('self-center');
    expect(article?.classList).toContain('bg-sunken-alt');
    expect(article?.classList).toContain('border-hairline');
    expect(root.querySelector('[data-icon="bot"]')).toBeNull();
    expect(root.querySelector('[data-icon="user"]')).toBeNull();
  });

  it('exposes error retry as an alert with an accessible 44px action', () => {
    const root = render(message({ role: 'user', status: 'error' }));
    const alert = root.querySelector('[role="alert"]');
    const button = alert?.querySelector('button') as HTMLButtonElement;

    expect(alert).not.toBeNull();
    expect(button?.textContent).toContain('Retry');
    expect(button?.getAttribute('type')).toBe('button');
    expect(button?.classList).toContain('min-h-11');
    button.click();
    expect(retry).toHaveBeenCalledWith('message-1');
  });
});
