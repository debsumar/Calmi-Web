import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type VerificationStep = 'details' | 'check' | 'result';

const STEPS = [
  { id: 'details' as const, label: 'Details' },
  { id: 'check' as const, label: 'Check' },
  { id: 'result' as const, label: 'Result' },
];

@Component({
  selector: 'app-verification-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './verification-stepper.component.html',
  styleUrl: './verification-stepper.component.scss',
})
export class VerificationStepperComponent {
  readonly currentStep = input.required<VerificationStep>();
  readonly steps = STEPS;

  isCurrent(step: VerificationStep): boolean {
    return this.currentStep() === step;
  }

  isDone(step: VerificationStep): boolean {
    return STEPS.findIndex((item) => item.id === step)
      < STEPS.findIndex((item) => item.id === this.currentStep());
  }
}
