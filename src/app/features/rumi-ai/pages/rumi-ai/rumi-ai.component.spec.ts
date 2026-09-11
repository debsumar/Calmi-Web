// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import { Component, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, RouterLink, RouterOutlet, Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  LucideArrowDown,
  LucideArrowRight,
  LucideAudioLines,
  LucideFlaskConical,
  LucideBrain,
  LucideCircleAlert,
  LucideHandHeart,
  LucideHeartCrack,
  LucideHeart,
  LucideLeaf,
  LucideLightbulb,
  LucideMoon,
  LucideLock,
  LucideClock,
  LucideUser,
  LucideCircleUser,
  LucideSparkles,
  LucideSend,
  LucideMic,
  LucideSprout,
  LucideX,
  LucideBot,
  LucideCheckCheck,
  LucideMinus,
  LucideDynamicIcon,
  provideLucideIcons,
} from '@lucide/angular';
import { ChatStoreService } from '@/features/chat/services/chat-store.service';
import { ChatWidgetComponent } from '@/features/chat/chat-widget.component';
import { RUMI_SUPPORT_TOPICS } from '@/features/rumi-ai/data/rumi-ai.data';
import { ScrollPositionService } from '@/core/services/scroll-position.service';
import { AppLayout } from '@/layout/components/app.layout';
import { RumiAiComponent } from './rumi-ai.component';
import { provideAuthServiceStub } from '@/core/services/testing/auth.service.stub';

describe('RumiAiComponent', () => {
  let fixture: ComponentFixture<RumiAiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RumiAiComponent],
      providers: [
        provideAuthServiceStub(),
        provideRouter([]),
        provideLucideIcons(
          LucideArrowRight,
          LucideHeart,
          LucideLeaf,
          LucideLightbulb,
          LucideBrain,
          LucideFlaskConical,
          LucideSprout,
          LucideHandHeart,
          LucideHeartCrack,
          LucideMoon,
          LucideLock,
          LucideClock,
          LucideUser,
          LucideCircleUser,
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

  it('keeps the design preview untouched when the floating chat opens', async () => {
    const chatStore = TestBed.inject(ChatStoreService);
    const preview = fixture.nativeElement.querySelector('app-rumi-chat-preview');

    expect(preview).not.toBeNull();
    chatStore.open();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(chatStore.isOpen()).toBe(true);
    expect(fixture.nativeElement.querySelector('app-rumi-chat-preview')).toBe(preview);
    // The page surface is no longer a conversation: no live transcript, no log region.
    expect(fixture.nativeElement.querySelector('app-chat-conversation')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="log"]')).toBeNull();
  });

  it('shows a scripted exchange that ignores the shared chat store', async () => {
    const chatStore = TestBed.inject(ChatStoreService);
    chatStore.setDraft('typed elsewhere');
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('app-rumi-chat-preview')).toHaveLength(1);
    expect(root.querySelectorAll('app-chat-message')).toHaveLength(0);
    expect(root.textContent).toContain('Hi there, I’m Rumi. How are you feeling today?');
    expect(root.textContent).toContain('Honestly, a bit anxious.');
    expect(root.textContent).toContain('what feels heaviest right now?');
    expect(root.textContent).not.toContain('typed elsewhere');
  });

  it('uses shared chat state when the hero CTA is clicked', () => {
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

  it('renders the safe-space preview card and trust points', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.textContent).toContain('A safe space to be you.');
    expect(root.textContent).toContain('Hi there, I’m Rumi.');
    const preview = root.querySelector('app-rumi-chat-preview') as HTMLElement | null;
    expect(preview).not.toBeNull();
    expect(getComputedStyle(preview!).getPropertyValue('min-block-size')).toBe('40rem');
    expect(root.querySelector('figure.rumi-conversation-figure')).not.toBeNull();
    expect(root.textContent).toContain('Private & Secure');
    expect(root.textContent).toContain('Backed by Science');
    expect(root.textContent).toContain('Available Anytime');
    expect(root.textContent).toContain('Made for You');
  });

  it('makes the preview inert: nothing to click, type in, or tab into', () => {
    const root = fixture.nativeElement as HTMLElement;
    const preview = root.querySelector('app-rumi-chat-preview') as HTMLElement;
    const inertBlock = preview.querySelector('.rumi-chat-preview') as HTMLElement;

    expect(inertBlock.hasAttribute('inert')).toBe(true);
    expect(inertBlock.getAttribute('aria-hidden')).toBe('true');
    expect(preview.querySelectorAll('button, a, textarea, input, [tabindex], [contenteditable]')).toHaveLength(0);
    // Chips and composer keep full contrast: this reads as a finished chat, not a disabled one.
    expect(inertBlock.className).not.toContain('opacity-');
    // The text alternative stays readable to assistive tech.
    expect(preview.querySelector('.sr-only')?.textContent).toContain('Preview of a conversation with Rumi AI');
  });

  it('shows the placeholder but hides suggestion chips after the scripted user message', () => {
    const preview = fixture.nativeElement.querySelector('app-rumi-chat-preview') as HTMLElement;

    expect(preview.textContent).toContain("Share what's on your mind...");
    expect(preview.textContent).not.toContain('I feel anxious');
    expect(preview.textContent).not.toContain('Help me sleep');
    expect(preview.textContent).not.toContain('Guide a breathing exercise');
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


@Component({
  selector: 'app-topbar',
  standalone: true,
  template: '<header>Test topbar</header>',
})
class IntegrationTestTopbar {}

const rumiIntegrationRoutes: Routes = [
  {
    path: '',
    component: AppLayout,
    children: [{ path: 'rumi-ai', component: RumiAiComponent }],
  },
];

describe('RumiAiComponent in the production layout', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideAuthServiceStub(),
        provideZonelessChangeDetection(),
        provideRouter(rumiIntegrationRoutes),
        provideLucideIcons(
          LucideArrowRight,
          LucideHeart,
          LucideLeaf,
          LucideLightbulb,
          LucideBrain,
          LucideFlaskConical,
          LucideSprout,
          LucideHandHeart,
          LucideHeartCrack,
          LucideMoon,
          LucideLock,
          LucideClock,
          LucideUser,
          LucideCircleUser,
          LucideSparkles,
          LucideSend,
          LucideMic,
          LucideAudioLines,
          LucideArrowDown,
          LucideCircleAlert,
          LucideBot,
          LucideCheckCheck,
          LucideX,
          // Pulled in by the floating chat panel header on the Rumi page.
          LucideMinus,
        ),
        { provide: ScrollPositionService, useValue: {} },
      ],
    });

    TestBed.overrideComponent(AppLayout, {
      set: {
        imports: [RouterOutlet, RouterLink, LucideDynamicIcon, IntegrationTestTopbar, ChatWidgetComponent],
      },
    });

    await TestBed.compileComponents();
  });

  it('keeps the static preview and opens the working floating chat from the Rumi CTA', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/rumi-ai');
    await harness.fixture.whenStable();

    const root = harness.fixture.nativeElement as HTMLElement;
    const chatStore = TestBed.inject(ChatStoreService);
    const initialMessageMetadata = chatStore.messages().map(({ id, timestamp }) => ({ id, timestamp }));
    const preview = root.querySelector('app-rumi-chat-preview');
    const cta = root.querySelector('button[data-testid="hero-cta"]') as HTMLButtonElement;

    expect(preview).not.toBeNull();
    expect(root.querySelector('#rumi-chat-bubble')).not.toBeNull();

    cta.click();
    await harness.fixture.whenStable();

    expect(chatStore.isOpen()).toBe(true);
    expect(chatStore.messages().map(({ id, timestamp }) => ({ id, timestamp }))).toEqual(initialMessageMetadata);
    expect(root.querySelector('app-rumi-chat-preview')).toBe(preview);
    expect(root.querySelector('#rumi-chat-bubble')).not.toBeNull();
    // Only the floating panel is a real conversation, and it has a working composer.
    expect(root.querySelectorAll('[role="log"][aria-label="Conversation with Rumi AI in the floating chat"]')).toHaveLength(1);
    expect(root.querySelectorAll('[role="log"][aria-label="Conversation with Rumi AI on the Rumi AI page"]')).toHaveLength(0);
    expect(root.querySelector('app-chat-panel textarea')).not.toBeNull();
  });
});
