import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-verification-checking-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './verification-checking-step.component.html',
  styles: [`
    :host { display: block; color: var(--color-ink-soft); }
    .checking { display: grid; gap: 1.1rem; }
    h3 { margin: 0; color: var(--color-ink); font-size: 1rem; font-weight: 700; line-height: 1.25; }
    p { margin: 0; }
    .progress { height: .4rem; overflow: hidden; border-radius: 9999px; background: var(--color-sunken); }
    .progress-bar { display: block; width: 40%; height: 100%; border-radius: inherit; background: var(--color-brand); animation: slide var(--dur-loop) var(--ease-standard) infinite; }
    .status { display: flex; align-items: center; gap: .35rem; color: var(--color-ink-muted); font-size: .75rem; }
    .indicator { display: inline-block; width: .6rem; height: .6rem; border-radius: 50%; background: var(--color-brand); animation: breathe var(--dur-loop) var(--ease-out) infinite; }
    .sr-status { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
    @keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
    @keyframes breathe { 0%, 100% { transform: scale(1); opacity: .72; } 50% { transform: scale(1.08); opacity: 1; } }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation: none !important; transition-duration: var(--dur-instant) !important; }
      .progress-bar { width: 100%; transform: none; }
      .indicator { opacity: 1; transform: none; }
    }
  `],
})
export class VerificationCheckingStepComponent {
  readonly label = input.required<string>();
}
