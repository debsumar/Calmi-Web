import { afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef, effect, inject, Injector, input, signal, viewChild } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { VoiceSessionService } from '../../services/voice-session.service';
import { ChatConversationSurface } from '../../services/voice-session.model';

@Component({
  selector: 'app-voice-session-overlay',
  standalone: true,
  imports: [LucideDynamicIcon],
  host: { class: 'font-sans' },
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (voice.isActive() && voice.surface() === surface()) {
      <div #overlay
           class="voice absolute inset-0 z-[5] flex flex-col items-center bg-voice-scrim text-brand-deep opacity-100 backdrop-blur-xl dark:text-brand-light"
           [class.is-listening]="voice.phase() === 'listening'"
           [class.is-thinking]="voice.phase() === 'thinking'"
           [class.is-speaking]="voice.phase() === 'speaking'"
           [class.reduce-motion]="prefersReducedMotion()"
           data-variant="a"
           role="dialog"
           aria-label="Rumi voice conversation"
           [attr.aria-describedby]="surfaceId() + '-caption'"
           tabindex="-1"
           (keydown)="onKeydown($event)">
        <!-- Live status goes silent while an error alert is present so the failure is announced once. -->
        <p [id]="surfaceId() + '-status'" class="voice__status text-sm font-bold tracking-wide"
           [attr.aria-live]="voice.error() ? 'off' : 'polite'">
          {{ voice.statusLabel() }}
        </p>

        <div class="orb-slot grid place-items-center" aria-hidden="true">
          <div class="orb orb--a relative grid place-items-center">
            <span class="layer l1"></span>
            <span class="layer l2"></span>
            <span class="layer l3"></span>
            <span class="core"></span>
          </div>
        </div>

        <p [id]="surfaceId() + '-caption'" class="voice__caption min-h-11 max-w-[280px] text-center text-sm leading-relaxed text-ink-muted">
          {{ voice.transcript() }}
        </p>

        @if (voice.error(); as error) {
          <div role="alert" class="flex max-w-[320px] flex-col items-center gap-3 rounded-2xl border border-hairline bg-surface px-4 py-3 text-center text-sm text-ink">
            <svg [lucideIcon]="'circle-alert'" [size]="20" aria-hidden="true"></svg>
            <p>{{ error.message }}</p>
            <button type="button"
                    (click)="retrySession()"
                    class="inline-flex min-h-11 items-center justify-center rounded-full border border-brand bg-surface px-4 text-xs font-bold text-brand-dark transition-colors hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:text-brand-light"
                    aria-label="Retry microphone access">
              Retry microphone
            </button>
          </div>
        }

        <div class="voice__actions mt-1 flex gap-3">
          @if (!voice.error()) {
            <button type="button"
                    (click)="voice.toggleMuted()"
                    [attr.aria-pressed]="voice.isMuted()"
                    [attr.aria-label]="voice.isMuted() ? 'Unmute microphone' : 'Mute microphone'"
                    class="inline-flex h-11 min-w-11 items-center gap-2 rounded-full border border-hairline bg-surface px-4 text-xs font-bold text-brand-dark transition-colors hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:text-brand-light">
              <svg [lucideIcon]="'volume-2'" [size]="17" aria-hidden="true"></svg>
              {{ voice.isMuted() ? 'Unmute' : 'Mute' }}
            </button>
          }
          <button #endButton type="button"
                  (click)="endSession()"
                  class="inline-flex h-11 min-w-11 items-center gap-2 rounded-full border border-transparent bg-voice-end px-4 text-xs font-bold text-on-voice-end transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                  aria-label="End voice conversation">
            <svg [lucideIcon]="'x'" [size]="17" aria-hidden="true"></svg>
            End
          </button>
        </div>
      </div>
    }
  `,
  styles: `
    .voice {
      pointer-events: auto;
      min-block-size: 0;
      box-sizing: border-box;
      overflow-y: auto;
      overscroll-behavior: contain;
      justify-content: flex-start;
      justify-content: safe center;
      gap: clamp(.75rem, 2cqh, 1.25rem);
      padding-block-start: max(1.75rem, env(safe-area-inset-top));
      padding-block-end: max(1.5rem, env(safe-area-inset-bottom));
      transition: opacity 280ms ease;
    }

    .orb-slot {
      --orb-size: clamp(8rem, 24dvmin, 12rem);
      --orb-size: clamp(8rem, max(8rem, min(38cqi, 24cqh)), 12rem);
      flex: 0 0 auto;
      inline-size: min(var(--orb-size), 100%);
      block-size: min(var(--orb-size), 100%);
      aspect-ratio: 1;
    }

    .voice > * {
      flex: 0 0 auto;
    }

    .orb--a {
      inline-size: 85%;
      block-size: 85%;
      isolation: isolate;
    }

    .orb--a .core {
      inline-size: 64%;
      block-size: 64%;
    }

    @container chat-conversation (max-height: 36rem) {
      .voice {
        gap: clamp(.75rem, 2cqh, 1.25rem);
        padding-block-start: max(.75rem, env(safe-area-inset-top));
        padding-block-end: max(.75rem, env(safe-area-inset-bottom));
      }
    }

    .orb--a .layer {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      filter: blur(min(14px, calc(var(--orb-size) * 0.0972222)));
      mix-blend-mode: var(--calmi-aurora-composite);
      opacity: .9;
    }

    .orb--a .l1 {
      background: radial-gradient(circle at 32% 30%, var(--color-brand-light), transparent 62%);
    }

    .orb--a .l2 {
      background: radial-gradient(circle at 70% 62%, var(--color-brand-soft), transparent 60%);
    }

    .orb--a .l3 {
      background: radial-gradient(circle at 52% 78%, var(--color-brand), transparent 58%);
    }

    .orb--a .core {
      position: relative;
      border-radius: 50%;
      background: radial-gradient(circle at 38% 32%, var(--color-voice-core) 4%, var(--color-brand-light) 42%, var(--color-brand-deep) 100%);
      box-shadow: var(--shadow-aurora);
    }

    .is-listening .orb--a .core { animation: aBreath 2.6s ease-in-out infinite; }
    .is-listening .orb--a .layer { animation: aDrift 7s linear infinite; }
    .is-thinking .orb--a .core { animation: aBreath 1.1s ease-in-out infinite; }
    .is-thinking .orb--a .layer { animation: aDrift 2.6s linear infinite; }
    .is-speaking .orb--a .core { animation: aTalk .62s ease-in-out infinite; }
    .is-speaking .orb--a .layer { animation: aDrift 3.4s linear infinite reverse; }

    @keyframes aBreath {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.06); }
    }

    @keyframes aTalk {
      0%, 100% { transform: scale(1) translateY(0); }
      50% { transform: scale(1.13) translateY(-3px); }
    }

    @keyframes aDrift {
      to { transform: rotate(360deg); }
    }

    @media (prefers-reduced-motion: reduce) {
      .voice,
      .voice .core,
      .voice .layer {
        animation: none !important;
        transition: none;
      }
    }

    .reduce-motion .core,
    .reduce-motion .layer {
      animation: none !important;
    }

    @media (prefers-reduced-transparency: reduce) {
      .voice { backdrop-filter: none; }
    }
  `,
})
export class VoiceSessionOverlayComponent {
  readonly voice = inject(VoiceSessionService);
  readonly surface = input<ChatConversationSurface>('floating-panel');
  readonly surfaceId = computed(() => this.surface().replace('-', '-').replace('floating-panel', 'floating').replace('rumi-embedded', 'embedded'));
  private readonly injector = inject(Injector);
  private readonly endButton = viewChild<ElementRef<HTMLButtonElement>>('endButton');
  readonly prefersReducedMotion = signal(
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );

  constructor() {
    effect(() => {
      if (!this.voice.isActive() || this.voice.surface() !== this.surface()) return;
      afterNextRender({ write: () => this.endButton()?.nativeElement.focus({ preventScroll: true }) }, { injector: this.injector });
    });
  }

  endSession(): void {
    this.voice.end();
    afterNextRender({ write: () => this.voice.restoreFocus() }, { injector: this.injector });
  }

  retrySession(): void {
    this.voice.retry();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;

    event.preventDefault();
    event.stopPropagation();
    this.endSession();
  }

}
