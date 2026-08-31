// @vitest-environment jsdom
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  LucideArrowDown,
  LucideArrowRight,
  LucideAudioLines,
  LucideBrain,
  LucideCircleAlert,
  LucideHandHeart,
  LucideHeart,
  LucideLeaf,
  LucideLightbulb,
  LucideMoon,
  LucideLock,
  LucideClock,
  LucideUser,
  LucideUserCircle,
  LucideSparkles,
  LucideSend,
  LucideMic,
  LucideSprout,
  LucideX,
  LucideBot,
  LucideCheckCheck,
  provideLucideIcons,
} from '@lucide/angular';
import { beforeEach, describe, expect, it } from 'vitest';
import { ChatStoreService } from '@/features/chat/services/chat-store.service';
import { RUMI_SUPPORT_TOPICS } from '@/features/rumi-ai/data/rumi-ai.data';
import { RumiAiComponent } from './rumi-ai.component';

describe('RumiAiComponent', () => {
  let fixture: ComponentFixture<RumiAiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RumiAiComponent],
      providers: [
        provideRouter([]),
        provideLucideIcons(
          LucideArrowRight,
          LucideHeart,
          LucideLeaf,
          LucideLightbulb,
          LucideBrain,
          LucideSprout,
          LucideHandHeart,
          LucideMoon,
          LucideLock,
          LucideClock,
          LucideUser,
          LucideUserCircle,
          LucideSparkles,
          LucideSend,
          LucideMic,
          // Icons pulled in by the embedded app-chat-conversation.
          LucideAudioLines,
          LucideArrowDown,
          LucideCircleAlert,
          LucideBot,
          LucideCheckCheck,
          LucideX,
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RumiAiComponent);
    fixture.detectChanges();
  });

  it('renders the Rumi hero and help-card copy', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('h1')?.textContent).toContain('Your mindful AI');
    expect(root.querySelector('h1')?.textContent).toContain('companion.');
    expect(root.textContent).toContain('Talk, reflect, and feel better with Rumi - anytime, anywhere.');
    expect(root.textContent).toContain('Always here to listen');
    expect(root.textContent).toContain('Private and judgment free');
    expect(root.textContent).toContain('Evidence-based guidance');
    expect(root.querySelector('button')?.textContent).toContain('Start Conversation');
    expect(root.querySelectorAll('article[data-help-card]')).toHaveLength(3);
    expect(root.textContent).toContain('Share whatever is on your mind without any judgment.');
    expect(root.textContent).toContain('Get simple, science-backed techniques to manage difficult emotions.');
    expect(root.textContent).toContain('Reflect and understand your thoughts, patterns and emotions.');
  });

  it('opens the chat panel when the hero CTA is clicked', () => {
    const chatStore = TestBed.inject(ChatStoreService);
    const root = fixture.nativeElement as HTMLElement;
    const cta = root.querySelector('button[data-testid="hero-cta"]') as HTMLButtonElement;

    expect(cta.textContent).toContain('Start Conversation');
    expect(chatStore.isOpen()).toBe(false);
    cta.click();
    fixture.detectChanges();

    expect(chatStore.isOpen()).toBe(true);
  });

  it('renders the guided support topics', () => {
    const root = fixture.nativeElement as HTMLElement;
    const topicButtons = root.querySelectorAll('button[data-topic]');

    expect(root.textContent).toContain('Guided support, whenever needed!');
    expect(topicButtons).toHaveLength(4);
    expect(root.textContent).toContain('Anxiety relief');
    expect(root.textContent).toContain('Stress management');
    expect(root.textContent).toContain('Low-mood support');
    expect(root.textContent).toContain('Sleep troubles');
  });

  it('seeds the composer draft and opens chat for every topic card', () => {
    const chatStore = TestBed.inject(ChatStoreService);
    const root = fixture.nativeElement as HTMLElement;

    for (const topic of RUMI_SUPPORT_TOPICS) {
      chatStore.setDraft('');
      chatStore.close();

      const card = root.querySelector(`button[data-topic="${topic.id}"]`) as HTMLButtonElement;
      expect(card).not.toBeNull();
      card.click();
      fixture.detectChanges();

      expect(chatStore.isOpen()).toBe(true);
      expect(chatStore.draft()).toBe(topic.prompt);
    }
  });

  it('renders the safe-space live conversation and trust points', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.textContent).toContain('A safe space to be you.');
    expect(root.textContent).toContain('Hi there, I’m Rumi.');
    // The static preview was replaced by the live shared-store conversation.
    const conversation = root.querySelector('app-chat-conversation') as HTMLElement | null;
    expect(conversation).not.toBeNull();
    expect(root.querySelector('app-chat-conversation[data-variant="embedded"]')).toBe(conversation);
    expect(getComputedStyle(conversation!).getPropertyValue('min-block-size')).toBe('40rem');
    expect(root.querySelector('figure.rumi-conversation-figure')).not.toBeNull();
    const firstMessage = root.querySelector('app-chat-message article') as HTMLElement | null;
    expect(firstMessage).not.toBeNull();
    expect(firstMessage?.classList).toContain('stagger-enter');
    expect(firstMessage?.style.getPropertyValue('--index')).toBe('0');
    expect(root.querySelector('textarea')).not.toBeNull();
    expect(root.textContent).toContain('Private & Secure');
    expect(root.textContent).toContain('Backed by Science');
    expect(root.textContent).toContain('Available Anytime');
    expect(root.textContent).toContain('Made for You');
  });

  it('keeps embedded composer opaque and free of floating glass classes', () => {
    const form = fixture.nativeElement.querySelector('app-chat-conversation form') as HTMLFormElement;

    expect(form).not.toBeNull();
    expect(form.classList).toContain('bg-surface');
    expect(form.classList).not.toContain('bg-glass');
    expect(form.classList).not.toContain('backdrop-blur-xl');
  });

  it('renders geometry for every Rumi icon', () => {
    const root = fixture.nativeElement as HTMLElement;
    const icons = root.querySelectorAll('svg');

    expect(icons.length).toBeGreaterThanOrEqual(12);
    icons.forEach((icon) => {
      expect(icon.querySelector('path, line, circle, polyline, rect')).not.toBeNull();
    });
  });
});
