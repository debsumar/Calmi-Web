import {
  afterNextRender,
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  effect,
  HostListener,
  inject,
  input,
  Injector,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { ChatStoreService } from '../../services/chat-store.service';
import { ChatConversationComponent } from '../chat-conversation/chat-conversation.component';
import { VoiceSessionService } from '../../services/voice-session.service';

/** Must stay in sync with the chatPanelExit duration in chat-panel.component.scss. */
const EXIT_ANIMATION_MS = 180;

@Component({
  selector: 'app-chat-panel',
  imports: [LucideDynamicIcon, ChatConversationComponent],
  host: { class: 'font-sans' },
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './chat-panel.component.html',
  styleUrl: './chat-panel.component.scss',
})
export class ChatPanelComponent implements AfterViewInit, OnDestroy, OnInit {
  readonly chatStore = inject(ChatStoreService);
  readonly voice = inject(VoiceSessionService);
  readonly liftedForPlayer = input(false);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  readonly isMobileViewport = signal(false);
  readonly prefersReducedMotion = signal(false);
  private readonly conversation = viewChild(ChatConversationComponent);

  private readonly focusableSelector =
    'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  private bodyScrollLocked = false;
  private bodyHadOverflowHidden = false;

  constructor() {
    // With animations suppressed there is nothing to wait for, so collapse the
    // exit delay rather than leaving a static panel on screen for 180ms.
    effect(() => {
      if (this.chatStore.isClosing() && this.prefersReducedMotion()) {
        this.chatStore.close();
      }
    });
  }

  ngOnInit(): void {
    this.updateViewportState();
  }

  ngAfterViewInit(): void {
    afterNextRender({ write: () => this.focusComposer() }, { injector: this.injector });
  }

  ngOnDestroy(): void {
    this.voice.endForSurface('floating-panel');
    this.unlockBodyScroll();
    this.setAppShellInert(false);
  }

  @HostListener('window:resize')
  onViewportResize(): void {
    this.updateViewportState();
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closePanel();
      return;
    }

    if (event.key !== 'Tab' || !this.isMobileViewport()) return;

    const focusable = this.getFocusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = this.document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  closePanel(): void {
    if (this.voice.isActive() || this.chatStore.isClosing()) return;

    if (this.prefersReducedMotion()) {
      this.chatStore.close();
      return;
    }

    this.chatStore.requestClose(EXIT_ANIMATION_MS);
  }

  minimizePanel(): void {
    if (this.voice.isActive()) return;
    this.chatStore.minimize();
  }

  private updateViewportState(): void {
    const view = this.document.defaultView;
    const matches = (query: string): boolean => typeof view?.matchMedia === 'function' && view.matchMedia(query).matches;
    const isMobile = matches('(max-width: 767px)');
    const reducedMotion = matches('(prefers-reduced-motion: reduce)');
    this.isMobileViewport.set(isMobile);
    this.prefersReducedMotion.set(reducedMotion);

    afterNextRender({
      write: () => {
        if (this.isMobileViewport()) {
          this.lockBodyScroll();
          this.setAppShellInert(true);
        } else {
          this.unlockBodyScroll();
          this.setAppShellInert(false);
        }
      },
    }, { injector: this.injector });
  }

  private lockBodyScroll(): void {
    const body = this.document.body;
    if (this.bodyScrollLocked || !body) return;

    this.bodyHadOverflowHidden = body.classList.contains('overflow-hidden');
    body.classList.add('overflow-hidden');
    this.bodyScrollLocked = true;
  }

  private unlockBodyScroll(): void {
    const body = this.document.body;
    if (!this.bodyScrollLocked || !body) return;

    if (!this.bodyHadOverflowHidden) {
      body.classList.remove('overflow-hidden');
    }
    this.bodyScrollLocked = false;
  }

  private setAppShellInert(inert: boolean): void {
    const shell = this.document.getElementById('calmi-app-shell');
    if (!shell) return;

    if (inert) {
      shell.setAttribute('inert', '');
    } else {
      shell.removeAttribute('inert');
    }
  }

  private focusComposer(): void {
    if (this.voice.isActive()) return;

    this.conversation()?.focusComposer();
  }

  private getFocusableElements(): HTMLElement[] {
    const panel = this.document.getElementById('rumi-chat-panel');
    return panel ? Array.from(panel.querySelectorAll<HTMLElement>(this.focusableSelector)) : [];
  }

}
