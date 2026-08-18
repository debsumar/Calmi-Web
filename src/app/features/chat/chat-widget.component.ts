import { afterNextRender, ChangeDetectionStrategy, Component, computed, DOCUMENT, effect, inject, Injector } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { ChatBubbleComponent } from './components/chat-bubble/chat-bubble.component';
import { ChatPanelComponent } from './components/chat-panel/chat-panel.component';
import { ChatStoreService } from './services/chat-store.service';
import { OnboardingService } from '../onboarding/services/onboarding.service';
import { PlayerService } from '../../core/services/player.service';

@Component({
  selector: 'app-chat-widget',
  imports: [ChatBubbleComponent, ChatPanelComponent],
  host: { class: 'font-sans' },
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (isVisible()) {
      <app-chat-bubble [liftedForPlayer]="liftedForPlayer()"></app-chat-bubble>

      @if (chatStore.isOpen()) {
        @defer (when chatStore.isOpen()) {
          <app-chat-panel [liftedForPlayer]="liftedForPlayer()"></app-chat-panel>
        } @placeholder {
          <span aria-hidden="true"></span>
        }
      }
    }
  `,
})
export class ChatWidgetComponent {
  readonly chatStore = inject(ChatStoreService);
  private readonly router = inject(Router);
  private readonly onboardingService = inject(OnboardingService);
  private readonly playerService = inject(PlayerService);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  private readonly routeUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  private readonly currentPath = computed(() => this.routeUrl().split(/[?#]/)[0]);
  readonly isAuthRoute = computed(() => {
    const path = this.currentPath();
    return path === '/auth' || path.startsWith('/auth/');
  });
  readonly isVisible = computed(() => !this.onboardingService.isActive() && !this.isAuthRoute());
  readonly liftedForPlayer = computed(() => this.currentPath() === '/sleep' && this.playerService.hasTrack());

  constructor() {
    let wasOpen = false;

    effect(() => {
      const visible = this.isVisible();
      const open = this.chatStore.isOpen();

      if (!visible) {
        this.chatStore.close();
      } else if (wasOpen && !open) {
        afterNextRender({
          write: () => this.document.getElementById('rumi-chat-bubble')?.focus({ preventScroll: true }),
        }, { injector: this.injector });
      }

      wasOpen = open;
    });
  }
}
