import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { VerificationStatus } from '../../models/student-verification.model';

export type VerificationStep = 'details' | 'check' | 'result';
type VerificationStepState = 'upcoming' | 'active' | 'complete' | 'error';

const STEPS = [
  { id: 'details' as const, label: 'Details', number: 1 },
  { id: 'check' as const, label: 'Check', number: 2 },
  { id: 'result' as const, label: 'Result', number: 3 },
];

@Component({
  selector: 'app-verification-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './verification-stepper.component.html',
  styleUrl: './verification-stepper.component.scss',
})
export class VerificationStepperComponent {
  readonly currentStep = input.required<VerificationStep>();
  readonly status = input<VerificationStatus>('idle');
  readonly steps = STEPS;

  isCurrent(step: VerificationStep): boolean {
    return this.currentStep() === step;
  }

  isDone(step: VerificationStep): boolean {
    return STEPS.findIndex((item) => item.id === step)
      < STEPS.findIndex((item) => item.id === this.currentStep());
  }

  isError(step: VerificationStep): boolean {
    return step === 'result' && (this.status() === 'failed' || this.status() === 'error');
  }

  stepState(step: VerificationStep): VerificationStepState {
    if (this.isError(step)) return 'error';
    if (this.isCurrent(step)) return 'active';
    return this.isDone(step) ? 'complete' : 'upcoming';
  }
}
