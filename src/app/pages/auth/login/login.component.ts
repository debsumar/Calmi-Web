import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { AuthSplitCardComponent } from '@/shared/components/auth-split-card/auth-split-card.component';
import { AnimateOnScrollDirective } from '@/shared/directives/animate-on-scroll.directive';
import { SocialAuthButtonsComponent } from '@/shared/components/social-auth-buttons/social-auth-buttons.component';

@Component({
  selector: 'app-login',
  imports: [AuthSplitCardComponent, AnimateOnScrollDirective, SocialAuthButtonsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-split-card
      imageSrc="/assets/meditation.svg"
      imageAlt="Two people seated calmly together in meditation"
      imageSide="right">
      <div class="mx-auto flex w-full max-w-md flex-col">
        <h1 appAnimateOnScroll style="--index:0" class="text-3xl md:text-5xl font-bold leading-tight tracking-tight text-ink">Welcome Back!</h1>
        <p appAnimateOnScroll style="--index:1" class="mt-3 text-base leading-relaxed text-ink-soft">Ready to continue your healing journey?</p>

        @if (errorMessage()) {
          <div appAnimateOnScroll style="--index:2" class="mt-6 rounded-xl border border-danger bg-surface px-4 py-3 text-sm text-danger" role="alert" aria-live="assertive">{{ errorMessage() }}</div>
        }

        <app-social-auth-buttons appAnimateOnScroll style="--index:3" class="mt-8" [showDivider]="false" (failed)="errorMessage.set($event)"></app-social-auth-buttons>
      </div>
    </app-auth-split-card>
  `,
})
export class LoginComponent {
  readonly errorMessage = signal('');
}
