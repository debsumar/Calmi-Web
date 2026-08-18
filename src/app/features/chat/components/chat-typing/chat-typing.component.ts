import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-chat-typing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex self-start items-center gap-1.5 rounded-2xl rounded-bl-md border border-hairline bg-sunken px-4 py-3" role="status" aria-label="Rumi AI is typing">
      @for (dot of dots; track dot) {
        <span class="h-2 w-2 rounded-full bg-brand-soft" [style.animation-delay.ms]="dot * 180" aria-hidden="true"></span>
      }
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
  readonly dots = [0, 1, 2];
}
