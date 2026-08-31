import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-chat-typing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex self-start items-start gap-3">
      <div class="h-8 w-8 shrink-0" aria-hidden="true"></div>
      <div class="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-hairline bg-sunken px-4 py-3"
           [attr.aria-label]="announce() ? 'Rumi AI is typing' : null"
           [attr.aria-hidden]="announce() ? null : 'true'">
        <span class="sr-only">Rumi is typing</span>
        @for (dot of dots; track dot) {
          <span class="h-2 w-2 rounded-full bg-brand-soft" [style.animation-delay.ms]="dot * 180" aria-hidden="true"></span>
        }
      </div>
    </div>
  `,
  styles: `
    span {
      animation: chatTypingDot 1.4s ease-in-out infinite;
    }

    @keyframes chatTypingDot {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-4px); }
    }

    @media (prefers-reduced-motion: reduce) {
      span { animation: none; }
    }
  `,
})
export class ChatTypingComponent {
  readonly announce = input(true);
  readonly dots = [0, 1, 2];
}
