import {
  afterNextRender,
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  HostListener,
  inject,
  input,
  Injector,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { ChatStoreService } from '../../services/chat-store.service';
import { ChatMessageListComponent } from '../chat-message-list/chat-message-list.component';
import { ChatComposerComponent } from '../chat-composer/chat-composer.component';
import { ChatSuggestionsComponent } from '../chat-suggestions/chat-suggestions.component';

@Component({
  selector: 'app-chat-panel',
  imports: [LucideDynamicIcon, ChatMessageListComponent, ChatComposerComponent, ChatSuggestionsComponent],
  host: { class: 'font-sans' },
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './chat-panel.component.html',
  styleUrl: './chat-panel.component.scss',
})
export class ChatPanelComponent implements AfterViewInit, OnDestroy, OnInit {
  readonly chatStore = inject(ChatStoreService);
  readonly liftedForPlayer = input(false);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  readonly isMobileViewport = signal(false);
  readonly prefersReducedMotion = signal(false);
  readonly isClosing = signal(false);
  readonly hasUserMessages = computed(() =>
    this.chatStore.messages().some((message) => message.role === 'user')
  );

  private readonly focusableSelector =
    'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  private bodyScrollLocked = false;
  private bodyHadOverflowHidden = false;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.updateViewportState();
  }

  ngAfterViewInit(): void {
    afterNextRender({ write: () => this.focusComposer() }, { injector: this.injector });
  }

  ngOnDestroy(): void {
    if (this.closeTimer !== null) {
      clearTimeout(this.closeTimer);
    }
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
    if (this.isClosing()) return;

    this.isClosing.set(true);
    if (this.prefersReducedMotion()) {
      this.chatStore.close();
      return;
    }

    this.closeTimer = setTimeout(() => {
      this.chatStore.close();
      this.closeTimer = null;
    }, 180);
  }

  minimizePanel(): void {
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
    const panel = this.document.getElementById('rumi-chat-panel');
    const composer = panel?.querySelector<HTMLElement>('app-chat-composer');
    const control = composer?.querySelector<HTMLElement>(this.focusableSelector);

    if (control) {
      control.focus({ preventScroll: true });
      return;
    }

    if (composer) {
      composer.setAttribute('tabindex', '-1');
      composer.focus({ preventScroll: true });
      return;
    }

    panel?.focus({ preventScroll: true });
  }

  private getFocusableElements(): HTMLElement[] {
    const panel = this.document.getElementById('rumi-chat-panel');
    return panel ? Array.from(panel.querySelectorAll<HTMLElement>(this.focusableSelector)) : [];
  }

}
