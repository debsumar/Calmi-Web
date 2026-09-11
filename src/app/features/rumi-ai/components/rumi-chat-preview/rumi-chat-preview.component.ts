import { DatePipe } from '@angular/common';
import {
  afterNextRender,
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

/** One line of the hardcoded Rumi preview transcript. */
interface PreviewMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

type PreviewPhase =
  | 'empty'
  | 'greeting'
  | 'typing'
  | 'sending'
  | 'user'
  | 'rumi-typing'
  | 'reply'
  | 'resetting'
  | 'final';

const GREETING_TEXT = 'Hi there, I’m Rumi. How are you feeling today?';
const USER_REPLY_TEXT = 'Honestly, a bit anxious. Work has been piling up and I can’t switch off at night.';
const RUMI_REPLY_TEXT = 'That sounds exhausting — carrying the day into the night leaves no room to rest. Let’s take one thing at a time: what feels heaviest right now?';

/** Minutes each scripted line sits after the cycle's start, so the clock reads naturally. */
const GREETING_OFFSET_MS = 0;
const USER_REPLY_OFFSET_MS = 60_000;
const RUMI_REPLY_OFFSET_MS = 75_000;

/**
 * Non-interactive, scripted design preview for the Rumi AI landing page.
 * The real chat remains the floating chat panel; this component never owns chat state.
 */
@Component({
  selector: 'app-rumi-chat-preview',
  standalone: true,
  imports: [DatePipe, LucideDynamicIcon],
  host: {
    class: 'relative flex min-h-0 flex-1 flex-col overflow-hidden text-base',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="sr-only">
      Preview of a conversation with Rumi AI. Open the Rumi AI chat button in
      the corner of the page to talk to Rumi yourself.
    </p>

    <!-- inert: no clicks, no focus, no typing. Full opacity is deliberate — this
         reads as a finished chat, not a disabled one. -->
    <div
      class="rumi-chat-preview flex min-h-0 flex-1 flex-col"
      [class.rumi-chat-preview--animated]="animationEnabled()"
      [class.rumi-chat-preview--resetting]="phase() === 'resetting'"
      inert
      aria-hidden="true"
    >
      <div
        #transcript
        class="rumi-chat-preview__transcript flex min-h-0 flex-1 flex-col justify-end gap-3 overflow-y-auto px-4 py-3"
      >
        @if (!messages().length) {
          <div
            class="flex flex-1 flex-col items-center justify-center gap-3 text-center text-base text-ink-soft"
            data-preview-empty-state
          >
            <span
              class="flex h-12 w-12 items-center justify-center rounded-full bg-sunken-alt"
              aria-hidden="true"
            ></span>
            <p>Take a gentle moment. I am here to listen.</p>
          </div>
        }

        @for (message of messages(); track message.id) {
          @if (message.role === 'ai') {
            <div
              class="rumi-chat-preview__message flex max-w-[85%] items-start gap-3 self-start"
              [attr.data-preview-message]="message.id"
            >
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-hairline bg-brand-light p-0.5"
              >
                <img
                  src="assets/logos/rumi_logo.svg"
                  alt=""
                  class="h-5 w-5 object-contain"
                />
              </span>
              <div class="min-w-0 flex-1">
                <div
                  class="rounded-2xl rounded-bl-md border border-hairline bg-elevated px-4 py-2.5 text-base text-ink"
                >
                  <p class="whitespace-pre-wrap break-words">
                    {{ message.text }}
                  </p>
                </div>
                <time
                  class="mt-1 block text-xs text-ink-muted"
                  [dateTime]="message.timestamp.toISOString()"
                >
                  {{ message.timestamp | date: 'shortTime' }}
                </time>
              </div>
            </div>
          } @else {
            <div
              class="rumi-chat-preview__message flex max-w-[85%] flex-row-reverse items-start gap-3 self-end"
              [attr.data-preview-message]="message.id"
            >
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunken-alt text-ink"
              >
                <svg [lucideIcon]="'user'" [size]="20"></svg>
              </span>
              <div class="min-w-0 flex-1">
                <div
                  class="rounded-2xl rounded-br-md border border-hairline bg-brand px-4 py-2.5 text-base text-on-brand"
                >
                  <p class="whitespace-pre-wrap break-words">
                    {{ message.text }}
                  </p>
                </div>
                <time
                  class="mt-1 block text-right text-xs text-ink-muted"
                  [dateTime]="message.timestamp.toISOString()"
                >
                  {{ message.timestamp | date: 'shortTime' }}
                  <svg
                    [lucideIcon]="'check-check'"
                    [size]="14"
                    class="ml-1 inline-block align-text-bottom"
                  ></svg>
                </time>
              </div>
            </div>
          }
        }

        @if (phase() === 'rumi-typing') {
          <div class="flex self-start items-start gap-3" data-preview-typing>
            <span class="h-8 w-8 shrink-0" aria-hidden="true"></span>
            <span
              class="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-hairline bg-elevated px-4 py-3"
              aria-hidden="true"
            >
              @for (dot of dots; track dot) {
                <span
                  class="rumi-chat-preview__typing-dot h-2 w-2 rounded-full bg-brand-soft"
                  [style.animation-delay.ms]="dot * 180"
                ></span>
              }
            </span>
          </div>
        }
      </div>

      <!-- Suggestion chips and composer: spans, not buttons or textareas. -->
      @if (!hasUserMessage()) {
        <div class="shrink-0 px-4 pb-3">
          <div class="flex flex-wrap gap-2">
            @for (prompt of suggestions; track prompt) {
            <span
              class="inline-flex min-h-11 items-center rounded-full border border-hairline bg-surface px-3 py-2 text-xs font-semibold text-ink shadow-card"
            >
              {{ prompt }}
            </span>
            }
          </div>
        </div>
      }

      <div class="shrink-0 border-t border-hairline bg-surface p-3">
        <div
          class="flex items-end gap-2 rounded-full border border-hairline bg-surface px-2 py-1.5"
        >
          <span
            data-preview-composer
            class="min-h-11 min-w-0 flex-1 px-1 py-2 text-base text-ink"
          >
            @if (composerText()) {
              {{ composerText()
              }}<span
                class="rumi-chat-preview__caret"
                [class.rumi-chat-preview__caret--visible]="phase() === 'typing'"
                aria-hidden="true"
              ></span>
            } @else {
              <span class="text-ink-muted">Share what's on your mind...</span>
            }
          </span>
          <span
            class="inline-flex h-11 w-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface text-ink"
          >
            <svg [lucideIcon]="'audio-lines'" [size]="18"></svg>
          </span>
          <span
            data-preview-send
            class="rumi-chat-preview__send inline-flex h-11 w-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-brand text-on-brand"
            [class.rumi-chat-preview__send--pulsing]="phase() === 'sending'"
          >
            <svg [lucideIcon]="'send'" [size]="18"></svg>
          </span>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      flex: 0 0 auto;
      min-block-size: 40rem;
      block-size: clamp(40rem, 72dvh, 44rem);
    }

    @media (max-width: 47.999rem), (max-height: 43.75rem) {
      :host {
        flex: 1 1 auto;
        min-block-size: 0;
        block-size: auto;
        max-block-size: none;
      }
    }

    /* The inert attribute already blocks input; this covers engines without it. */
    .rumi-chat-preview {
      cursor: default;
      pointer-events: none;
      user-select: none;
    }

    .rumi-chat-preview--animated .rumi-chat-preview__message {
      animation: rumiPreviewMessageIn 240ms ease-out both;
    }

    .rumi-chat-preview__caret {
      display: inline-block;
      block-size: 1.1em;
      border-inline-end: 2px solid currentColor;
      margin-inline-start: 1px;
      vertical-align: -0.15em;
    }

    .rumi-chat-preview__caret--visible {
      animation: rumiPreviewCaret 760ms step-end infinite;
    }

    .rumi-chat-preview__send--pulsing {
      animation: rumiPreviewSend 320ms ease-in-out both;
    }

    .rumi-chat-preview__typing-dot {
      animation: rumiPreviewTypingDot 1.4s ease-in-out infinite;
    }

    .rumi-chat-preview--resetting .rumi-chat-preview__transcript {
      animation: rumiPreviewReset 260ms ease-in both;
    }

    @keyframes rumiPreviewMessageIn {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes rumiPreviewCaret {
      50% {
        border-color: transparent;
      }
    }

    @keyframes rumiPreviewSend {
      50% {
        transform: scale(0.9);
      }
    }

    @keyframes rumiPreviewTypingDot {
      0%,
      60%,
      100% {
        transform: translateY(0);
      }
      30% {
        transform: translateY(-4px);
      }
    }

    @keyframes rumiPreviewReset {
      to {
        opacity: 0;
        transform: translateY(-4px);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .rumi-chat-preview__message,
      .rumi-chat-preview__caret--visible,
      .rumi-chat-preview__send--pulsing,
      .rumi-chat-preview__typing-dot,
      .rumi-chat-preview--resetting .rumi-chat-preview__transcript {
        animation: none;
      }
    }
  `,
})
export class RumiChatPreviewComponent implements AfterViewInit {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly transcript = viewChild<ElementRef<HTMLElement>>('transcript');
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private observer: IntersectionObserver | undefined;

  readonly phase = signal<PreviewPhase>('final');
  readonly composerText = signal('');
  readonly isVisible = signal(false);
  readonly animationEnabled = signal(false);
  /** Start of the current scripted cycle; the bubble times are offsets from it. */
  private readonly cycleStartedAt = signal(new Date());
  /** False while the tab is in the background, so a hidden page runs no timers. */
  private readonly pageVisible = signal(true);
  readonly dots = [0, 1, 2];
  readonly suggestions: readonly string[] = [
    'I feel anxious',
    'Help me sleep',
    'Guide a breathing exercise',
  ];
  readonly messages = computed<readonly PreviewMessage[]>(() => {
    const startedAt = this.cycleStartedAt().getTime();
    const greeting: PreviewMessage = {
      id: 'preview-welcome',
      role: 'ai',
      text: GREETING_TEXT,
      timestamp: new Date(startedAt + GREETING_OFFSET_MS),
    };
    const userReply: PreviewMessage = {
      id: 'preview-user',
      role: 'user',
      text: USER_REPLY_TEXT,
      timestamp: new Date(startedAt + USER_REPLY_OFFSET_MS),
    };
    const rumiReply: PreviewMessage = {
      id: 'preview-reply',
      role: 'ai',
      text: RUMI_REPLY_TEXT,
      timestamp: new Date(startedAt + RUMI_REPLY_OFFSET_MS),
    };

    switch (this.phase()) {
      case 'greeting':
      case 'typing':
      case 'sending':
        return [greeting];
      case 'user':
      case 'rumi-typing':
        return [greeting, userReply];
      case 'reply':
      case 'resetting':
      case 'final':
        return [greeting, userReply, rumiReply];
      default:
        return [];
    }
  });
  readonly hasUserMessage = computed(() =>
    this.messages().some((message) => message.role === 'user'),
  );

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.clearTimers();
      this.observer?.disconnect();
    });
  }

  ngAfterViewInit(): void {
    this.scrollTranscriptToBottom();
    if (!this.supportsAnimation()) return;

    // If the observer cannot be created the preview stays on the finished
    // transcript rather than an empty card.
    try {
      this.observer = new window.IntersectionObserver((entries) => {
        this.setVisibility(entries.some((entry) => entry.isIntersecting));
      });
      this.observer.observe(this.host.nativeElement);
    } catch {
      this.observer = undefined;
      return;
    }

    this.watchPageVisibility();
    this.animationEnabled.set(true);
    this.phase.set('empty');
  }

  /** A background tab paints nothing; pausing there keeps the loop off the CPU. */
  private watchPageVisibility(): void {
    const view = globalThis.document;
    if (!view || typeof view.addEventListener !== 'function') return;

    const onVisibilityChange = () => {
      const visible = view.visibilityState !== 'hidden';
      if (this.pageVisible() === visible) return;
      this.pageVisible.set(visible);
      this.clearTimers();
      if (visible) this.continueLoop();
    };

    this.pageVisible.set(view.visibilityState !== 'hidden');
    view.addEventListener('visibilitychange', onVisibilityChange);
    this.destroyRef.onDestroy(() => view.removeEventListener('visibilitychange', onVisibilityChange));
  }

  private supportsAnimation(): boolean {
    if (
      typeof window === 'undefined' ||
      typeof window.IntersectionObserver !== 'function'
    )
      return false;
    return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  private setVisibility(visible: boolean): void {
    if (this.isVisible() === visible) return;

    this.isVisible.set(visible);
    this.clearTimers();
    if (visible) this.continueLoop();
  }

  private continueLoop(): void {
    if (!this.canRun()) return;

    switch (this.phase()) {
      case 'empty':
        this.schedule(() => {
          // Fresh clock per cycle: the bubbles read as "just now", not as the
          // moment the page happened to load.
          this.cycleStartedAt.set(new Date());
          this.advanceTo('greeting');
        }, 600);
        break;
      case 'greeting':
        this.schedule(() => this.advanceTo('typing'), 800);
        break;
      case 'typing':
        if (this.composerText().length < USER_REPLY_TEXT.length) {
          this.schedule(() => {
            this.composerText.update((text) =>
              USER_REPLY_TEXT.slice(0, text.length + 1),
            );
            this.continueLoop();
          }, 32);
        } else {
          this.schedule(() => this.advanceTo('sending'), 360);
        }
        break;
      case 'sending':
        this.schedule(() => {
          this.composerText.set('');
          this.advanceTo('user');
        }, 320);
        break;
      case 'user':
        this.schedule(() => this.advanceTo('rumi-typing'), 600);
        break;
      case 'rumi-typing':
        this.schedule(() => this.advanceTo('reply'), 1400);
        break;
      case 'reply':
        this.schedule(() => this.advanceTo('resetting'), 4000);
        break;
      case 'resetting':
        this.schedule(() => this.advanceTo('empty'), 260);
        break;
    }
  }

  private advanceTo(phase: PreviewPhase): void {
    this.phase.set(phase);
    this.scrollTranscriptToBottom();
    this.continueLoop();
  }

  private scrollTranscriptToBottom(): void {
    afterNextRender(
      {
        write: () => {
          const transcript = this.transcript()?.nativeElement;
          if (transcript) transcript.scrollTop = transcript.scrollHeight;
        },
      },
      { injector: this.injector },
    );
  }

  private canRun(): boolean {
    return this.animationEnabled() && this.isVisible() && this.pageVisible();
  }

  private schedule(callback: () => void, delay: number): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      if (this.canRun()) callback();
    }, delay);
    this.timers.add(timer);
  }

  private clearTimers(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
  }
}
