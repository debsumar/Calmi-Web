// @vitest-environment jsdom
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  LucideArrowRight,
  LucideBrain,
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

  it('renders the safe-space preview and trust points', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.textContent).toContain('A safe space to be you.');
    expect(root.textContent).toContain('Hi there, I’m Rumi.');
    expect(root.querySelectorAll('app-chat-message')).toHaveLength(4);
    expect(root.querySelector('app-chat-typing')).not.toBeNull();
    expect(root.textContent).toContain('Private & Secure');
    expect(root.textContent).toContain('Backed by Science');
    expect(root.textContent).toContain('Available Anytime');
    expect(root.textContent).toContain('Made for You');
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
